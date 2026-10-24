import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { CHAT_COPY } from "#/constants/chat.constants";
import { LANG_DIR, LANG_STORAGE_KEY } from "#/constants/i18n.constants";
import { PREDIVE_COPY } from "#/constants/predive.constants";
import { DIVE_COPY } from "#/constants/sea.constants";
import type { Lang } from "#/types/i18n.types";

// The captured stream of the offline test model: the page plays a real dive, no API or model is called.
const STREAM = readFileSync(
  new URL("../fixtures/chat-stream.sse", import.meta.url),
  "utf8",
);
const ANSWER = "offline test model";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
// SESSION_STORAGE_KEY; its module reads import.meta.env, which only exists under Vite.
const SESSION_STORAGE_KEY = "portfolio-chat:session";
const SESSION_TTL_MS = 3_600_000;
const HYDRATE_MS = 60_000;
const SEABED_MS = 30_000;
const DESCEND_MS = 5_000;

async function open(page: Page, lang: Lang) {
  await page.addInitScript(
    ({ lang, langKey, sessionKey, expiresAt }) => {
      localStorage.setItem(langKey, JSON.stringify(lang));
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({ token: "e2e", expiresAt }),
      );
    },
    {
      lang,
      langKey: LANG_STORAGE_KEY,
      sessionKey: SESSION_STORAGE_KEY,
      expiresAt: Date.now() + SESSION_TTL_MS,
    },
  );
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: STREAM,
    }),
  );
  await page.goto("/");
  // Hydrated: the stored language is applied and the hero has published where it ends.
  await page.waitForFunction(
    (dir) =>
      document.documentElement.dir === dir &&
      getComputedStyle(document.documentElement).getPropertyValue(
        "--hero-end",
      ) !== "",
    LANG_DIR[lang],
    { timeout: HYDRATE_MS },
  );
}

async function expectAccessible(page: Page, state: string) {
  // Words and ticks fade in; contrast is judged once every one-off animation has finished.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.effect?.getTiming().iterations === Number.POSITIVE_INFINITY,
      ),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG)
    .analyze();
  const found = violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(found, `axe at ${state}`).toEqual([]);
}

async function ask(page: Page, lang: Lang) {
  const input = page.getByRole("textbox", { name: CHAT_COPY[lang].inputLabel });
  await input.fill(CHAT_COPY[lang].suggestions[1]);
  await input.press("Enter");
}

for (const lang of ["en", "he"] as const) {
  const chat = CHAT_COPY[lang];
  const dive = DIVE_COPY[lang];

  test.describe(lang, () => {
    test("the surface is accessible and fits", async ({ page }) => {
      await open(page, lang);
      await expectAccessible(page, "surface");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBe(0);
    });

    test("the pre-dive check is accessible", async ({ page }) => {
      await open(page, lang);
      await ask(page, lang);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectAccessible(page, "veil");
    });

    test("Escape cancels the dive", async ({ page }) => {
      await open(page, lang);
      await ask(page, lang);
      const veil = page.getByRole("dialog");
      await expect(veil).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(veil).toBeHidden();
      await expect(
        page.getByRole("textbox", { name: chat.inputLabel }),
      ).toBeVisible();
    });

    test("a dive: pace controls, seabed and the chat states", async ({
      page,
    }) => {
      await open(page, lang);
      await ask(page, lang);
      // The veil descends by itself after its countdown, so the click may find it gone.
      await page
        .getByRole("dialog")
        .getByRole("button", { name: PREDIVE_COPY[lang].descend })
        .click({ timeout: DESCEND_MS })
        .catch(() => {});

      const playback = page.getByRole("region", { name: dive.playback.label });
      await expect(playback).toBeVisible();
      await playback.getByRole("button", { name: dive.playback.pause }).click();
      await expect(
        playback.getByRole("button", { name: dive.playback.resume }),
      ).toBeVisible();
      await expectAccessible(page, "dive");

      await page.mouse.wheel(0, -400);
      await expect(
        page.getByRole("button", { name: dive.follow }),
      ).toBeVisible();

      await playback.getByRole("button", { name: dive.playback.skip }).click();
      await expect(page.getByText(ANSWER)).toBeVisible({ timeout: SEABED_MS });
      const console = page.locator("[data-console]");
      await expect(console).toHaveAttribute("data-chat", "full");
      await expectAccessible(page, "seabed");

      await page.getByRole("button", { name: chat.menu }).click();
      await page.getByRole("menuitem", { name: chat.reread }).click();
      await expect(console).toHaveAttribute("data-chat", "pill");
      await page.getByRole("button", { name: chat.openChat }).click();
      await expect(console).toHaveAttribute("data-chat", "side");
      await page.getByRole("button", { name: chat.seabed }).click();
      await expect(console).toHaveAttribute("data-chat", "full");

      await console.getByRole("button", { name: chat.surface }).click();
      await expect(page.locator("html")).not.toHaveAttribute("data-diving", {
        timeout: SEABED_MS,
      });
      await expect(page.getByText(ANSWER)).toBeVisible();
    });
  });
}
