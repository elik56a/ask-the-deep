import httpx
from pydantic_ai import RunContext, ToolReturn
from pydantic_ai.models.test import TestModel
from pydantic_ai.usage import RunUsage

from app.agent.tools import (
    AgentDeps,
    ToolMeta,
    contact_info,
    get_project,
    github_activity,
    list_projects,
    search_knowledge,
)
from app.config import Settings
from app.rag.retrieval import Hit
from tests.fakes import StubRetriever, fake_github, make_chunk, make_deps

THRESHOLD = Settings().retrieval_threshold
PROJECT: dict[str, object] = {
    "type": "project",
    "title": "DevConverter",
    "url": "https://devconverter.dev",
}
RETRIEVER = StubRetriever(
    [
        Hit(make_chunk("good", "Eliyahu works at Phytech"), THRESHOLD + 0.2, 0.03),
        Hit(make_chunk("weak", "barely related"), THRESHOLD - 0.1, 0.02),
        Hit(make_chunk("devconverter", "Developer tools", PROJECT), 0.0, 0.01),
    ]
)


def _ctx(deps: AgentDeps) -> RunContext[AgentDeps]:
    return RunContext(deps=deps, model=TestModel(), usage=RunUsage())


def _meta(result: ToolReturn) -> ToolMeta:
    assert isinstance(result.metadata, ToolMeta)
    return result.metadata


async def test_search_returns_only_passages_above_threshold() -> None:
    deps = make_deps(RETRIEVER)
    result = await search_knowledge(_ctx(deps), "where does he work")
    assert 'id="good"' in str(result.return_value)
    assert "weak" not in str(result.return_value)
    assert list(deps.seen) == ["good"]
    assert _meta(result).count == 1
    assert _meta(result).passage_ids == ["good"]
    assert len(_meta(result).hits) == 3
    assert deps.best_score == THRESHOLD + 0.2


async def test_search_with_no_good_passage_is_not_evidence() -> None:
    deps = make_deps(StubRetriever(RETRIEVER.hits[1:2]))
    result = await search_knowledge(_ctx(deps), "pizza")
    assert result.return_value == "No relevant passages found."
    assert deps.successful_tools == 0


async def test_lists_projects_from_metadata() -> None:
    result = await list_projects(_ctx(make_deps(RETRIEVER)))
    assert "DevConverter" in str(result.return_value)
    assert "https://devconverter.dev" in str(result.return_value)
    assert _meta(result).count == 1


async def test_get_project_makes_its_passages_citable() -> None:
    deps = make_deps(RETRIEVER)
    result = await get_project(_ctx(deps), "devconverter")
    assert 'id="devconverter"' in str(result.return_value)
    assert "devconverter" in deps.seen
    assert _meta(result).passage_ids == ["devconverter"]


async def test_get_unknown_project_fails_softly() -> None:
    result = await get_project(_ctx(make_deps(RETRIEVER)), "nope")
    assert _meta(result).ok is False


async def test_github_activity_tags_repos_as_data() -> None:
    result = await github_activity(_ctx(make_deps(RETRIEVER)))
    assert str(result.return_value).startswith("<github>")
    assert "portfolio-chat" in str(result.return_value)


async def test_github_outage_is_reported_not_raised() -> None:
    deps = make_deps(RETRIEVER)
    deps.github = fake_github(lambda _: httpx.Response(503))
    result = await github_activity(_ctx(deps))
    assert _meta(result).ok is False
    assert deps.successful_tools == 0


async def test_contact_info_lists_links() -> None:
    result = await contact_info(_ctx(make_deps(RETRIEVER)))
    assert "github.com/elik56a" in str(result.return_value)
