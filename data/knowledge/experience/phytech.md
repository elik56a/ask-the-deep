---
title: Phytech (פייטק)
type: experience
company: Phytech
start: 2022
end: present
language: en
visibility: public
---

# Phytech

## Roles at Phytech

Eliyahu works at Phytech now. He joined Phytech in 2022 as a Full Stack Engineer and has been a Senior Full Stack Engineer there since 2025. Phytech is an agriculture technology company whose web and mobile apps help growers monitor their fields and irrigation.

## What Phytech does

Phytech is an Israeli agriculture technology (agtech) company. Its plant sensors continuously measure tiny changes in a plant's stem diameter, which are a known indicator of plant stress, and its platform turns that data into irrigation guidance for growers of fruit, nuts and field crops. Phytech also monitors the irrigation system itself: pumps, filters, valves, water tanks and fertilizer tanks. Growers use the Phytech web app and the Phytech mobile app to see their fields, alerts and irrigation plans.

## Eliyahu's scope at Phytech

At Phytech, Eliyahu works across the whole product: the React web app, the React Native mobile app, the shared npm packages both apps are built from, the Node.js API server, and the build, publish and deploy pipelines that connect them. He also builds the team's AI developer tooling on Claude Code. Much of his work is infrastructure that the rest of the team builds on: monorepos, shared packages, CI/CD, testing and code-quality enforcement.

## AI and engineering governance at Phytech

At Phytech, Eliyahu built phytech-tooling, a team-wide Claude Code plugin with custom hooks, rules and skills that is enforced automatically across all repositories. It enforces the team's component design patterns, component reuse and best practices, and requires strongly typed code. It also runs targeted tests automatically, repairs failures, and requires test coverage.

## Claude Code hooks Eliyahu built at Phytech

The phytech-tooling plugin Eliyahu wrote for Phytech uses Claude Code hooks to enforce the team's rules on every AI-assisted change, in every permission mode. Hooks inject the team's coding rules at the start of a session and check every edit against them. Changed files must have zero ESLint errors. After a change, the tests related to the changed files run automatically, and failures are fixed before the work counts as done. A planning gate asks for a plan before larger changes, and each session is titled with the full Jira ticket name. Small touches, such as a bell when Claude is waiting for input, make the tool pleasant to use every day.

## Claude Code skills Eliyahu built at Phytech

Eliyahu wrote several Claude Code skills for Phytech's developers. A Jira ticket skill starts work from a ticket: it creates the branch, implements the fix, proves UI fixes visually by recording GIFs and attaching them to the pull request, checks the merged fix on the development environment, and then offers to move the ticket to QA. A publish skill releases changed shared packages and rolls the new versions out to the web and mobile apps, including an over-the-air mobile update. Security skills triage Dependabot and code-scanning alerts and open one pull request per severity level. Plugin releases ship with one command and can be announced in Slack.

## Testing strategy at Phytech

Eliyahu owns the testing strategy and quality across his team at Phytech. Under his ownership, test coverage reached nearly 100% across all projects.

## How Eliyahu tests at Phytech

At Phytech, Eliyahu brought full test coverage to the web app, the mobile app, the shared packages and the Node.js API server, using Jest. The publish pipeline runs the full test suite before any package is released, and it skips publishing a package when only its tests changed. Test suites follow one layout across the repositories, and expected error logs are silenced so real failures stand out. Testing is also enforced at the tooling level: the team's Claude Code plugin runs the tests for every changed file automatically.

## Monorepo migration at Phytech

Eliyahu led Phytech's migration to a Yarn Workspaces monorepo spanning React and Node.js services. The migration simplified shared dependency management, reduced build times and unified development practices across frontend and backend. The backend services include PostgreSQL-backed APIs with Redis caching and RabbitMQ messaging.

## History of Phytech's monorepos

In 2023 Eliyahu set up Phytech's web monorepo from scratch: the base web app with webpack, linting and absolute imports, and separate packages for each part of the product, such as the dashboard, the field overview, analytics, users management, internal tools and a shared web-common library. In 2024 he moved the code shared by web and mobile into a second monorepo of common packages. Both monorepos first ran on Nx. In 2026 he removed Nx from both and moved them to native Yarn 4 workspaces, which made the setup simpler and faster to build.

## Shared packages at Phytech

