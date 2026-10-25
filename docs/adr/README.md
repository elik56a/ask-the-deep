# Architecture decision records

A short record for every decision that departs from the [system spec](https://claude.ai/artifact/TrVTLh2UgxXrebhpkkrtkp) or shapes the system. New ones start from [0000-template.md](0000-template.md). A later record can supersede an earlier one; the old one stays, marked as superseded.

| # | Decision | Status |
| --- | --- | --- |
| 0001 | [Fixed pipeline instead of an autonomous agent](0001-fixed-pipeline.md) | superseded by [0005](0005-bounded-tool-calling-agent.md) |
| 0002 | [DynamoDB for counters, no Redis](0002-no-redis.md) | accepted |
| 0003 | [One passage per section, split above 400 tokens, never merged](0003-passage-size.md) | accepted |
| 0004 | [Knowledge base stays out of git; ingestion runs locally](0004-local-knowledge-base.md) | accepted; git part superseded by 0018 |
| 0005 | [Bounded tool-calling agent](0005-bounded-tool-calling-agent.md) | accepted · Supersedes [0001](0001-fixed-pipeline.md) |
| 0006 | [Model prices from genai-prices, not a pricing file](0006-prices-from-genai-prices.md) | accepted |
| 0007 | [The whole session's conversation, kept in the browser](0007-session-history-in-the-browser.md) | accepted |
| 0008 | [Spend capped at $5 a month](0008-five-dollars-a-month.md) | accepted |
| 0009 | [Glass box UI: dark case, CSS motion, plain three.js](0009-glass-box-ui.md) | accepted · layout, watch and theme switch superseded by 0010 |
| 0010 | [Sea dive UI: depth is the process view](0010-sea-dive-ui.md) | accepted |
| 0011 | [gemini-embedding-001 at 768 dims, keyword search without question words](0011-embeddings-and-recall.md) | accepted |
| 0012 | [Retrieval threshold 0.57, set from measured scores](0012-retrieval-threshold.md) | accepted |
| 0013 | [Hebrew answers: names as written, answer early, 1000 output tokens](0013-hebrew-answers.md) | accepted |
| 0014 | [Secrets per environment from SSM, provider limits set by hand](0014-secrets-per-environment.md) | accepted |
| 0015 | [Prompt caching: Gemini's implicit cache, no explicit cache](0015-implicit-prompt-caching.md) | accepted |
| 0016 | [Off-topic refusals, and searching the visitor's own words](0016-off-topic-and-question-search.md) | accepted |
| 0017 | [The last model call must answer; prompt v5](0017-answer-on-the-last-call.md) | accepted |
| 0018 | [Public knowledge files are in git; private ones stay local](0018-public-knowledge-in-git.md) | accepted · Supersedes the git part of 0004 |
| 0019 | [Dive v3: paced dive, the answer at the seabed, one type family](0019-dive-v3.md) | accepted · Amends 0010 |
| 0020 | [Search first, stream the answer, think minimally](0020-search-first-and-stream-the-answer.md) | accepted |
| 0021 | [The giant stride replaces the pre-dive veil](0021-giant-stride.md) | accepted · Amends ADR 0019 (pre-dive check) |
