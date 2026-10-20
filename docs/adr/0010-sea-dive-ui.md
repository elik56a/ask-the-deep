# 0010. Sea dive UI: depth is the process view

Date: 2026-10-20 · Status: accepted

## Context

ADR 0009 put the chat beside a dark "under the hood" panel with a three.js watch movement. A clickable prototype of a different idea ([The Dive](https://claude.ai/artifact/FHyvs4SJQtqSCevMiwQCmz)) tested better:

- "Under the hood" becomes "under the surface". Each server event takes the page one step deeper, so the process reads as one journey instead of a second panel to watch.
- The pipeline stages map onto ocean zones (guardrails in Sunlight, model calls in Twilight, tools and retrieval in Midnight, writing in the Abyss). Agent loops go deeper, into the Trench. Depth in meters is a real unit, so the scale itself shows how far the agent went.
- Procedural low-poly creatures looked cheap. Real CC BY models from Sketchfab (a diver, fish, a sardine school, jellyfish, an anglerfish) carry the scene. Shrunk with gltf-transform, they total about 4.8 MB.
- The water colour already changes from a warm surface to near-black. A light/dark theme switch would fight it.

## Decision

- The home page is one fixed full-screen three.js sea behind real DOM. At rest it is a single surface screen with no scroll. Sending a question unlocks scroll and dives. The log of steps is placed at depth in the document, the console docks at the inline-end on desktop and becomes a bottom sheet on mobile, and the run ends at the seabed with a dive profile and a receipt. This replaces the side-by-side panel and the watch movement from ADR 0009.
- Stage = zone, event = step. Each zone gets the same scroll height, so meters are non-linear in pixels. Each event kind has a minimum depth, and no step is placed above the one before it.
- **Depth replaces the theme switch.** There is one palette. The surface tokens are light and the depth tokens are dark, and the text flips once below about 150 m. `ThemeSwitch`, `useTheme`, the theme constants, utils and boot script are removed. The spec's light/dark token table is superseded for the home page.
- "Stay at the surface" replaces "Show the process": it answers without diving.
- The 3D models ship as `.glb` in `web/public/models/`. The page credits each one (CC BY requires it).
- ADR 0009 still holds for plain three.js without React Three Fiber, CSS and WAAPI motion without a motion library, and shadcn/ui on Radix.

## Consequences

- The process view is the page itself, so mobile no longer needs a drawer for it.
- The page weighs about 5 MB more. The models load lazily after first paint, and the scene works without them.
- No light mode. People who need a light page get WCAG AA contrast at every depth instead.
- We would revisit this if the dive hurts the time to an answer, or if the sections below the chat (P5.6) need their own theme.