At Phytech, Eliyahu maintains a monorepo of shared npm packages that both the web app and the mobile app are built from. The packages include a shared UI and utilities library, a system monitoring package for hydraulics, a planning kit for irrigation planning, common TypeScript types, common utilities, a climate package and validations. One codebase serves web and mobile, so a feature or fix is written once. He also wrote a script that mirrors the packages' local source into the apps during development, so developers can test a change before it is published.

## Automated package publishing at Phytech

Eliyahu built Phytech's automated package publishing in TypeScript. On every push, the pipeline finds which packages changed, using its own changed-files detection, and publishes only those, in parallel. For each package it bumps the version, builds the TypeScript declarations, publishes to npm, and tags and commits the release with a bot user. Three release channels map to three branches: release candidates from pre-develop, next versions from QA, and production releases from master, with support for hotfix branches. A script merges branches automatically so version bumps never conflict.

## CI/CD and delivery at Phytech

Eliyahu wrote Phytech's CI/CD pipelines end to end and optimized delivery on AWS with S3 and CloudFront. This cut asset delivery latency by 40% and made build pipelines 25% faster.

## CI/CD details at Phytech

At Phytech, Eliyahu moved the web monorepo's pipelines from CircleCI to GitHub Actions in 2023. The pipelines build only what changed, cache dependencies and test transforms between runs, and run the full test suite before publishing. Shared assets such as icons sync to S3 and are served through a CDN on every environment. He keeps the pipelines current and safe as well: shallow checkouts, pinned Yarn versions, enough memory for the TypeScript declaration build, and upgraded GitHub Actions.

## Hydraulic and irrigation monitoring at Phytech

As a Full Stack Engineer at Phytech (2022–2025), Eliyahu architected a core shared npm package that powers hydraulic and irrigation monitoring on both web and mobile. It is backed by Node.js services and PostgreSQL data models for sensor telemetry. He built interactive schematic diagrams of system topology, time-series flow and pressure graphs, totalizers and fertilizer tracking. The shared architecture maximized code reuse and testability.

## Hydraulic map and alerts at Phytech

Eliyahu's first project at Phytech, in 2022, was system monitoring in the mobile app: showing a grower's irrigation system on a map, with valves, pumps, filters and other components, their live status and their active alerts. He later brought the same hydraulic view to the web app, added irrigation rooms, energy sensors, EC sensors and area summaries, and built filters by irrigation system type and by group. Active alerts appear on the map, in component cards and in an alerts list, so a grower can go straight from an alert to the component that raised it.

## System topology diagrams at Phytech

At Phytech, Eliyahu built interactive schematic diagrams of a grower's irrigation system on web and mobile. A diagram shows the system's topology, such as the main line, the valves under it, injectors and pumps, with each component's latest readings. Growers can switch between diagram, list and map views, filter components, and export the diagram. The diagram stays on the selected area after a page refresh.

## Hydraulic graphs at Phytech

At Phytech, Eliyahu built the time-series graphs for flow, pressure, energy and other hydraulic measurements on web and mobile. The graphs show threshold lines such as low pressure, low flow and rest pressure, daily consumption histograms, and the planned irrigation spans next to the actual pressure. Growers can compare one component with another, move between dates, and on mobile swipe through dates or turn the phone for a horizontal view. Values follow the grower's unit settings, so pressure can be shown in psi, kPa or bar.

## Totalizers, fertilizer tanks and units at Phytech

At Phytech, Eliyahu built the totalizer feature on web and mobile, where growers record water meter readings, each saved with the area's local time. He also built fertilizer tank tracking and the screens for adding fertilizer types, with density and dilution. Behind these features is a unit conversion layer that he wrote for volume, flow, pressure and energy, so each grower sees values in the units set for their account.

## Irrigation planning at Phytech

At Phytech, Eliyahu built much of the irrigation planner on web and mobile, and in 2026 moved it into a shared planning kit package. Growers use it to schedule irrigation events with validated forms: start time, duration, pulses, back-to-back runs, delays between valves and pump selection per valve. He added fertigation with proportional amounts, cooling events triggered by temperature, irrigation templates, scheduling over multiple days, deleting irrigations by date range, and a stop-all-irrigation action.

## Irrigation programs at Phytech

In 2026 Eliyahu built an irrigation programs module in Phytech's planning kit, for web and mobile. A program is a repeating irrigation sequence: a grower orders shifts of valves and pumps, drags components between shifts, and sets the schedule by days of the week or by a cycle of days. The program list shows each program's status and its next computed irrigation, with search, sorting and actions such as freeze and release. He designed the client together with the server API contract and shipped it behind a feature flag as a beta.

