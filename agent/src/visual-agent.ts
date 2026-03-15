// agent/src/visual-agent.ts
// Pattern 5: Visual Regression Narrator
//
// Takes screenshots of two pages (or two states of the same page) and uses
// a vision-capable LLM to describe WHAT changed visually in plain English.
//
// A pixel-diff tool says "247 pixels changed at (340, 120)."
// This agent says "the checkout button moved below the fold and the
// hero banner is missing."

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
import { promises as fs } from "node:fs";
import { HumanMessage } from "@langchain/core/messages";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const getArg = (name: string, fallback: string) => {
    const idx = process.argv.indexOf(name);
    return idx !== -1 ? process.argv[idx + 1] : fallback;
  };

  const urlA = getArg(
    "--url-a",
    "https://ecommerce-playground.lambdatest.io/"
  );
  const urlB = getArg(
    "--url-b",
    "https://ecommerce-playground.lambdatest.io/index.php?route=product/category&path=18"
  );
  const labelA = getArg("--label-a", "Homepage");
  const labelB = getArg("--label-b", "Laptops Category");

  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const repoRoot = path.resolve(process.cwd(), "..");

  // --- Step 1: Capture screenshots using Playwright ---
  console.log("📸 Capturing screenshots...\n");

  const ctx = await createBrowserCtx(true);
  const screenshotDir = path.resolve(repoRoot, "reports", "screenshots");
  await fs.mkdir(screenshotDir, { recursive: true });

  const pathA = path.join(screenshotDir, "visual-a.png");
  const pathB = path.join(screenshotDir, "visual-b.png");

  try {
    await ctx.page.goto(urlA, { waitUntil: "networkidle" });
    await ctx.page.screenshot({ path: pathA, fullPage: true });
    console.log(`  A: ${labelA} → ${pathA}`);

    await ctx.page.goto(urlB, { waitUntil: "networkidle" });
    await ctx.page.screenshot({ path: pathB, fullPage: true });
    console.log(`  B: ${labelB} → ${pathB}`);
  } finally {
    await closeBrowserCtx(ctx);
  }

  // --- Step 2: Send both screenshots to a vision-capable LLM ---
  console.log("\n🧠 Analyzing visual differences...\n");

  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const imageA = await fs.readFile(pathA);
  const imageB = await fs.readFile(pathB);

  const response = await model.invoke([
    new HumanMessage({
      content: [
        {
          type: "text",
          text: [
            "You are a visual regression testing specialist.",
            "I am showing you two screenshots of a web application.",
            "",
            `**Screenshot A** is "${labelA}" (${urlA}).`,
            `**Screenshot B** is "${labelB}" (${urlB}).`,
            "",
            "Compare them and produce a structured visual regression report:",
            "",
            "1) **Layout Changes**: Describe any structural differences —",
            "   missing sections, reordered elements, changed grid layouts.",
            "2) **Content Changes**: Different text, images, product counts,",
            "   or headings.",
            "3) **Navigation Changes**: Missing or added nav items, changed",
            "   menu structure.",
            "4) **Visual Anomalies**: Broken layouts, overlapping elements,",
            "   missing images, alignment issues.",
            "5) **Severity Assessment**: Rate each finding as CRITICAL,",
            "   MODERATE, or LOW.",
            "",
            "Focus on differences that matter to a QA team.",
            "Ignore expected dynamic content (ad banners, timestamps).",
            "Be specific — reference the area of the page (header, hero,",
            "sidebar, footer, etc.).",
          ].join("\n"),
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageA.toString("base64")}`,
            detail: "high",
          },
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageB.toString("base64")}`,
            detail: "high",
          },
        },
      ],
    }),
  ]);

  const report = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content, null, 2);

  // --- Step 3: Write the report ---
  const reportContent = [
    "# Visual Regression Report",
    "",
    `**Environment A**: ${labelA} — ${urlA}`,
    `**Environment B**: ${labelB} — ${urlB}`,
    "",
    `Screenshots: \`reports/screenshots/visual-a.png\`, \`reports/screenshots/visual-b.png\``,
    "",
    "---",
    "",
    report,
  ].join("\n");

  const reportPath = path.resolve(repoRoot, "reports", "visual-report.md");
  await fs.writeFile(reportPath, reportContent, "utf-8");

  console.log("--- Visual Regression Report ---");
  console.log(report);
  console.log(`\n✅ Report saved to reports/visual-report.md`);
}

main().catch((err) => {
  console.error("Visual regression agent error:", err);
  process.exit(1);
});
