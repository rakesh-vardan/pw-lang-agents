// agent/src/explorer-agent.ts
// Use Case 2: Exploratory Testing with LLM-Driven Decisions
//
// The LLM drives a real browser and decides WHAT to test at each step
// based on what it observes. This is fundamentally unscriptable — a
// test script follows a fixed path, but this agent adapts its exploration
// based on live page state.

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
    temperature: 0.2, // slight creativity for exploration variety
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
        "You are an expert exploratory tester with a real browser at your disposal.",
        "Your job is to autonomously explore a web application, find issues, and",
        "produce a detailed exploratory test report.",
        "",
        "Exploration strategy:",
        "1) Start by taking a snapshot of the homepage to understand the layout.",
        "2) Identify key interactive areas: navigation, search, forms, buttons, links.",
        "3) For EACH area you find, decide what to test — you choose the path.",
        "4) Try edge cases: empty form submissions, special characters in search,",
        "   rapid clicks, navigating back after actions.",
        "5) After each action, take a snapshot to see what changed.",
        "6) Record every observation: what worked, what broke, what was unexpected.",
        "",
        "Rules:",
        "- Do NOT follow a fixed script. Make decisions based on what you see.",
        "- Test at least 3 different functional areas of the application.",
        "- Spend no more than 15 tool calls total to stay efficient.",
        "- When done, write your findings to reports/explorer-report.md.",
        "- Categorize findings as: BUG, USABILITY_ISSUE, OBSERVATION, or POSITIVE.",
        "- Include the exact steps you took so findings are reproducible.",
      ].join("\n"),
    });

    const task = [
      `Navigate to ${url} and perform exploratory testing.`,
      "",
      "Your goal is to find real issues that automated regression tests might miss.",
      "Think like a curious human tester — poke at corners, try unexpected inputs,",
      "and observe how the application behaves.",
      "",
      "After exploration, write a structured report to reports/explorer-report.md with:",
      "- **Areas Explored**: list of functional areas you tested",
      "- **Findings**: each finding with category, steps to reproduce, actual vs expected",
      "- **Risk Assessment**: overall quality impression and top risks",
    ].join("\n");

    console.log("🧭 Starting Exploratory Testing Agent...\n");

    const result = await agent.invoke(
      { messages: [{ role: "user", content: task }] },
      { recursionLimit: 25 }
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
  console.error("Explorer agent error:", err);
  process.exit(1);
});
