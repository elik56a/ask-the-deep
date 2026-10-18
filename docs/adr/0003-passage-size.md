# 0003. One passage per section, split above 400 tokens, never merged

Date: 2026-10-18 · Status: accepted

## Context

The spec asks for passages of 150 to 400 tokens. The knowledge files are written as one topic per `##` section, and many sections are shorter than 150 tokens.

## Decision

- Each `##` section is one passage. A section over 400 tokens (`MAX_PASSAGE_TOKENS`) is split at paragraph breaks.
- Short sections are not merged with their neighbors.
- Passage ids come from the heading (`experience/phytech.md#monorepo-migration-at-phytech`), so inserting a section does not change other ids.
- Tokens are estimated at 4 characters per token, with no tokenizer dependency.

## Consequences

- Each passage is about one topic, which keeps retrieval precise and citations meaningful.
- Very short sections carry less context; the breadcrumb prefix ("Phytech › Roles at Phytech") compensates.
- The token estimate is rough, especially for Hebrew. Revisit if evals show oversized or fragmented passages.