## Irrigation recommendations at Phytech

In 2026 Eliyahu built the screens where Phytech growers review irrigation recommendations for areas run by an irrigation controller. For each program, the grower sees the suggested amount and the formula behind it, including the soil adjustment, and can approve or skip it. He added safety checks, such as blocking an approval that would leave a whole water pool dry, along with sorting, area-level settings and a feature flag for each action.

## Plot reports and charts at Phytech

In 2026 Eliyahu built a reports module in Phytech's web app, where growers plot any measurement for a plot across a season and save their reports. He designed it in milestones, from the page shell to a full chart stack with axes, legends, series styles, a season range selector, fullscreen mode, and loading, empty and error states. To keep it fast it draws only the visible time window, and it supports keyboard use and reduced motion. He also moved the dashboard's charts from ApexCharts to ECharts.

## Node.js API server at Phytech

Since 2023 Eliyahu has been a main contributor to Phytech's Node.js API server, written in TypeScript with Express and Inversify for dependency injection. He moved features from the older Ruby API to Node, including active alerts, plot bounds, search and threshold updates. He built the hydraulic APIs for components, valves, measurements, totalizers and temperature sensors, backed by PostgreSQL functions, with a Redis cache, gzip compression and protection against SQL injection. He also fixes performance at the database level: he fixed a valves query that took about 10 seconds by materializing its alerts per area.

## Java at Phytech

At Phytech, Eliyahu works with the company's Java services as well as its Node.js ones. In the Node.js API he integrated data from Java services, such as merging active alerts from the Ruby and Java systems and calling a Java service with automatic retries. In 2026 he changed Phytech's Java AI worker, a Maven project, so it can use several AI providers instead of only OpenAI: he replaced the OpenAI Java SDK with LangChain4j, so the provider (OpenAI, Anthropic or OpenRouter) is chosen by the model setting. He moved image analysis to work with any provider, logged token usage per call, and added JUnit tests.

## Phytech mobile app

Eliyahu has worked on Phytech's mobile app since 2022. It is built with React Native and Expo, uses MobX for state, react-native-maps for the field map, Bugsnag for crash reporting and Mixpanel for analytics. He ships many fixes as over-the-air updates. Beyond the hydraulic features, he added silent push notifications, deep links to the planner app, a hydraulic configuration flow on mobile, and Android and iOS layout fixes such as safe areas and keyboards.

## Translations at Phytech

In 2025 Eliyahu built the translations infrastructure for Phytech's web and mobile apps, and used it to ship the mobile app and the web app in Spanish. He handled the QA rounds of Spanish corrections and missing translations, and fixed layouts where longer translated text was cut off.

## Internal tools at Phytech

At Phytech, Eliyahu builds internal tools as well as grower-facing features. In 2023 he created the web app's internal package, with admin-only configuration routes and validation. In 2025 he created a users management package. In 2026 he added an internals area to the web app, with its own navigation and pages that open only for roles allowed to see them, such as a page for downloading internal app builds.

## Security and maintenance at Phytech

Eliyahu handles security maintenance for Phytech's code. He regularly resolves critical and high Dependabot alerts and code-scanning findings across the web, mobile, shared-package and server repositories, fixed a possible shell command injection in build scripts, and upgraded Node.js versions and server libraries. He also turned this work into Claude Code skills, so security alerts are triaged and fixed in one pull request per severity level.

## Product analytics at Phytech

Eliyahu adds Mixpanel analytics to the features he builds at Phytech, such as clicks on map components, hydraulic graphs and crop reference models, so the product team can see how growers use them. The team's Claude Code rules require analytics for new interactive features, with exceptions such as tooltips.

## Timeline at Phytech

Eliyahu's work at Phytech by year: in 2022 he built system monitoring in the mobile app. In 2023 he set up the web monorepo, the automated package publishing and GitHub Actions, and started on the Node.js API. In 2024 he built the hydraulic layer on web with its graphs and topology diagrams, and the shared packages monorepo. In 2025 he became a Senior Full Stack Engineer and built the irrigation planner forms, the totalizer, translations and graph comparison. In 2026 he built the planning kit, irrigation programs and recommendations, the reports module, the move from Nx to Yarn workspaces, the phytech-tooling Claude Code plugin, and multi-provider AI support in the Java AI worker.
