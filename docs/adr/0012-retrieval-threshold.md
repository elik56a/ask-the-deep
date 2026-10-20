# 0012. Retrieval threshold 0.57, set from measured scores

Date: 2026-10-20 · Status: accepted

## Context

Inside `search_knowledge`, a passage reaches the model only if its cosine similarity to the question is at least `RETRIEVAL_THRESHOLD`. The value was a 0.3 placeholder from P0. With `gemini-embedding-001`, every passage scores above 0.47, so 0.3 let everything through and the gate did nothing.

The initial question set (ADR 0011, `api/evals/retrieval.yaml`, 20 answerable and 4 off-topic questions) gives these scores against the real corpus:

| | min | median | max |
|---|---|---|---|
| Right passages in the top 6 | 0.623 | 0.697 | 0.809 |
| Other passages in the top 6 | 0.527 | 0.616 | 0.754 |
| Best passage for an off-topic question | 0.477 | 0.499 | 0.526 |

What each candidate blocks (`RETRIEVAL_THRESHOLD=<t> uv run --env-file .env python -m app.rag.recall`):

| Threshold | Right passages | Other passages | Off-topic questions |
|---|---|---|---|
| 0.30 | 0 / 22 | 0 / 98 | 0 / 4 |
| 0.55 | 0 / 22 | 5 / 98 | 4 / 4 |
| **0.57** | **0 / 22** | **14 / 98** | **4 / 4** |
| 0.60 | 0 / 22 | 40 / 98 | 4 / 4 |

## Decision

`RETRIEVAL_THRESHOLD` defaults to 0.57, the middle of the gap between the best off-topic score (0.526) and the lowest right passage (0.623). That leaves about 0.05 of margin on each side.

## Consequences

- Off-topic questions get no passages, so the agent says "I don't have that information" instead of writing from loosely related text.
- Wrong but related passages still pass when they score in the same band as right ones. The threshold can't separate them; the model and the citation check do.
- 0.60 would block more noise, but it sits only 0.02 above the lowest right passage. On a set this small, that is too close.
- Revisit with the P4 golden set (30–50 questions, including traps), whenever the corpus grows a lot, and on any change of embedding model, since scores are not comparable across models.
