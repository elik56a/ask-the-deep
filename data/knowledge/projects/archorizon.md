---
title: ArcHorizon
type: project
role: Creator and sole developer
technologies: [React, TypeScript, Vite, Google Gemini, three.js, React Three Fiber, Zustand, Tailwind CSS, jsPDF]
url: https://github.com/elik56a/ArcHorizon
language: en
visibility: public
---

# ArcHorizon

## What ArcHorizon is

ArcHorizon is an AI architectural design platform that Eliyahu built on his own from November to December 2025. It turns a text description or a rough sketch into an editable floor plan, shown as a professional 2D CAD blueprint and as a 3D model. Plans can be exported as DXF for AutoCAD, as PDF or as SVG.

## How ArcHorizon works

In ArcHorizon, a user talks with an AI architect agent in a chat. The agent interviews the user about the plot, the style, the number of bedrooms and whether they want an open plan. When it has enough information, it calls a tool named propose_design with a summary of the requirements, and a generator model produces the plan as structured JSON: floors, rooms with sizes and positions, and every door, window and piece of furniture. A user can also upload an image of an existing plan. ArcHorizon then traces it exactly into a live blueprint, but only after the agent asks for the total area and number of rooms, since it cannot guess the scale from a drawing. Alternatively, the image can serve only as style inspiration for a new layout.

## The geometry engine in ArcHorizon

AI output alone does not make a valid building, so ArcHorizon runs every generated plan through a geometry engine that Eliyahu wrote. The engine normalizes element types, fixes the scale and removes artifacts. It pulls floating rooms into one cluster, separates overlapping rooms, snaps rooms together to close gaps and stacks floors vertically. It then makes sure every room is reachable through doors, gives rooms natural light, corrects windows and doors, allows only one main entry door and places the furniture inside each room. Validators then flag remaining problems in the plan, such as a room with no entrance or furniture outside any room.

## Disciplines and layers in ArcHorizon

ArcHorizon organizes a plan into layers by discipline: architecture, plumbing and electrical. Architecture and plumbing each have their own AI agent with its own schema and prompt. The plumbing agent, for example, places water supply lines, waste lines, vent stacks, drains and fixtures. Agents are looked up in a registry, so a new discipline is added by registering a new agent and its validators.

## How ArcHorizon is built

ArcHorizon is a React and TypeScript single-page application built with Vite. It uses Google Gemini through the official Gen AI SDK: Gemini 2.5 Flash for the chat and plan generation, with a JSON response schema and retries with backoff, and a Gemini image model that turns a blueprint into a realistic render. The 2D editor draws walls and dimension lines with SVG, and the 3D view uses three.js through React Three Fiber, with an animation of the building growing into place. State lives in Zustand stores split into slices. The editor has keyboard shortcuts, resize handles and a properties panel, and the interface is translated into English and Hebrew.
