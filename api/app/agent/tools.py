"""The tools the agent may call, and the per-request state they share.

Each tool returns text for the model plus `ToolMeta` for the app. The model
never sees `ToolMeta`; the pipeline turns it into events for the browser.
"""

from dataclasses import dataclass, field

from pydantic_ai import RunContext, Tool, ToolReturn

from app.agent.github import GitHubActivity
from app.config import Settings
from app.rag.corpus import Chunk
from app.rag.retrieval import Hit, Retriever

_NOTHING_FOUND = "No relevant passages found."


@dataclass
class AgentDeps:
    """What the tools need for one request. `seen` collects every passage a tool
    returned, so the answer may only cite passages the agent actually read.
    """

    retriever: Retriever
    github: GitHubActivity
    settings: Settings
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


def format_passages(chunks: list[Chunk]) -> str:
    """Wrap passages in tags, so the model treats them as data, not instructions."""
    body = "\n\n".join(
        f'<passage id="{c.chunk_id}">\n{c.breadcrumb}\n{c.text}\n</passage>'
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


async def search_knowledge(ctx: RunContext[AgentDeps], query: str) -> ToolReturn:
    """Search Eliyahu's knowledge base (experience, projects, skills, profile, FAQ).

    Use a short, specific query. Search again with a different query for each
    part of a multi-part question. Returns passages with ids you can cite.
    """
    settings = ctx.deps.settings
    hits = await ctx.deps.retriever.search(query, settings.retrieval_top_k)
    accepted = [h.chunk for h in hits if h.similarity >= settings.retrieval_threshold]
    _read(ctx.deps, accepted)
    ctx.deps.best_score = max([ctx.deps.best_score, *(h.similarity for h in hits)])
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


async def github_activity(ctx: RunContext[AgentDeps]) -> ToolReturn:
    """Eliyahu's most recently updated public GitHub repositories (live data)."""
    repos = await ctx.deps.github.recent_repos()
    if repos is None:
        return ToolReturn(
            return_value="GitHub is unavailable right now.",
            metadata=ToolMeta(ok=False, count=0),
        )
    ctx.deps.successful_tools += 1
    lines = [
        f"- {r.name} ({r.language or 'n/a'}), last push {r.pushed_at[:10]}: "
        f"{r.description or 'no description'} {r.html_url}"
        for r in repos
    ]
    return ToolReturn(
        # GitHub text is written by anyone; tagged as data like the passages.
        return_value=f"<github>\n{chr(10).join(lines)}\n</github>",
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
