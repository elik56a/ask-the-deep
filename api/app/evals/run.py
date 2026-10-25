"""Runs the golden set through the real agent and grades every answer (P4.2).

Run: `uv run --env-file .env python -m app.evals.run [--quick] [--type T] [--only ids]`.
`--quick` runs the 8 `QUICK` cases (one or two per type, about 4 minutes).
Exits 1 when fewer than EVAL_MIN_PASS_RATE of the graded cases pass, or on
any blocker: a trap answered with a guess, or a citation no tool returned.
Each case goes through the full pipeline in-process (no rate limit, budget or
stats, so the site's counters stay clean), then gets graded:
- in code: the answer kind is one the case accepts, the answer cites one of
  the expected passages, and it cites only passages a tool returned; an
  answer used one of the case's tools and no tool the case doesn't need (P4.9);
- by the judge model (`app/agent/judge.py`): required facts present, forbidden
  claims absent, statements about Eliyahu grounded in the passages.
This makes real model calls: about 3 per case plus one judge call.
"""

import argparse
import asyncio
import logging
import os
import sys
from collections import Counter
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import structlog
from pydantic import BaseModel
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext
from pydantic_evals.reporting import EvaluationReport, ReportCase

from app.agent.github import GitHubActivity, github_client
from app.agent.judge import judge, judge_prompt
from app.agent.tools import format_repos
from app.config import Settings, get_settings
from app.control.budget import NoBudget
from app.control.rate_limit import NoRateLimit
from app.control.stats import NoStats
from app.evals.golden import GoldenCase, load_golden
from app.events import (
    CitationsAttached,
    DecisionMade,
    LlmCompleted,
    RequestFinished,
    TextDelta,
    ToolCalled,
    ToolCompleted,
    UsageReported,
)
from app.pipeline import SMALL_TALK, Services, run_pipeline
from app.rag.db import create_pool
from app.rag.embeddings import query_embedder
from app.rag.retrieval import HybridRetriever

_EVAL_VISITOR = "eval"
QUICK = (
    "en-current-role",
    "en-givers",
    "he-phytech",
    "en-trap-google",
    "he-trap-team-size",
    "en-off-capital",
    "en-inj-fake-fact",
    "en-hi",
)

# The tool the pipeline runs on every question before the model (ADR 0020).
_FIRST_SEARCH = "search_knowledge"


class Run(BaseModel):
    """What the agent did for one case: the graded output of the eval task."""

    kind: str
    text: str = ""
    citations: list[str] = []
    retrieved: list[str] = []
    tools: list[str] = []
    model_calls: int = 0
    cost_usd: float = 0.0
    latency_ms: int = 0


async def run_case(case: GoldenCase, services: Services, settings: Settings) -> Run:
    """Ask one golden question through the pipeline and record what happened."""
    run = Run(kind="error")
    async for stamped in run_pipeline(
        case.question,
        settings,
        services,
        _EVAL_VISITOR,
        _EVAL_VISITOR,
        case.history,
    ):
        match stamped.event:
            case TextDelta(text=text):
                run.text += text
            case ToolCalled(tool=tool):
                run.tools.append(tool)
            case ToolCompleted(passage_ids=ids):
                run.retrieved += [i for i in ids if i not in run.retrieved]
            case LlmCompleted():
                run.model_calls += 1
            case DecisionMade(reason=reason):
                run.kind = "smalltalk" if reason == SMALL_TALK else "answered"
            case CitationsAttached(citations=citations):
                run.citations = [c.chunk_id for c in citations]
            case UsageReported(cost_usd=cost, latency_ms=latency):
                run.cost_usd, run.latency_ms = cost, latency
            case RequestFinished(outcome=outcome):
                if outcome != "answered":
                    run.kind = outcome
    return run


def kind_ok(case: GoldenCase, run: Run) -> bool:
    """The answer kind is one the case accepts."""
    return run.kind in case.kinds


def cites_expected(case: GoldenCase, run: Run) -> bool | None:
    """An answer that relies on passages cites one of the expected ones."""
    if run.kind != "answered" or not case.chunks:
        return None
    if not run.citations and "contact_info" in run.tools:
        return None
    return bool(set(run.citations) & set(case.chunks))


def cites_retrieved(run: Run) -> bool:
    """Every citation is a passage a tool returned in this run."""
    return set(run.citations) <= set(run.retrieved)


