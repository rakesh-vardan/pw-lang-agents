// agent/src/drift-agent.ts
// Use Case 4: Cross-Environment Drift Detection
//
// The agent visits two URLs (e.g., staging vs production, or two versions
// of the same page) and compares their structure, content, and behavior.
// It identifies MEANINGFUL differences — not just any diff, but changes
// that could indicate regressions or environment misconfigurations.
//
// This requires LLM reasoning because:
// - A pure diff would flag every dynamic timestamp and session ID
// - The LLM understands which differences are significant (missing products,
//   changed navigation, broken layout) vs. noise (different ad banners)

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
  const getArg = (name: string, fallback: string) => {
    const idx = process.argv.indexOf(name);
    return idx !== -1 ? process.argv[idx + 1] : fallback;
  };

  // Two URLs to compare — defaults showcase comparing home page vs. a category page,
  // simulating what it looks like when "staging" has a different product catalog
  const urlA = getArg(
    "--url-a",
    "https://ecommerce-playground.lambdatest.io/"
  );
  const urlB = getArg(
    "--url-b",
    "https://ecommerce-playground.lambdatest.io/index.php?route=product/category&path=18"
  );
  const labelA = getArg("--label-a", "Homepage (Baseline)");
  const labelB = getArg("--label-b", "Laptops Category Page (Comparison)");

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
        "You are a cross-environment drift detection specialist.",
        "Your job is to visit two URLs, capture detailed snapshots of each,",
        "and produce an intelligent comparison that highlights MEANINGFUL differences.",
        "",
        "What counts as meaningful drift:",
        "- Missing or extra navigation items",
        "- Different product counts or product names",
        "- Layout structure changes (e.g., missing sections, reordered elements)",
        "- Broken or missing interactive elements (search, buttons, forms)",
        "- Different page titles or headings",
        "- Missing images or broken links",
        "",
        "What to IGNORE (noise):",
        "- Dynamic timestamps, session IDs, CSRF tokens",
        "- Ad banner changes, promotional content rotation",
        "- Minor text differences in dynamic content (e.g., 'showing 1-20 of 382')",
        "",
        "Rules:",
        "1) Visit URL A first — snapshot and count links.",
        "2) Visit URL B next — snapshot and count links.",
        "3) Compare the two observations intelligently.",
        "4) Classify each difference as: REGRESSION, EXPECTED_DIFFERENCE, or NOISE.",
        "5) Write the drift report to reports/drift-report.md.",
      ].join("\n"),
    });

    const task = [
      "Perform cross-environment drift detection between these two endpoints:",
      "",
      `**Environment A** (${labelA}): ${urlA}`,
      `**Environment B** (${labelB}): ${urlB}`,
      "",
      "For each environment:",
      "1) Navigate to the URL and take a snapshot.",
      "2) Count the links on the page.",
      "3) Note the page title, main headings, navigation items, and key content areas.",
      "",
      "Then compare A and B and write a drift report to reports/drift-report.md with:",
      "- **Environment Summary**: key facts about each environment",
      "- **Drift Analysis**: each meaningful difference with classification",
      "- **Risk Assessment**: whether the differences suggest a problem",
      "- **Recommendation**: what a QA team should investigate",
    ].join("\n");

    console.log("🔀 Starting Drift Detection Agent...\n");
    console.log(`  A: ${labelA} → ${urlA}`);
    console.log(`  B: ${labelB} → ${urlB}\n`);

    const result = await agent.invoke(
      { messages: [{ role: "user", content: task }] },
      { recursionLimit: 15 }
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
  console.error("Drift detection agent error:", err);
  process.exit(1);
});
