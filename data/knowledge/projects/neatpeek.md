---
title: NeatPeek
type: project
role: Creator and sole developer
technologies: [Next.js, TypeScript, React, PostgreSQL, Prisma, NextAuth.js, Google Vertex AI, Gemini, Figma API, Stripe, Tailwind CSS, Radix UI, TanStack Query, Railway]
url: https://github.com/elik56a/neatpeek
language: en
visibility: public
---

# NeatPeek

## What NeatPeek is

NeatPeek is an AI design QA platform that Eliyahu built on his own. It is a SaaS product that checks design frames against a company's brand guidelines and posts its feedback as comments directly in Figma, so designers see each issue on the frame where it happens. NeatPeek is Eliyahu's largest personal repository: about 400 source files of TypeScript, built from April to June 2025.

## How NeatPeek works

In NeatPeek, a team first sets up a brand: it uploads its brand book as a PDF, adds example designs and writes custom rules. An AI model reads these materials and extracts the brand's rules into structured categories: colors, typography, spacing, logo, icons, layout, imagery and general rules. The team then pastes a Figma link. NeatPeek pulls every frame in it through the Figma API, sends the frame images and the brand rules to the model, and gets back brand violations, general design issues and positive aspects for each frame, with a design score. Each issue becomes a pinned Figma comment at the exact spot on the frame, with a severity and a suggested fix.

## AI in NeatPeek

NeatPeek uses Google's Gemini models through Vertex AI, with a provider interface so the model vendor can be swapped. Eliyahu wrote detailed prompts that make the model return strict JSON with a fixed schema. The brand-guideline prompt gives each extracted rule a confidence score and ranks sources strictly: custom rules over the PDF brand book, and the PDF over patterns inferred from examples. The design-review prompt is tuned to avoid false positives: it tolerates imperceptible differences of a few pixels or color units, asks for high confidence before flagging, removes duplicate findings, places each issue with relative coordinates on the frame and requires a specific, actionable fix for every issue.

## Rechecking designs in NeatPeek

After a designer fixes a design, NeatPeek can recheck it. It reads the existing Figma comments, groups them by frame and asks the model whether each earlier issue was fixed. It then replies in the same Figma comment threads, marks issues as fixed or not fixed, reports any new issues and updates the design score. Every review keeps a timeline of what happened, so a team can follow a design from its first review to approval.

## Teams and billing in NeatPeek

NeatPeek is built as a multi-tenant SaaS. Users belong to companies and teams with roles, can invite new members and manage their notification settings. Subscriptions come in Freemium, Pro and Business tiers with usage limits and usage counting, and checkout runs through Stripe. The data model also covers invoices, API usage tracking, audit logs, feature flags and rate limiting.

## How NeatPeek is built

NeatPeek is a Next.js App Router application in TypeScript, with about 40 API routes. Data lives in PostgreSQL through Prisma, with around 30 models and versioned migrations. Authentication uses NextAuth.js with credentials, and Figma OAuth connects a user's Figma account. The code is organized by feature (brand setup, design review, dashboard, team, settings), with shared services for AI, storage, logging and the database. The interface uses Tailwind CSS, Radix UI components, TanStack Query and Recharts dashboards. NeatPeek deploys on Railway, with separate local, development and production environments.
