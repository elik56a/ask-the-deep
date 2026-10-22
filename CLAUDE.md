# Portfolio Chat Agent

Personal portfolio with a transparent RAG chat agent. Spec: [System Specification](https://claude.ai/artifact/TrVTLh2UgxXrebhpkkrtkp). Task tracker: [TASKS.md](TASKS.md) — update task status as work lands.

## Layout

- `api/` — FastAPI + Pydantic AI (Python 3.12, uv)
- `web/` — TanStack Start, static prerender (TypeScript, pnpm)
- `data/knowledge/` — markdown corpus (only `visibility: public` is ingested)
- `infra/` — Terraform, pay-per-use AWS only
- `docs/adr/` — architecture decision records

## Commands

```sh
# api/
uv run ruff format . && uv run ruff check . && uv run mypy app tests && uv run pytest
uv run uvicorn app.main:app --reload --port 8000

# web/
pnpm exec biome check --write . && pnpm exec tsc --noEmit
pnpm dev            # http://localhost:5173
pnpm test          # vitest
pnpm gen:events     # regenerate src/generated/events.gen.ts after changing api/app/events.py
```

## Code standards

Formatting and linting are owned by the tools, with default settings: Ruff (Python) and Biome (TypeScript). Never hand-format or fight the config. Every change passes the commands above before it is done.

- **Types:** mypy strict and TypeScript strict. No `Any`/`any` — use a precise type, a generic, or `unknown` with narrowing. No `# type: ignore` / `@ts-expect-error` without a one-line reason.
- **Small and single-purpose:** short functions, clear names, no duplication. Prefer the standard library and existing dependencies over new ones.
- **Config, not literals:** tunable values (model, thresholds, limits, prices) live in `app/config.py` via environment variables. Fixed user-facing strings live with the module that owns them.
- **Python docstrings:** every module gets a docstring saying its role in plain words; every public class and function gets one saying what it does and why (not restating the signature). Private helpers only when non-obvious.
- **Comments:** inline comments only for the non-obvious *why*. No comments that restate code, no banners, no commented-out code. `TODO(<task id>)` for known placeholders. TypeScript stays comment-light.
- **Tests:** every new module with logic ships with tests. Tests never call a paid API — use Pydantic AI's `TestModel` / `"test"` model.
- **Generated files** (`*.gen.ts`) are never edited by hand.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:` …), small and focused.

## Frontend

- **One kind of thing per file.** Functions, types and constants never share a file. The only exception is a component's own props interface, which lives in the component.
- **Folders** (`web/src/`):
  - `routes/` pages (TanStack file routes)
  - `components/` React components; they render, nothing else
  - `components/ui/` shadcn/ui on Radix, added with `pnpm exec shadcn add <name>` (vendor code: exempt from the one-kind-per-file and comment rules). On add, review it: no `transition-all`, and swap `bg-muted`/`bg-accent` (shadcn backgrounds) for our tokens, since `muted` and `accent` mean muted text and brand blue here. Buttons and badges always come from `ui/` (`Button` variants, `Badge` variants incl. `metric`/`ok`/`warn` for panel numbers); restyle with `className`, don't hand-roll
  - `hooks/` React hooks
  - `hooks/sea/` the three.js scene `useSea` runs, one part per file (stateful builders, not hooks); their maths lives in `utils/`, their tuning in `constants/seaScene.constants.ts`
  - `utils/` pure functions only, `<name>.utils.ts`
  - `types/` interfaces and types only, `<name>.types.ts`
  - `constants/` constants and UI copy only (plain data, no functions), `<name>.constants.ts`
  - `generated/` generated files, never edited by hand
- **Tests** live in `web/tests/`, mirroring `src/` (`tests/utils/chat.utils.test.ts`); captured data in `web/tests/fixtures/`. Build scripts in `web/scripts/` follow the same file rules.
- No abstraction layers for their own sake: plain functions and hooks, no classes or factories unless something needs them.
- Styling with Tailwind and design tokens (CSS variables), no hardcoded colors, no inline style objects except truly dynamic values.
- Accessibility is part of done: semantic HTML, keyboard navigation, WCAG AA contrast.
- RTL-first: logical CSS properties (`ms-*`, `ps-*`, `margin-inline`), never left/right.

## Project rules (from the spec)

- No model calls outside the model layer (`app/agent/`).
- Every event goes through the `Emitter`; nothing writes to the stream directly.
- No secrets in the repo: environment variables and SSM only.
- Conversation text is never stored: not in logs, traces or the database.
- A change to the model, prompt or corpus comes with an eval run.
- A decision that departs from the spec gets a short ADR in `docs/adr/`.
- If the spec contradicts itself or lacks a value, stop and ask.
