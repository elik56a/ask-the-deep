import { describe, expect, it } from "vitest";
import type { ToolCalled, ToolCompleted } from "#/lib/events.gen";
import { toolStepLabel } from "#/lib/toolSteps";

const called = (
  tool: string,
  args: Record<string, string> = {},
): ToolCalled => ({
  type: "tool.called",
  tool,
  args,
});

const completed = (
  tool: string,
  result_count: number,
  ok = true,
): ToolCompleted => ({
  type: "tool.completed",
  tool,
  ok,
  result_count,
  duration_ms: 5,
});

const TOOLS = [
  "search_knowledge",
  "list_projects",
  "get_project",
  "github_activity",
  "contact_info",
];

describe("toolStepLabel", () => {
  it("shows the search query while searching", () => {
    expect(
      toolStepLabel(called("search_knowledge", { query: "Phytech" }), "en"),
    ).toBe(`Searching Eliyahu's knowledge for "Phytech"…`);
    expect(
      toolStepLabel(called("search_knowledge", { query: "Phytech" }), "he"),
    ).toContain("Phytech");
  });

  it("counts results when done, with singular and plural", () => {
    expect(toolStepLabel(completed("search_knowledge", 3), "en")).toBe(
      "Found 3 relevant passages",
    );
    expect(toolStepLabel(completed("search_knowledge", 1), "en")).toBe(
      "Found 1 relevant passage",
    );
    expect(toolStepLabel(completed("search_knowledge", 0), "he")).toBe(
      "לא נמצא מידע רלוונטי",
    );
  });

  it("says GitHub is unavailable when the call failed", () => {
    expect(toolStepLabel(completed("github_activity", 0, false), "en")).toBe(
      "GitHub is unavailable right now",
    );
  });

  it("has a friendly label for every tool in both languages", () => {
    for (const lang of ["en", "he"] as const) {
      for (const tool of TOOLS) {
        expect(
          toolStepLabel(called(tool, { query: "q", name: "n" }), lang),
        ).not.toMatch(/Working|עובד על זה/);
        expect(toolStepLabel(completed(tool, 2), lang)).not.toMatch(
          /^(Done|הסתיים)$/,
        );
      }
    }
  });

  it("falls back to a generic label for an unknown tool", () => {
    expect(toolStepLabel(called("new_tool"), "en")).toBe("Working…");
    expect(toolStepLabel(completed("new_tool", 1), "he")).toBe("הסתיים");
  });
});
