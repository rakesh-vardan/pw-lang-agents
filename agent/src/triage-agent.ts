// agent/src/triage-agent.ts
// Use Case 1: Intelligent Failure Triage
//
// Runs the Playwright test suite, reads the JSON report, and uses LLM
// reasoning to classify each failure into a category (selector drift,
// assertion bug, timeout/flaky, stale reference) and suggest fixes.
//
// This is something a plain script CANNOT do — it requires understanding
// error messages, correlating selectors with failure patterns, and
// producing actionable recommendations.

import "dotenv/config";
import path from "node:path";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { buildCliTools } from "./tools/cli-tools.js";
import { buildFsTools } from "./tools/fs-tools.js";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const repoRoot = path.resolve(process.cwd(), "..");

  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const tools = [...buildCliTools(repoRoot), ...buildFsTools(repoRoot)];

  const agent = createAgent({
    model,
    tools,
    systemPrompt: [
      "You are a senior test failure triage specialist.",
      "Your job is to analyze Playwright test results and classify each failure",
      "into a root-cause category, then suggest concrete fixes.",
      "",
      "Failure categories you should use:",
      "- SELECTOR_DRIFT: The selector no longer matches any element on the page.",
      "  Likely caused by a UI refactor. Fix: update the selector.",
      "- ASSERTION_BUG: The test assertion itself is wrong (expected value doesn't",
      "  match reality). Fix: correct the expected value or re-evaluate the requirement.",
      "- TIMEOUT_FLAKY: The test waited for an element or condition that didn't appear",
      "  within the timeout. Could be a missing element, slow load, or flaky behavior.",
      "  Fix: increase timeout, add waitFor, or confirm the element should exist.",
      "- STALE_REFERENCE: The test interacted with an element that became detached",
      "  after a navigation or DOM update. Fix: re-query the element after navigation.",
      "- ENVIRONMENT: The failure is caused by infra (network error, DNS, etc.).",
      "",
      "Rules:",
      "1) Read the FULL JSON report carefully. Do not guess.",
      "2) For each failed test, quote the exact error message.",
      "3) Assign exactly ONE category per failure.",
      "4) Explain your reasoning in 1-2 sentences.",
      "5) Suggest a concrete fix (new selector, corrected assertion, etc.).",
      "6) Rank failures by severity: P0 (blocks release), P1 (needs fix), P2 (low risk).",
      "7) Write the triage report to reports/triage-report.md.",
    ].join("\n"),
  });

  const task = [
    'Run Playwright tests filtered by grep pattern "FAIL|PASS.*control".',
    "This suite contains intentionally failing tests that simulate real-world failure patterns.",
    "",
    "After the tests finish:",
    "1) Read the JSON report at reports/pw-report.json.",
    "2) For each failed test, analyze the error message and classify it.",
    "3) Write a structured triage report to reports/triage-report.md with:",
    "   - **Summary**: total tests, passed, failed, by category",
    "   - **Triage Table**: test name | category | severity | error excerpt | suggested fix",
    "   - **Patterns Detected**: any cross-cutting observations",
    "   - **Recommended Actions**: prioritized list of what to fix first",
    "4) Print a brief summary to the console.",
  ].join("\n");

  console.log("🔍 Starting Failure Triage Agent...\n");

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
}

main().catch((err) => {
  console.error("Triage agent error:", err);
  process.exit(1);
});