def used_expected_tool(case: GoldenCase, run: Run) -> bool | None:
    """An answer comes from one of the case's tools, not from memory."""
    if run.kind != "answered" or not case.tools:
        return None
    return bool(set(run.tools) & set(case.tools))


def extra_tools(case: GoldenCase, run: Run) -> list[str]:
    """Tools the model chose that the case doesn't need; contact_info is fine
    before "no information". The pipeline searches every question before the
    model starts (ADR 0020), so that first search is not the model's choice."""
    chosen = run.tools[1:] if run.tools[:1] == [_FIRST_SEARCH] else run.tools
    allowed = set(case.tools)
    if run.kind == "no_information":
        allowed.add("contact_info")
    return sorted(set(chosen) - allowed)


@dataclass
class CodeChecks(Evaluator[GoldenCase, Run, None]):
    """The checks that need no model."""

    def evaluate(
        self, ctx: EvaluatorContext[GoldenCase, Run, None]
    ) -> dict[str, bool | EvaluationReason]:
        case, run = ctx.inputs, ctx.output
        results: dict[str, bool | EvaluationReason] = {
            "kind": EvaluationReason(kind_ok(case, run), reason=f"got {run.kind}"),
            "cites_retrieved": cites_retrieved(run),
        }
        if (expected := cites_expected(case, run)) is not None:
            results["cites_expected"] = expected
        if (tool := used_expected_tool(case, run)) is not None:
            results["expected_tool"] = EvaluationReason(
                tool, reason=f"used {run.tools}"
            )
        extra = extra_tools(case, run)
        results["no_extra_tool"] = EvaluationReason(not extra, reason=f"also {extra}")
        return results


@dataclass
class Judged(Evaluator[GoldenCase, Run, None]):
    """The judge model's grades: facts, forbidden claims, groundedness."""

    settings: Settings
    passages: dict[str, str]
    github: GitHubActivity

    async def evaluate(
        self, ctx: EvaluatorContext[GoldenCase, Run, None]
    ) -> dict[str, bool | EvaluationReason]:
        case, run = ctx.inputs, ctx.output
        if run.kind == "error":
            return {}
        sources = {i: self.passages[i] for i in run.retrieved if i in self.passages}
        if "github_activity" in run.tools:
            # The same cached repos the agent read, so the judge sees what it saw.
            repos = await self.github.recent_repos(self.settings.github_max_repos)
            if repos:
                sources["github_activity"] = format_repos(repos)
        if "contact_info" in run.tools:
            sources["contact_info"] = "\n".join(
                f"{name}: {url}" for name, url in self.settings.contact_links.items()
            )
        verdict = await judge(
            judge_prompt(case.question, run.text, case.facts, case.must_not, sources),
            self.settings,
        )
        why = verdict.reason
        results: dict[str, bool | EvaluationReason] = {
            "grounded": EvaluationReason(verdict.grounded, reason=why)
        }
        if case.facts:
            stated = len(verdict.facts) == len(case.facts) and all(verdict.facts)
            results["facts"] = EvaluationReason(stated, reason=why)
        if case.must_not:
            results["must_not"] = EvaluationReason(
                not any(verdict.forbidden), reason=why
            )
        return results


def with_retries(
    task: Callable[[GoldenCase], Awaitable[Run]], settings: Settings
) -> Callable[[GoldenCase], Awaitable[Run]]:
    """Retry a case that errored (usually a provider rate limit), print progress,
    then pause."""

    async def run(case: GoldenCase) -> Run:
        result = await task(case)
        for _ in range(settings.eval_retries):
            if result.kind != "error":
                break
            await asyncio.sleep(settings.eval_retry_wait_s)
            result = await task(case)
        print(f"  {case.id}: {result.kind}", flush=True)
        await asyncio.sleep(settings.eval_pause_s)
        return result

    return run


async def evaluate(
    cases: list[GoldenCase], services: Services, settings: Settings
) -> EvaluationReport[GoldenCase, Run, None]:
    """Run and grade the cases one at a time (free-tier rate limits)."""
    passages = {
        c.chunk_id: f"{c.breadcrumb}\n{c.text}" for c in services.retriever.passages()
    }
    dataset = Dataset[GoldenCase, Run, None](
        name="golden",
        cases=[Case(name=c.id, inputs=c) for c in cases],
        evaluators=[CodeChecks(), Judged(settings, passages, services.github)],
    )

    async def task(case: GoldenCase) -> Run:
        return await run_case(case, services, settings)

    return await dataset.evaluate(
        with_retries(task, settings), name="golden", max_concurrency=1
    )


