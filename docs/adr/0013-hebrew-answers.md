# 0013. Hebrew answers: names as written, answer early, 1000 output tokens

Date: 2026-10-20 · Status: accepted

## Context

P1.16 asks that the answer follow the question's language, tested with the real model (`gemini-3.5-flash-lite`). The language rule itself held: 4 of 4 answers came back in the question's language, refusals included. But a Hebrew question about a company failed most of the time, while the same question in English worked:

- **Names were translated wrongly.** For "מה אליהו עושה בפייטק?" the model searched for "PayTech", and once for "Fintech". The corpus only had "Phytech", so the results didn't settle the question.
- **The model kept searching.** Even when the right passages came back, it called `contact_info` and searched again in English. With `AGENT_MAX_REQUESTS=4`, it could run out of requests before answering. It failed 3 times out of 4 in Hebrew and 0 times out of 2 in English.
- **"Built" sent the model to the project tools.** "What did he build at Givers?" made it call `list_projects` and `get_project` (for his personal projects) and run out of requests, in English too. The v2 rule "for questions about what he built" invited that.
- **The answer didn't fit.** Once the searching was fixed, the Hebrew answer hit `MAX_OUTPUT_TOKENS=500` before any text was produced. Hebrew uses roughly 2–3× the tokens of English, and the whole structured answer (text plus citations) must fit in the limit, or the run fails. The one Hebrew success before the fix used 486 tokens.

## Decision

- **Corpus:** each company's title carries its Hebrew spelling ("Phytech (פייטק)", "019 Mobile (019 מובייל)", "Givers (גיברס)", the IDF unit). The title is part of every passage's breadcrumb, so keyword search matches the Hebrew name. Passage ids do not change.
- **Prompt v3** (`answer_v3.md`, `RULES_VERSION=v3`) changes three rules:
  - Write search queries in English, but copy names exactly as the visitor wrote them, without a Hebrew prefix letter.
  - Answer as soon as the passages cover the question, whatever their language.
  - `list_projects` and `get_project` are for personal projects; work at a company is experience, found with `search_knowledge`.
- **`MAX_OUTPUT_TOKENS` goes from 500 to 1000.**

## Result

- Retrieval (`app.rag.recall`): recall@6 is 95.5% (English 95%, Hebrew 95.8%, with 2 new Hebrew company-name questions). The threshold of 0.57 still blocks 4/4 off-topic questions and 0 right passages.
- Live, `gemini-3.5-flash-lite`: "מה אליהו עושה בפייטק?" (4 runs, 2 of them through the API), "מה הוא בנה בגיברס?", "What does Eliyahu do at Phytech?" and "What did he build at Givers?" were all answered, each in its own language, each with one search. The Hebrew answers used 527–534 output tokens, which 500 would have cut off.

## Consequences

- An answer can cost up to twice as many output tokens. At flash-lite prices that is about $0.001 at most, and the daily and monthly caps still apply.
- New companies or projects in the corpus need their Hebrew spelling in the title.
- These are hand-run checks of a few questions. The P4 golden set and its tool-trajectory evals (P4.9) should cover Hebrew names and the number of searches.
- Seen but not fixed: flash-lite sometimes mixes a few Arabic letters into Hebrew words ("כמהندس"), and it often calls `contact_info` when it doesn't need to. Revisit both with the model choice once evals exist.
