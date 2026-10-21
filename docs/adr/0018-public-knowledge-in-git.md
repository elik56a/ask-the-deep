# 0018. Public knowledge files are in git; private ones stay local

Date: 2026-10-21 · Status: accepted · Supersedes the git part of 0004

## Context

ADR 0004 kept all of `data/knowledge/` out of git, so drafts and edit history of personal content would not be public. Since then:

- The repo is meant to be shown (LinkedIn), and a clone without the knowledge files gives an agent that knows nothing.
- The golden eval set (`api/evals/golden.yaml`) already quotes facts from the public files and names their passage ids.
- Evals on every PR (P4.3) need the files in CI.

Everything in a `visibility: public` file is already served to any visitor who asks the agent.

## Decision

- The public knowledge files are committed. Only private files are git-ignored, by name (`data/knowledge/faq.md` today). A new private file must be added to `.gitignore` before its first commit.
- CI ingests the committed files into its own throwaway Postgres to run the evals.
- Publishing to the live database stays a manual, local command (ADR 0004).

## Consequences

- Edits to public files are public history from now on. Draft privately, commit when it's ready to be said on the site.
- The repo runs end to end after `git clone`, Docker and a Google API key.
- CI needs one secret for evals: `GOOGLE_API_KEY`.
