from app.rag.recall import Question, load_questions, measure, recall_at_k
from app.rag.retrieval import Hit
from tests.fakes import StubRetriever, make_chunk

HITS = [
    Hit(make_chunk("work", "Phytech"), similarity=0.8, rrf=0.03),
    Hit(make_chunk("skills", "Python"), similarity=0.5, rrf=0.02),
    Hit(make_chunk("faq", "FAQ"), similarity=0.2, rrf=0.01),
]


def test_recall_is_the_share_of_expected_passages_found() -> None:
    assert recall_at_k(frozenset({"a", "b"}), ["a", "c"]) == 0.5
    assert recall_at_k(frozenset({"a"}), ["a"]) == 1.0
    assert recall_at_k(frozenset(), ["a"]) == 1.0


async def test_measure_splits_recall_and_scores() -> None:
    questions = [
        Question("Where does he work?", "en", frozenset({"work"})),
        Question("איפה הוא למד?", "he", frozenset({"education"})),
        Question("Weather?", "en", frozenset()),
    ]
    report = await measure(StubRetriever(HITS), questions, top_k=2)

    assert report.mean_recall("en") == 1.0
    assert report.mean_recall("he") == 0.0
    assert report.mean_recall() == 0.5
    assert report.misses == [("איפה הוא למד?", ["education"])]
    assert report.relevant_scores == [0.8]
    assert sorted(report.other_scores) == [0.5, 0.5, 0.8]
    assert report.off_topic_best == [0.8]


def test_question_set_is_valid() -> None:
    questions = load_questions()
    assert len(questions) >= 15
    assert {q.language for q in questions} == {"en", "he"}
    assert any(not q.expected for q in questions)
