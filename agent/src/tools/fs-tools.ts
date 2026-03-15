// agent/src/tools/fs-tools.ts

import { tool } from "langchain";
import * as z from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function buildFsTools(repoRoot: string) {
  // --- Tool: read_json_file ---
  const readJsonFile = tool(
    async ({ filePath }: { filePath: string }) => {
      const abs = path.resolve(repoRoot, filePath);
      const raw = await fs.readFile(abs, "utf-8");
      // Trim very large reports to stay within LLM context
      return raw.slice(0, 12_000);
    },
    {
      name: "read_json_file",
      description:
        "Read a file as text (path is relative to the repo root). Large files are trimmed to 12,000 characters.",
      schema: z.object({
        filePath: z
          .string()
          .min(1)
          .describe("Relative path to the file (e.g. 'reports/pw-report.json')"),
      }),
    }
  );

  // --- Tool: write_text_file ---
  const writeTextFile = tool(
    async ({ filePath, content }: { filePath: string; content: string }) => {
      const abs = path.resolve(repoRoot, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      return `Wrote ${content.length} characters to ${filePath}`;
    },
    {
      name: "write_text_file",
      description:
        "Write text to a file (path is relative to the repo root). Creates directories if needed.",
      schema: z.object({
        filePath: z
          .string()
          .min(1)
          .describe("Relative path for the output file (e.g. 'reports/latest.md')"),
        content: z.string().describe("Text content to write"),
      }),
    }
  );

  return [readJsonFile, writeTextFile];
}
