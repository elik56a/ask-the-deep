# 0016. Off-topic refusals, and searching the visitor's own words

Date: 2026-10-21 · Status: accepted

## Context

The P3.14 gate run (live, prompt v3) showed three answer problems:

- **Off-topic questions were answered.** "What is the capital of Australia?" got "Canberra!" with no tool call, tagged `smalltalk`. ADR 0012 expects "I don't have that information" for off-topic questions.
- **A Hebrew company name was transliterated.** "מה הוא בנה בגיברס?" was searched as "Gibs", then four more searches, then `no_information`. Prompt v3 already says to copy names as written; Flash-Lite doesn't follow it reliably (the next run wrote "Gibbous").
- **An extra tool call.** "What does Eliyahu do at Phytech?" also called `contact_info` after the search had answered it.

## Decision

- **Prompt v4** (`answer_v4.md`, `RULES_VERSION=v4`):
  - `smalltalk` is only a greeting, a thank-you, or a question about the assistant.
  - A question about anything other than Eliyahu gets `no_information` ("I can only answer questions about Eliyahu"), even when the model knows the answer.
  - `contact_info` only when the visitor asks how to reach him, or before a `no_information` reply.
- **The first `search_knowledge` call in a run also searches the visitor's question as written.** The two result lists are merged, each passage once with its better similarity, and the same threshold applies. This is code, not a prompt rule, so a bad rewrite of a name can't hide the right passages. The retrieval eval (ADR 0011) already measures the raw questions, Hebrew included, at 95.8% recall@6.

## Consequences

Live run on v4 (7 questions):

| Question | v3 | v4 |
|---|---|---|
| מה הוא בנה בגיברס? | no_information, 5 model calls | answered (Givers, 0.668), 2 calls |
| What is the capital of Australia? | answered "Canberra" | no_information, offers contact |
| What does Eliyahu do at Phytech? | answered + `contact_info` | answered, no `contact_info` |
| Hi! who are you? / What did he build at Givers? / מה אליהו עושה בפייטק? / How can I contact him? | — | all correct |

- The first search costs one more embedding call, run in parallel.
- The dive's retrieval step can show up to twice `RETRIEVAL_TOP_K` passages on the first search.
- Still open for the P4 golden set: the model sometimes searches a second time after the first search already covered the question, and a greeting sometimes triggers a search.
