# 0020. Search first, stream the answer, think minimally

Date: 2026-10-24 · Status: accepted

## Context

The spec lets the model decide every tool call. In practice `gemini-3.5-flash-lite` used all four allowed calls on most questions: it searched, then searched again with narrower queries ("AWS", "AWS at Phytech", "Terraform AWS") even when the first results covered the question. Each call took 3–7 s, mostly Gemini 3's default thinking, so answers took 5–19 s. The answer was an output-tool call, which arrives whole, so the first word came at the very end. A citation of a passage the model had not read made it retry, and on the last allowed call that retry did not fit: the visitor got no answer after 14 s.

## Decision

- **Search first.** The pipeline searches the visitor's question as typed before the first model call and hands the model the result as if it had made that call itself. The model still decides every other call and may search again. The dive shows that first search like any other.
- **Native output.** The answer is JSON text (`NativeOutput`), so it streams as it is written. Gemini 3+ allows it together with function tools.
- **Drop unread citations.** A cited id that no tool returned in this run is removed instead of failing the answer. The rule that an `answered` reply needs a tool result still triggers a retry.
- **Minimal thinking.** `LLM_THINKING` (default `minimal`) sets how hard the model thinks before it writes.
- **Prompt v6** says the question has already been searched, to answer when the passages cover it, and to call tools together instead of one after another.

The eval run that CLAUDE.md asks for was skipped at the owner's request. A spot check on five questions (English, Hebrew, small talk, off-topic, live GitHub) gave correct answers in 1.3–3 s with 1–2 model calls.

## Consequences

Most questions now take one model call, and the time to an answer drops from 5–19 s to about 2–3 s. Every question pays one search before the model starts (about 0.4–0.7 s), including small talk that needs none. Dropping unread citations means an answer can stand with fewer sources than the model claimed. Revisit if the eval shows worse answers at `minimal` thinking, or if the model starts relying on the first search for questions it should break into parts.
