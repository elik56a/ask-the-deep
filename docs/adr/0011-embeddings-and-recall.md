# 0011. gemini-embedding-001 at 768 dims, keyword search without question words

Date: 2026-10-20 · Status: accepted

## Context

P1.9 asks for `gemini-embedding-001` (768 dims) and a measured recall@6 on Hebrew and English, with a gate of more than 90%. The measurement uses the initial question set in `api/evals/retrieval.yaml`: 20 questions with expected passages (10 English, 10 Hebrew) and 4 off-topic questions. It runs against the real corpus of 31 passages (`uv run --env-file .env python -m app.rag.recall`).

The first run reached 87.5% (English 80%, Hebrew 95%). The misses came from the keyword side. BM25 had no stopword list, so "where", "did" and "he" matched passages at random. RRF then pushed the right passage out of the top 6, even when the vector side ranked it first ("Where did he study?" → `profile.md#education`).

Pydantic AI already sends the Google task types (`RETRIEVAL_DOCUMENT` for passages, `RETRIEVAL_QUERY` for questions), so the vector side needed no change.

## Decision

- Keep `gemini-embedding-001` at 768 dims, as the spec says.
- Keyword search drops a short list of English and Hebrew question words, plus the name "Eliyahu", which is in almost every passage. The list applies to both passages and questions (`tokenize` in `app/rag/retrieval.py`).

## Result

| | recall@6 |
|---|---|
| English | 95% |
| Hebrew | 95% |
| All | 95% |

The one miss left is `profile.md#who-eliyahu-is` for "Where does he work now?" (en and he). `experience/phytech.md#roles-at-phytech` is found, so the answer is still covered.

Cosine similarity (input for P1.11): right passages 0.62–0.81 (median 0.70), other passages in the top 6 0.53–0.75 (median 0.62), best off-topic passage 0.48–0.53.

## Consequences

- The gate passes with some headroom, on a small set. The P4 golden set (30–50 questions) replaces this number.
- Vector scores sit in a narrow band (about 0.5 to 0.8). A useful threshold has to be set from the measured spread (P1.11), not picked by hand.
- Revisit if recall drops when the corpus grows, or if `gemini-embedding-2` measures better on the same set.
