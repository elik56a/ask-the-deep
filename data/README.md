# data

The agent's knowledge base: plain markdown that the agent is allowed to answer from, and nothing else. If a fact isn't here, the agent says "I don't have that information".

For how it's searched, see [The RAG pipeline](../README.md#the-rag-pipeline) in the root README.

## Layout

```
knowledge/
  profile.md        who Eliyahu is, career path, approach, current focus
  boundaries.md     topics the agent won't discuss, and where to send those questions
  experience/       one file per role: phytech, 019-mobile, givers, idf-lotem
  projects/         one file per project: portfolio-chat, devconverter
  skills/           overview.md
```

## File format

```markdown
---
title: Phytech (פייטק)
type: experience          # profile | boundaries | experience | project | skills
company: Phytech          # any extra fields become passage metadata
start: 2022
end: present
language: en
visibility: public        # only public files are ever read
---

# Phytech

## Roles at Phytech

One self-contained section. This becomes one passage.
```

- **`visibility: public` is required.** Any other value, or none, and the file is skipped.
- **Each `##` section is one passage**: the unit that gets embedded, searched and cited. Write each one so it makes sense on its own, and name the subject in it ("Eliyahu cut asset latency by 40%", not "He cut it by 40%"). Sections over 400 tokens are split ([ADR 0003](../docs/adr/0003-passage-size.md)).
- **The passage id** is `<path>#<heading-slug>`, e.g. `experience/phytech.md#roles-at-phytech`. Citations and the eval sets refer to these ids, so renaming a heading changes its id. Update `api/evals/*.yaml` when you do.
- **The breadcrumb** (`title › heading`) is embedded with the text, so a section keeps its context.
- **Project files** carry `role`, `technologies` and a link; `list_projects` reads them from the front matter.

## Public and private

Public files are committed. Private files stay on your machine and are git-ignored by name. Add a new private file to `.gitignore` **before** its first commit ([ADR 0018](../docs/adr/0018-public-knowledge-in-git.md)).

## Publishing a change

```sh
cd api
uv run --env-file .env python -m app.rag.ingest      # embeds only changed passages
uv run --env-file .env python -m app.rag.recall      # retrieval still finds the right passages?
uv run --env-file .env python -m app.evals.run       # answers still correct?
```

A change to the corpus comes with an eval run. CI runs the evals on every change under `data/knowledge/`, against its own throwaway database. Ingesting into the live database is always a deliberate local command, never part of a deploy ([ADR 0004](../docs/adr/0004-local-knowledge-base.md)).
