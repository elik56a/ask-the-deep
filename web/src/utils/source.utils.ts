import { GITHUB_KNOWLEDGE_URL } from "#/constants/source.constants";
import type { Citation } from "#/generated/events.gen";

/**
 * GitHub's heading anchor: lowercased, punctuation dropped, each space a hyphen. The passage id's
 * own slug differs ("CI/CD" → `ci-cd`, GitHub `cicd`), so links are built from the heading.
 */
export function githubAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

/** The passage on GitHub: its file, at the heading its breadcrumb ends with. */
export function sourceUrl(citation: Citation): string {
  const heading = citation.breadcrumb.split(" › ").at(-1) ?? "";
  return `${GITHUB_KNOWLEDGE_URL}${citation.source}#${githubAnchor(heading)}`;
}
