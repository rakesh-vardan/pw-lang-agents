// agent/src/tools/playwright-tools.ts

import { chromium, Browser, Page } from "playwright";
import { tool } from "langchain";
import * as z from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Browser context — a thin wrapper so we can pass the browser + page around
// ---------------------------------------------------------------------------

export type BrowserCtx = {
  browser: Browser;
  page: Page;
};

export async function createBrowserCtx(
  headless: boolean
): Promise<BrowserCtx> {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  page.setDefaultTimeout(15_000);
  return { browser, page };
}

export async function closeBrowserCtx(ctx: BrowserCtx) {
  await ctx.page.close().catch(() => {});
  await ctx.browser.close().catch(() => {});
}

// ---------------------------------------------------------------------------
// Tool factory — takes a live browser context + allowlist, returns tools
// ---------------------------------------------------------------------------

export function buildPlaywrightTools(
  ctx: BrowserCtx,
  allowedHosts: string[]
) {
  // --- Helper: block navigation to hosts not on the allowlist ---
  const assertAllowedUrl = (rawUrl: string) => {
    const url = new URL(rawUrl);
    const hostOk = allowedHosts.some(
      (h) => h === url.host || url.host.endsWith(`.${h}`)
    );
    if (!hostOk) {
      throw new Error(
        `Blocked by allowlist. Host "${url.host}" is not in: ${allowedHosts.join(", ")}`
      );
    }
  };

  // --- Tool: goto ---
  const goto = tool(
    async ({ url }: { url: string }) => {
      assertAllowedUrl(url);
      await ctx.page.goto(url, { waitUntil: "domcontentloaded" });
      return `Navigated to ${url}`;
    },
    {
      name: "goto",
      description:
        "Navigate the browser to a URL. The URL must be on the allowlist.",
      schema: z.object({
        url: z.string().url().describe("The full URL to navigate to"),
      }),
    }
  );

  // --- Tool: click ---
  const click = tool(
    async ({ selector }: { selector: string }) => {
      await ctx.page.click(selector);
      return `Clicked "${selector}"`;
    },
    {
      name: "click",
      description:
        "Click an element using a Playwright selector. Prefer role-based selectors (e.g. role=button[name='Submit']).",
      schema: z.object({
        selector: z
          .string()
          .min(1)
          .describe("Playwright selector for the element to click"),
      }),
    }
  );

  // --- Tool: type_text ---
  const typeText = tool(
    async ({ selector, text }: { selector: string; text: string }) => {
      await ctx.page.fill(selector, text);
      return `Filled "${selector}" with ${text.length} characters`;
    },
    {
      name: "type_text",
      description: "Fill an input field with text using a Playwright selector.",
      schema: z.object({
        selector: z
          .string()
          .min(1)
          .describe("Playwright selector for the input"),
        text: z.string().describe("Text to type into the input"),
      }),
    }
  );

  // --- Tool: snapshot ---
  const snapshot = tool(
    async () => {
      const title = await ctx.page.title().catch(() => "");
      const url = ctx.page.url();
      const bodyText = await ctx.page
        .locator("body")
        .innerText()
        .catch(() => "");
      // Trim the snapshot so it doesn't blow up the LLM context
      const trimmed = bodyText.slice(0, 4_000);
      return JSON.stringify({ url, title, bodyText: trimmed }, null, 2);
    },
    {
      name: "snapshot",
      description:
        "Return a JSON snapshot of the current page: url, title, and trimmed body text (max 4000 chars).",
      schema: z.object({}),
    }
  );

  // --- Tool: count_links ---
  const countLinks = tool(
    async () => {
      const count = await ctx.page.locator("a").count();
      return `Link count: ${count}`;
    },
    {
      name: "count_links",
      description: "Count how many <a> links exist on the current page.",
      schema: z.object({}),
    }
  );

  // --- Tool: screenshot ---
  const screenshot = tool(
    async ({ name }: { name: string }) => {
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const dir = path.resolve(process.cwd(), "..", "reports", "screenshots");
      await fs.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, `${safeName}.png`);
      await ctx.page.screenshot({ path: filePath, fullPage: true });
      return JSON.stringify({ saved: filePath, name: safeName });
    },
    {
      name: "screenshot",
      description:
        "Take a full-page screenshot and save it to reports/screenshots/<name>.png. Returns the file path.",
      schema: z.object({
        name: z
          .string()
          .min(1)
          .describe("A short descriptive name for the screenshot (e.g. 'homepage-before')"),
      }),
    }
  );

  // --- Tool: accessibility_snapshot ---
  const accessibilitySnapshot = tool(
    async () => {
      const tree = await ctx.page.locator("body").ariaSnapshot();
      // Trim to keep LLM context manageable
      return tree.slice(0, 8_000);
    },
    {
      name: "accessibility_snapshot",
      description:
        "Capture the ARIA accessibility tree of the current page. Returns a text representation of roles, names, and structure (trimmed to 8000 chars).",
      schema: z.object({}),
    }
  );

  return [goto, click, typeText, snapshot, countLinks, screenshot, accessibilitySnapshot];
}
