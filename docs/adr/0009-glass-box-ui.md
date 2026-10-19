# 0009. Glass box UI: dark case, CSS motion, plain three.js

Date: 2026-10-19 · Status: accepted

## Context

The spec proposes light and dark tokens, "Radix components, Motion" for styling, and a watch scene in Three.js with React Three Fiber. A clickable prototype of the chat and the "under the hood" panel ([Glass Box Panel](https://claude.ai/artifact/FHyvs4SJQtqSCevMiwQCmz)) showed:

- A light chat beside a dark panel reads as two products. The "looking into the case" feeling needs one dark world.
- The motion the UI needs is small: elements entering as events arrive, one panel reveal (FLIP of the chat plus a slide-in) and a few transitions. CSS and the Web Animations API cover all of it.
- The watch movement is one imperative scene (a few gears, a balance wheel) driven by stream events. React Three Fiber adds a renderer layer around ~200 lines of plain three.js.
- The components so far (a switch, a disclosure) are native elements with correct semantics.

## Decision

- The site is dark by default: the chat is the lifted surface and the panel is the deepest layer (`case`). A theme switch offers the spec's light tokens (warning darkened to `#b25f00` for AA on white); the choice is kept in `localStorage` and applied by an inline boot script before first paint. Both themes keep the chat and the panel in one palette, never light beside dark.
- Motion uses CSS transitions and animations, and WAAPI (`element.animate`) where JS must measure (the panel reveal). No Motion library. Curves come from the animate skill: `--ease-out` for entries and exits, `--ease-in-out` for on-screen movement.
- The watch movement uses plain `three` inside an effect, loaded lazily on the client. No React Three Fiber.
- No component library yet. shadcn/ui on Radix comes in with the first component that needs managed focus (the mobile bottom drawer, P5.5).

## Consequences

- Fewer dependencies and less bundle weight. The motion rules are visible in plain CSS.
- Every new color needs a value in both themes; the three.js movement (P5.10) must read its colors from the tokens.
- Spring physics, gesture-driven motion and complex exit choreography would justify adding Motion later; a scene with many interacting React-driven objects would justify R3F.
