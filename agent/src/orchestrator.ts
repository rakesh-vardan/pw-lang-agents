// agent/src/orchestrator.ts

import "dotenv/config";
import path from "node:path";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { buildCliTools } from "./tools/cli-tools.js";
import { buildFsTools } from "./tools/fs-tools.js";

// ---------------------------------------------------------------------------
// CLI argument parser
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
  const grep = getArg("--grep", "") ?? "";
  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Repo root is one level up from agent/
  const repoRoot = path.resolve(process.cwd(), "..");

  // --- LLM setup ---
  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });

  // --- Collect all tools ---
  const tools = [...buildCliTools(repoRoot), ...buildFsTools(repoRoot)];

  // --- Create the orchestrator agent ---
  const agent = createAgent({
    model,
    tools,
    systemPrompt: [
      "You are a principal test engineering assistant.",
      "Your job is to run Playwright tests, analyze the JSON report, and write a clear Markdown summary.",
      "",
      "Rules:",
      "1) Do NOT invent results. Only summarize what the JSON report actually says.",
      "2) If the test run fails (non-zero exit code), still produce a summary with the failures and suggested next steps.",
      "3) Always write the summary to reports/latest.md.",
      "4) Use simple, clear English. No jargon unless it adds clarity.",
      "5) Include pass/fail counts, the names of failed tests, error excerpts, and notes.",
    ].join("\n"),
  });

  // --- Define the task ---
  const task = [
    grep
      ? `Run Playwright tests filtered by grep pattern "${grep}".`
      : "Run the full Playwright test suite.",
    "",
    "After the tests finish:",
    "1) Read the file reports/pw-report.json.",
    "2) Analyze the results.",
    "3) Write a Markdown report to reports/latest.md with these sections:",
    "   - **Summary**: total tests, passed, failed, skipped",
    "   - **Failed Tests**: for each failure, show the test name, file, and a short error excerpt",
    "   - **Notes**: observations and what to check next",
    "4) Print a brief summary to the console.",
  ].join("\n");

  // --- Run the agent ---
  const result = await agent.invoke(
    {
      messages: [{ role: "user", content: task }],
    },
    {
      recursionLimit: 20,
    }
  );

  const lastMessage = result.messages.at(-1);
  console.log("\n--- Orchestrator Summary ---\n");
  console.log(lastMessage?.content ?? "No output produced.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
