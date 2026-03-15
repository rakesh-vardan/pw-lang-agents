// agent/src/a11y-agent.ts
// Pattern 6: Accessibility Audit Agent
//
// Uses Playwright's built-in accessibility tree (page.accessibility.snapshot())
// to capture the ARIA structure, then has the LLM reason about WCAG compliance,
// user impact, and prioritized fixes.
//
// A linting tool flags violations by rule ID.
// This agent explains the USER IMPACT: "a screen reader user cannot
// distinguish between these three buttons because they all have the
// same accessible name."

import "dotenv/config";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import {
  closeBrowserCtx,
  createBrowserCtx,
  buildPlaywrightTools,
} from "./tools/playwright-tools.js";
import { buildFsTools } from "./tools/fs-tools.js";
import path from "node:path";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const url =
    process.argv.includes("--url")
      ? process.argv[process.argv.indexOf("--url") + 1]
      : "https://ecommerce-playground.lambdatest.io/";

  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const repoRoot = path.resolve(process.cwd(), "..");

  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const ctx = await createBrowserCtx(true);

  try {
    const tools = [
      ...buildPlaywrightTools(ctx, [
        "ecommerce-playground.lambdatest.io",
      ]),
      ...buildFsTools(repoRoot),
    ];

    const agent = createAgent({
      model,
      tools,
      systemPrompt: [
        "You are a web accessibility audit specialist with deep knowledge of WCAG 2.1 guidelines.",
        "You have access to a real browser with tools to capture the accessibility tree,",
        "take snapshots, navigate, and write reports.",
        "",
        "Your audit process:",
        "1) Navigate to the target URL.",
        "2) Take a snapshot to understand the visual layout.",
        "3) Capture the accessibility tree using the accessibility_snapshot tool.",
        "4) Analyze the tree for WCAG violations and usability issues.",
        "5) Navigate to 1-2 additional pages (e.g. search results, product page)",
        "   and repeat the accessibility check.",
        "6) Write your findings to reports/a11y-report.md.",
        "",
        "What to look for:",
        "- Images without alt text (WCAG 1.1.1)",
        "- Form inputs without labels or accessible names (WCAG 1.3.1, 4.1.2)",
        "- Duplicate or generic accessible names (e.g. multiple 'Click here' links)",
        "- Missing heading hierarchy (skipped heading levels)",
        "- Interactive elements without accessible roles",
        "- Missing landmark regions (main, nav, footer)",
        "- Low-contrast text indicators (if names suggest color-only information)",
        "",
        "For each finding:",
        "- State the WCAG criterion violated",
        "- Explain the USER IMPACT (how it affects real people using assistive tech)",
        "- Suggest a concrete fix",
        "- Rate severity: CRITICAL, MAJOR, MINOR",
        "",
        "Be efficient — use no more than 12 tool calls total.",
      ].join("\n"),
    });

    const task = [
      `Navigate to ${url} and perform an accessibility audit.`,
      "",
      "Audit at least 2 pages:",
      "1) The homepage",
      "2) A product search results or product detail page",
      "",
      "For each page:",
      "- Take a snapshot to see the layout",
      "- Capture the accessibility tree",
      "- Analyze for WCAG violations",
      "",
      "Write a structured report to reports/a11y-report.md with:",
      "- **Executive Summary**: overall accessibility posture",
      "- **Pages Audited**: which pages were checked",
      "- **Findings**: each finding with WCAG criterion, user impact, severity, fix",
      "- **Positive Observations**: things the site does well",
      "- **Priority Actions**: top 3-5 things to fix first",
    ].join("\n");

    console.log("♿ Starting Accessibility Audit Agent...\n");

    const result = await agent.invoke(
      { messages: [{ role: "user", content: task }] },
      { recursionLimit: 20 }
    );

    const lastMsg = result.messages[result.messages.length - 1];
    console.log("\n--- Agent final response ---");
    console.log(
      typeof lastMsg.content === "string"
        ? lastMsg.content
        : JSON.stringify(lastMsg.content, null, 2)
    );
  } finally {
    await closeBrowserCtx(ctx);
  }
}

main().catch((err) => {
  console.error("Accessibility audit agent error:", err);
  process.exit(1);
});
