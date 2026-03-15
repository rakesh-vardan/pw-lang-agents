// agent/src/browser-agent.ts

import "dotenv/config";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import {
  closeBrowserCtx,
  createBrowserCtx,
  buildPlaywrightTools,
} from "./tools/playwright-tools.js";

// ---------------------------------------------------------------------------
// CLI argument parser (simple, no external dependency)
// ---------------------------------------------------------------------------

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const url = getArg(
    "--url",
    "https://ecommerce-playground.lambdatest.io/"
  )!;
  const headless = getArg("--headed") !== "true"; // default: headless
  const allowedHosts = (
    getArg("--allow", "ecommerce-playground.lambdatest.io") ??
    "ecommerce-playground.lambdatest.io"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // --- LLM setup ---
  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0, // deterministic for QA work
    apiKey: process.env.OPENAI_API_KEY,
  });

  // --- Browser setup ---
  const ctx = await createBrowserCtx(headless);

  try {
    const tools = buildPlaywrightTools(ctx, allowedHosts);

    // --- Create the agent ---
    // createAgent() from LangChain builds a graph-based ReAct agent
    // powered by LangGraph. No separate AgentExecutor needed.

    const agent = createAgent({
      model,
      tools,
      systemPrompt: [
        "You are a careful QA automation agent.",
        "You can use tools to drive a real browser and extract facts from web pages.",
        "",
        "Rules:",
        "1) Only visit allowlisted hosts.",
        "2) Keep your actions minimal and deterministic.",
        "3) Prefer stable selectors (role-based when possible).",
        "4) When you are done, return a QA report in JSON format.",
        "5) Never guess — always take a snapshot first if you are unsure what is on the page.",
      ].join("\n"),
    });

    // --- Define the task ---
    const task = [
      `Visit ${url}.`,
      "1) Take a snapshot of the page.",
      "2) Count the links on the page.",
      "3) Return a JSON QA report with these fields:",
      '   - "url" (string)',
      '   - "title" (string)',
      '   - "headings" (array of strings — extract from snapshot text)',
      '   - "linkCount" (number)',
      '   - "notes" (array of strings — anything interesting you noticed)',
    ].join("\n");

    // --- Run the agent ---
    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: task }],
      },
      {
        // Limit the ReAct loop to prevent runaway iterations
        recursionLimit: 25,
      }
    );

    // The final message from the agent contains the QA report
    const lastMessage = result.messages.at(-1);
    console.log("\n--- QA Report ---\n");
    console.log(lastMessage?.content ?? "No output produced.");
  } finally {
    await closeBrowserCtx(ctx);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
