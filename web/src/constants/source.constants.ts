import type { Lang } from "#/types/i18n.types";
import type { SourceCopy } from "#/types/source.types";

// The public knowledge files (ADR 0018); a source links to its passage's heading there.
export const GITHUB_KNOWLEDGE_URL =
  "https://github.com/elik56a/portfolio-chat/blob/main/data/knowledge/";

export const SOURCE_COPY: Record<Lang, SourceCopy> = {
  en: { opens: " (opens on GitHub)", open: "Click to open on GitHub ↗" },
  he: { opens: " (נפתח ב-GitHub)", open: "לחצו לפתיחה ב-GitHub ↗" },
};
