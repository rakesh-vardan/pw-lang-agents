// agent/src/tools/cli-tools.ts

import { tool } from "langchain";
import * as z from "zod";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Helper: run a shell command and capture output
// ---------------------------------------------------------------------------

function runCmd(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: process.platform === "win32",
    });

    let output = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new Error(
          `Command timed out after ${timeoutMs}ms: ${cmd} ${args.join(" ")}`
        )
      );
    }, timeoutMs);

    child.stdout.on("data", (d: Buffer) => (output += d.toString()));
    child.stderr.on("data", (d: Buffer) => (output += d.toString()));

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, output });
    });
  });
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function buildCliTools(repoRoot: string) {
  // --- Tool: run_playwright_tests ---
  const runPlaywrightTests = tool(
    async ({ grep }: { grep?: string }) => {
      const args = ["playwright", "test"];
      if (grep?.trim()) {
        args.push("-g", grep.trim());
      }
      // 15-minute timeout is generous for most suites
      const result = await runCmd("npx", args, repoRoot, 15 * 60_000);
      // Truncate very long outputs so they don't flood the LLM context
      const trimmedOutput = result.output.slice(0, 8_000);
      return JSON.stringify(
        { exitCode: result.exitCode, output: trimmedOutput },
        null,
        2
      );
    },
    {
      name: "run_playwright_tests",
      description:
        "Run Playwright tests. Optionally filter by a grep pattern (e.g. 'smoke'). Returns exit code and console output.",
      schema: z.object({
        grep: z
          .string()
          .optional()
          .describe("Optional grep pattern to filter tests by title"),
      }),
    }
  );

  // --- Tool: open_ui_mode_hint ---
  const openUiModeHint = tool(
    async () => {
      return [
        "To open Playwright UI Mode, run this command in your terminal:",
        "",
        "  npx playwright test --ui",
        "",
        "UI Mode gives you an interactive timeline, DOM snapshots, network logs,",
        "and the ability to pick locators visually.",
      ].join("\n");
    },
    {
      name: "open_ui_mode_hint",
      description:
        "Return the command and description for opening Playwright UI Mode (interactive debugging).",
      schema: z.object({}),
    }
  );

  return [runPlaywrightTests, openUiModeHint];
}
