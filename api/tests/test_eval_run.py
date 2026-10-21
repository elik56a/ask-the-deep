from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.models.test import TestModel

from app.agent.chat_agent import agent
from app.agent.judge import judge, judge_agent, judge_prompt
from app.config import Settings
from app.evals.golden import GoldenCase, load_golden
from app.evals.run import (
    QUICK,
    Run,
    cites_expected,
    cites_retrieved,
    evaluate,
    failed,
    kind_ok,
    run_case,
    with_retries,
)
from app.rag.retrieval import Hit
from tests.fakes import StubRetriever, Turn, make_chunk, make_services, scripted

SETTINGS = Settings(eval_retry_wait_s=0, eval_retries=2)
RETRIEVER = StubRetriever(
    [Hit(make_chunk("work", "Eliyahu works at Phytech"), 0.9, 0.03)]
)
SEARCH: Turn = ("search_knowledge", {"query": "work"})
ANSWER: Turn = (
    "answer",
    {"kind": "answered", "citations": ["work"], "text": "He works at Phytech."},
)
CASE = GoldenCase(
    id="en-work",
    question="Where does he work?",
    language="en",
    type="answerable",
    kinds=["answered"],
    facts=["He works at Phytech"],
    chunks=["work"],
    tools=["search_knowledge"],
)
HI = GoldenCase(
    id="en-hi", question="Hi!", language="en", type="smalltalk", kinds=["smalltalk"]
)


async def _run(case: GoldenCase, *turns: Turn) -> Run:
    with agent.override(model=scripted(*turns)):
        return await run_case(case, make_services(RETRIEVER), SETTINGS)


async def test_records_what_the_agent_did() -> None:
    run = await _run(CASE, SEARCH, ANSWER)
    assert run.kind == "answered"
    assert run.text == "He works at Phytech."
    assert run.citations == ["work"]
    assert run.retrieved == ["work"]
    assert run.tools == ["search_knowledge"]
    assert run.model_calls == 2


async def test_tells_small_talk_and_no_information_apart() -> None:
    hello: Turn = ("answer", {"kind": "smalltalk", "citations": [], "text": "Hi"})
    unknown: Turn = ("answer", {"kind": "no_information", "citations": [], "text": "-"})
    assert (await _run(HI, hello)).kind == "smalltalk"
    assert (await _run(CASE, SEARCH, unknown)).kind == "no_information"


def test_code_checks() -> None:
    good = Run(kind="answered", citations=["work"], retrieved=["work", "skills"])
    forged = Run(kind="answered", citations=["faq"], retrieved=["work"])
    assert kind_ok(CASE, good)
    assert not kind_ok(HI, good)
    assert cites_expected(CASE, good) is True
    assert cites_expected(CASE, forged) is False
    assert cites_expected(HI, Run(kind="smalltalk")) is None
    assert cites_retrieved(good)
    assert not cites_retrieved(forged)


async def test_errored_cases_are_retried() -> None:
    results = [Run(kind="error"), Run(kind="answered")]
    calls: list[str] = []

    async def flaky(case: GoldenCase) -> Run:
        calls.append(case.id)
        return results.pop(0)

    assert (await with_retries(flaky, SETTINGS)(CASE)).kind == "answered"
    assert calls == ["en-work", "en-work"]


def test_judge_prompt_numbers_the_claims_and_tags_the_data() -> None:
    prompt = judge_prompt(
        "Where?", "At Phytech.", ["Works at Phytech"], [], {"work": "Phytech text"}
    )
    assert "1. Works at Phytech" in prompt
    assert '<passage id="work">\nPhytech text\n</passage>' in prompt
    assert "FORBIDDEN claims:\n(none)" in prompt


async def test_a_report_grades_each_case_in_code_and_by_the_judge() -> None:
    verdict = {"facts": [True], "forbidden": [], "grounded": True, "reason": "ok"}
    hello: Turn = ("answer", {"kind": "smalltalk", "citations": [], "text": "Hi"})
    services = make_services(RETRIEVER)
    with (
        agent.override(model=scripted(SEARCH, ANSWER)),
        judge_agent.override(model=TestModel(custom_output_args=verdict)),
    ):
        report = await evaluate([CASE], services, SETTINGS)
    missed = verdict | {"facts": [False], "reason": "no employer named"}
    with (
        agent.override(model=scripted(hello)),
        judge_agent.override(model=TestModel(custom_output_args=missed)),
    ):
        wrong = await evaluate([CASE], services, SETTINGS)

    [case] = report.cases
    assert set(case.assertions) == {
        "kind",
        "cites_retrieved",
        "cites_expected",
        "grounded",
        "facts",
    }
    assert failed(case) == {}
    assert failed(wrong.cases[0]) == {
        "kind": "got smalltalk",
        "facts": "no employer named",
    }


def test_a_contact_answer_needs_no_passage_citation() -> None:
    contact = Run(kind="answered", tools=["contact_info"])
    assert cites_expected(CASE, contact) is None


async def test_the_judge_waits_out_a_rate_limit() -> None:
    calls = 0

    def busy_once(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise ModelHTTPError(status_code=429, model_name="judge")
        args = {"facts": [], "forbidden": [], "grounded": True, "reason": "ok"}
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, args)])

    with judge_agent.override(model=FunctionModel(busy_once)):
        verdict = await judge("grade this", SETTINGS)
    assert verdict.grounded
    assert calls == 2


def test_the_quick_set_is_real_golden_cases() -> None:
    ids = {c.id for c in load_golden()}
    assert set(QUICK) <= ids
