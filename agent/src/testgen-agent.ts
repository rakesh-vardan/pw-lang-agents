// agent/src/testgen-agent.ts
// Use Case 3: Natural-Language to Playwright Test Generation
//
// Give the agent a requirement in plain English. It explores the real UI
// to discover actual selectors, page structure, and behavior — then
// generates working Playwright test code from what it observed.
//
// This is NOT template-based code generation. The LLM reasons about:
// - Which elements exist on the real page
// - What selectors will be stable (role-based preferred)
// - What assertions are meaningful for the requirement
// - Edge cases to cover

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
  const defaultRequirement = [
    "Users should be able to search for a product by name,",
    "see search results with product thumbnails,",
    "and add a product to the shopping cart from the results page.",
  ].join(" ");

  const requirement =
    process.argv.includes("--requirement")
      ? process.argv
          .slice(process.argv.indexOf("--requirement") + 1)
          .join(" ")
      : defaultRequirement;

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
        "You are a Playwright test generation specialist.",
        "You have access to a real browser. Your job is to:",
        "1) Read the user requirement.",
        "2) Explore the REAL application to discover the actual UI elements.",
        "3) Generate working Playwright test code based on what you observed.",
        "",
        "Test code rules:",
        '- Use `import { test, expect } from "@playwright/test"`.',
        "- Use role-based selectors when available (getByRole, getByText, getByLabel).",
        "- Include meaningful assertions that verify the requirement is met.",
        "- Add comments explaining what each section tests.",
        "- Include at least one positive test and one edge case.",
        "- Use `const BASE_URL = process.env.BASE_URL || '<actual-url>'` pattern.",
        "",
        "BE EFFICIENT with tool calls:",
        "- Take ONE snapshot to understand the page structure.",
        "- Perform the minimum actions needed to discover selectors.",
        "- Then IMMEDIATELY write the test file. Do not over-explore.",
        "- You have a limited budget of tool calls. Prioritize writing the test file.",
        "",
        "IMPORTANT: Only use selectors you actually found on the page.",
        "Never invent selectors. If an element doesn't exist, say so.",
      ].join("\n"),
    });

    const task = [
      `USER REQUIREMENT: ${requirement}`,
      "",
      `APPLICATION URL: ${url}`,
      "",
      "Steps (be efficient — minimize tool calls):",
      "1) Navigate to the application and take a snapshot to understand the page.",
      "2) Try the main user flow briefly to discover the key selectors.",
      "3) Generate a complete Playwright test file and write it to tests/generated.spec.ts.",
      "4) Provide a brief summary of what you generated.",
    ].join("\n");

    console.log("🧪 Starting Test Generation Agent...\n");
    console.log(`Requirement: ${requirement}\n`);

    const result = await agent.invoke(
      { messages: [{ role: "user", content: task }] },
      { recursionLimit: 30 }
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
  console.error("Test generation agent error:", err);
  process.exit(1);
});
