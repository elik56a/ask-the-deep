import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { GITHUB_KNOWLEDGE_URL } from "#/constants/source.constants";
import { githubAnchor, sourceUrl } from "#/utils/source.utils";
import { GITHUB_ANCHORS } from "../fixtures/githubAnchors";

const ROOT = new URL("../../../data/knowledge/", import.meta.url);

// The passages the API ingests: `## ` sections of the files marked public (api/app/rag/corpus.py).
function publicPassages() {
  return readdirSync(ROOT, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".md"))
    .flatMap((file) => {
      const raw = readFileSync(new URL(file, ROOT), "utf8");
      const front = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      if (!/^visibility: public$/m.test(front)) return [];
      const title = front.match(/^title: "?(.+?)"?$/m)?.[1] ?? file;
      return [...raw.matchAll(/^## +(.+)$/gm)].map(([, heading]) => ({
        chunk_id: `${file}#passage`,
        source: file,
        breadcrumb: `${title} › ${heading.trim()}`,
        excerpt: "",
      }));
    });
}

it("links every public passage to a heading anchor GitHub really renders", () => {
  const passages = publicPassages();
  expect(passages.length).toBeGreaterThan(0);
  for (const passage of passages) {
    const [page, anchor] = sourceUrl(passage).split("#");
    expect(page).toBe(`${GITHUB_KNOWLEDGE_URL}${passage.source}`);
    expect(GITHUB_ANCHORS[passage.source]).toContain(anchor);
  }
});

it("drops punctuation the way GitHub does, keeping each space", () => {
  expect(githubAnchor("What DevConverter.dev is")).toBe(
    "what-devconverterdev-is",
  );
  expect(githubAnchor("CI/CD and delivery")).toBe("cicd-and-delivery");
  expect(githubAnchor("IDF Lotem / Shahar unit")).toBe(
    "idf-lotem--shahar-unit",
  );
  expect(githubAnchor("What's next?")).toBe("whats-next");
});
