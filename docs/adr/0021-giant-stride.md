# 0021. The giant stride replaces the pre-dive veil

Date: 2026-10-25 · Status: accepted · Amends ADR 0019 (pre-dive check)

## Context

ADR 0019 started every dive behind a veil: a blurred, darkened scrim over the sea, a 3D ship's wheel in a dive-watch ring, four equal check tiles and a countdown. In use it felt stuck and gloomy. The bright surface turned grey for about five seconds. The wheel was a different metaphor from the diver who carries the rest of the dive, and he was only a speck at the surface. The start of the dive, entering the water, was never shown: the veil faded and the camera was already at 0 m.

Underwater, the server's own actions (tool name and arguments, scores, tokens, cost, the raw event) were the smallest text on the step cards, at 11 to 13 px, below larger explanatory prose.

## Decision

- **No veil.** The sea stays bright. The pre-dive check is a light diver's slate held up beside the diver: the question on ruled lines, the checks ticked off as a short buddy check, and the countdown running along the Jump button. Not now, Esc and the keyboard path are unchanged.
- **The diver is the scene.** On the buddy check he swims up close and the camera drops toward the waterline. Jump in (or the end of the countdown) makes him take a giant stride: he sinks into the swell, arcs out of the water and goes in head first, with spray and foam rings. The question is sent at the jump, so the server works while he is in the air. The dive starts as his head goes under, and he hands over to the head-down dive pose as the camera follows him through the waterline.
- **The server's actions come first on a step card.** A tool step shows the call as code (`search_knowledge(query="…")`) in the step's colour, at 18 px in the focused card. Metric chips go from 11 to 13 px in focus, retrieval scores from 12 to 15 px, and the raw event line from 11 to 12 px.
- Reduced motion skips the leap (the dive starts at once). Without WebGL the dive starts at once.

## Consequences

The ship's wheel, its renderer and its ring are gone (`useHelm`, `HELM_*`). The jump adds about 0.5 s between Jump in and the first step, but the request leaves at the jump, so the server's clock is not delayed. The leap is a transform animation on the existing diver model, with no new assets.
