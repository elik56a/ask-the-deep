"""The tools the agent may call, and the per-request state they share.

Each tool returns text for the model plus `ToolMeta` for the app. The model
never sees `ToolMeta`; the pipeline turns it into events for the browser.
"""

import asyncio
from dataclasses import dataclass, field

from pydantic_ai import RunContext, Tool, ToolReturn

from app.agent.github import GitHubActivity, Repo
from app.config import Settings
from app.rag.corpus import Chunk
from app.rag.retrieval import Hit, Retriever

_NOTHING_FOUND = "No relevant passages found."


@dataclass
class AgentDeps:
    """What the tools need for one request. `seen` collects every passage a tool
    returned, so the answer may only cite passages the agent actually read.
    `question` is the visitor's own words, searched once with the first query.
    """

    retriever: Retriever
    github: GitHubActivity
    settings: Settings
    question: str | None = None
    seen: dict[str, Chunk] = field(default_factory=dict)
    successful_tools: int = 0
    best_score: float = 0.0


@dataclass(frozen=True)
class ToolMeta:
    """Structured result of a tool call, for events (not sent to the model)."""

    ok: bool
    count: int
    query: str | None = None
    hits: list[Hit] = field(default_factory=list)
    passage_ids: list[str] = field(default_factory=list)


def _link(chunk: Chunk) -> str:
    url = chunk.metadata.get("url")
    return f"\nLink: {url}" if url else ""


def format_passages(chunks: list[Chunk]) -> str:
    """Wrap passages in tags, so the model treats them as data, not instructions.

    A project's link lives in its front matter, not its text; without it here,
    a "send me the link" question sends the model searching until it gives up.
    """
    body = "\n\n".join(
        f'<passage id="{c.chunk_id}">\n{c.breadcrumb}\n{c.text}{_link(c)}\n</passage>'
        for c in chunks
    )
    return f"<passages>\n{body}\n</passages>"


def _read(deps: AgentDeps, chunks: list[Chunk]) -> None:
    deps.seen.update((c.chunk_id, c) for c in chunks)
    if chunks:
        deps.successful_tools += 1


def _projects(deps: AgentDeps) -> dict[str, list[Chunk]]:
    by_title: dict[str, list[Chunk]] = {}
    for chunk in deps.retriever.passages():
        if chunk.metadata.get("type") == "project":
            title = str(chunk.metadata.get("title", chunk.source))
            by_title.setdefault(title, []).append(chunk)
    return by_title


def _take_question(deps: AgentDeps) -> list[str]:
    question, deps.question = deps.question, None
    return [question] if question else []


def _merge(results: list[list[Hit]]) -> list[Hit]:
    """One list of hits, each passage once with its best similarity."""
    best: dict[str, Hit] = {}
    for hits in results:
        for hit in hits:
            known = best.get(hit.chunk.chunk_id)
            if known is None or hit.similarity > known.similarity:
                best[hit.chunk.chunk_id] = hit
    return list(best.values())


async def search(deps: AgentDeps, query: str) -> ToolReturn:
    """Search the knowledge base for `query`, keeping the passages that clear the gate.

    The agent runs it once on the visitor's question before the first model
    call, and the model runs it through `search_knowledge`.
    """
    settings = deps.settings
    # The model sometimes rewrites a name ("גיברס" → "Gibs"); searching the
    # visitor's own words too means a bad rewrite can't hide the right passages.
    queries = list(dict.fromkeys([query, *_take_question(deps)]))
    hits = _merge(
        await asyncio.gather(
            *(deps.retriever.search(q, settings.retrieval_top_k) for q in queries)
        )
    )
    accepted = [h.chunk for h in hits if h.similarity >= settings.retrieval_threshold]
    _read(deps, accepted)
    deps.best_score = max([deps.best_score, *(h.similarity for h in hits)])
    return ToolReturn(
        return_value=format_passages(accepted) if accepted else _NOTHING_FOUND,
        metadata=ToolMeta(
            ok=True,
            count=len(accepted),
            query=query,
            hits=hits,
            passage_ids=[c.chunk_id for c in accepted],
        ),
    )


async def search_knowledge(ctx: RunContext[AgentDeps], query: str) -> ToolReturn:
    """Search Eliyahu's knowledge base (experience, projects, skills, profile, FAQ).

    Use a short, specific query. Search again with a different query for each
    part of a multi-part question. Returns passages with ids you can cite.
    """
    return await search(ctx.deps, query)


async def list_projects(ctx: RunContext[AgentDeps]) -> ToolReturn:
    """List the projects Eliyahu built, with role, technologies and link."""
    lines = []
    for title, chunks in _projects(ctx.deps).items():
        meta = chunks[0].metadata
        details = ", ".join(
            f"{key}: {meta[key]}"
            for key in ("role", "technologies", "url")
            if key in meta
        )
        lines.append(f"- {title} ({details})" if details else f"- {title}")
    if lines:
        ctx.deps.successful_tools += 1
    return ToolReturn(
        return_value="\n".join(lines) or "No projects found.",
        metadata=ToolMeta(ok=True, count=len(lines)),
    )


async def get_project(ctx: RunContext[AgentDeps], name: str) -> ToolReturn:
    """Read everything about one project. `name` is a title from list_projects."""
    projects = _projects(ctx.deps)
    title = next((t for t in projects if name.lower() in t.lower()), None)
    chunks = projects.get(title, []) if title else []
    _read(ctx.deps, chunks)
    return ToolReturn(
        return_value=format_passages(chunks) if chunks else f"No project named {name}.",
        metadata=ToolMeta(
            ok=bool(chunks),
            count=len(chunks),
            query=name,
            passage_ids=[c.chunk_id for c in chunks],
        ),
    )


def format_repos(repos: list[Repo]) -> str:
    """The repos as the model reads them, one line each. GitHub text is written
    by anyone, so it is tagged as data like the passages."""
    lines = [
        f"- [{r.name}]({r.html_url}) ({r.language or 'n/a'}), "
        f"last push {r.pushed_at[:10]}: {r.description or 'no description'}"
        for r in repos
    ]
    return f"<github>\n{chr(10).join(lines)}\n</github>"


async def github_activity(
    ctx: RunContext[AgentDeps], count: int | None = None
) -> ToolReturn:
    """Eliyahu's most recently updated public GitHub repositories (live data).

    Args:
        count: How many repositories the visitor asked for; leave it out otherwise.
    """
    settings = ctx.deps.settings
    asked = settings.github_repo_count if count is None else count
    wanted = min(max(asked, 1), settings.github_max_repos)
    repos = await ctx.deps.github.recent_repos(wanted)
    if repos is None:
        return ToolReturn(
            return_value="GitHub is unavailable right now.",
            metadata=ToolMeta(ok=False, count=0),
        )
    ctx.deps.successful_tools += 1
    return ToolReturn(
        return_value=format_repos(repos),
        metadata=ToolMeta(ok=True, count=len(repos)),
    )


async def contact_info(ctx: RunContext[AgentDeps]) -> ToolReturn:
    """Public ways to contact Eliyahu. Offer them when you can't answer."""
    links = ctx.deps.settings.contact_links
    ctx.deps.successful_tools += 1
    return ToolReturn(
        return_value="\n".join(f"- {name}: {url}" for name, url in links.items()),
        metadata=ToolMeta(ok=True, count=len(links)),
    )


TOOLS: list[Tool[AgentDeps]] = [
    Tool(f)
    for f in (
        search_knowledge,
        list_projects,
        get_project,
        github_activity,
        contact_info,
    )
]
