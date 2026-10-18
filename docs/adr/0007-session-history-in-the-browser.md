# 0007. The whole session's conversation, kept in the browser

Date: 2026-10-19 · Status: accepted

## Context

The spec let the client send at most 4 earlier messages. A real chat has to remember the whole session. Decision D4 still holds: conversations are never stored, and there is no list of past chats.

## Decision

The browser keeps the session's conversation in `sessionStorage` and sends it with every question. The server stays stateless and saves nothing. `MAX_HISTORY_MESSAGES` (default 20) caps what is sent; the browser drops the oldest messages first, and the server's `history_size` guardrail rejects anything larger.

## Consequences

- The agent remembers everything said in the session. Closing the tab ends the conversation.
- No database, no session ids, and nothing to delete or protect on the server.
- Each question re-sends the history, so input tokens grow with the conversation. The cap keeps the worst case to about 10k tokens, a fraction of a cent on Flash-Lite.