def failed(report_case: ReportCase[GoldenCase, Run, None]) -> dict[str, str]:
    """The checks this case failed (or couldn't run), each with its reason."""
    problems = {
        name: result.reason or ""
        for name, result in report_case.assertions.items()
        if not result.value
    }
    for failure in report_case.evaluator_failures:
        problems[failure.name] = failure.error_message
    return problems


def score(report: EvaluationReport[GoldenCase, Run, None]) -> tuple[int, int]:
    """Passed and graded cases. A case that never got an answer (provider
    quota, crash) isn't graded: it says nothing about answer quality."""
    graded = [rc for rc in report.cases if rc.output.kind != "error"]
    return sum(not failed(rc) for rc in graded), len(graded)


def blockers(report: EvaluationReport[GoldenCase, Run, None]) -> list[str]:
    """Failures that fail the run whatever the pass rate (P4.5): a trap
    answered with a guess, or a citation no tool returned."""
    found = []
    for rc in report.cases:
        problems = failed(rc)
        if rc.inputs.type == "trap" and {"kind", "must_not"} & problems.keys():
            found.append(f"{rc.name}: a trap answered with a guess")
        if "cites_retrieved" in problems:
            found.append(f"{rc.name}: cites a passage no tool returned")
    return found


def _print(report: EvaluationReport[GoldenCase, Run, None], settings: Settings) -> None:
    by_type: Counter[str] = Counter()
    passed: Counter[str] = Counter()
    cost = 0.0
    for rc in report.cases:
        case, run = rc.inputs, rc.output
        problems = failed(rc)
        by_type[case.type] += 1
        passed[case.type] += not problems
        cost += run.cost_usd
        mark = "✗" if problems else "✓"
        print(f"{mark} {case.id:<28} {run.kind:<15} {run.model_calls} calls")
        for name, reason in problems.items():
            print(f"    {name}: {reason}")
    for crashed in report.failures:
        by_type[crashed.inputs.type] += 1
        print(f"! {crashed.name}: {crashed.error_message}")
    print(f"\n{settings.llm_model} · rules {settings.rules_version}")
    for kind in sorted(by_type):
        print(f"  {kind:<11} {passed[kind]}/{by_type[kind]}")
    print(f"  {'all':<11} {sum(passed.values())}/{sum(by_type.values())}")
    print(f"  answer cost ${cost:.4f} (judge calls not included)")
    calls = [rc.output.model_calls for rc in report.cases if rc.output.kind != "error"]
    capped = sum(c >= settings.agent_max_requests for c in calls)
    if calls:
        print(
            f"  model calls {sum(calls) / len(calls):.1f} per case, {capped} at the cap"
        )


def _pick(cases: list[GoldenCase], args: argparse.Namespace) -> list[GoldenCase]:
    if args.only or args.quick:
        wanted = set(args.only.split(",")) if args.only else set(QUICK)
        cases = [c for c in cases if c.id in wanted]
    if args.type:
        cases = [c for c in cases if c.type == args.type]
    return cases


async def main(args: argparse.Namespace) -> int:
    settings = get_settings()
    if settings.google_eval_api_key:
        os.environ["GOOGLE_API_KEY"] = settings.google_eval_api_key.get_secret_value()
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(logging.ERROR)
    )
    cases = _pick(load_golden(), args)
    async with (
        create_pool(settings) as pool,
        github_client(settings.github_timeout_s, settings.github_token) as http,
    ):
        services = Services(
            retriever=await HybridRetriever.load(pool, query_embedder(settings)),
            github=GitHubActivity(
                http,
                settings.github_username,
                settings.github_cache_seconds,
                settings.github_max_repos,
            ),
            limiter=NoRateLimit(),
            budget=NoBudget(),
            stats=NoStats(),
        )
        report = await evaluate(cases, services, settings)
    _print(report, settings)
    passed, graded = score(report)
    rate = passed / graded if graded else 0.0
    minimum = settings.eval_min_pass_rate
    print(f"  pass rate {rate:.0%} of {graded} graded (minimum {minimum:.0%})")
    for blocker in (found := blockers(report)):
        print(f"  BLOCKER {blocker}")
    return 0 if rate >= minimum and not found else 1


if __name__ == "__main__":
    os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--quick", action="store_true", help="the 8 QUICK cases")
    parser.add_argument("--only", help="comma-separated case ids")
    parser.add_argument("--type", help="only cases of this type, e.g. trap")
    sys.exit(asyncio.run(main(parser.parse_args())))
