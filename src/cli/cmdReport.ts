/**
 * P24: pantheon report — Print .pantheon/report.md to stdout.
 * Supports --attempt N to print a specific attempt's report.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { publicPaths, resolvePantheonDir } from "./artifactLayout.js";

export function cmdReport(repoRoot: string, attempt?: number): void {
  const root = resolve(repoRoot);
  let reportPath: string;

  if (attempt !== undefined) {
    reportPath = join(resolvePantheonDir(root), "attempts", `attempt_${attempt}`, "report.md");
  } else {
    reportPath = publicPaths(root).report;
  }

  if (!existsSync(reportPath)) {
    if (attempt !== undefined) {
      console.error(`No report found for attempt ${attempt}.`);
    } else {
      console.error("No report found. Run 'pantheon check' first.");
    }
    process.exit(1);
  }
  console.log(readFileSync(reportPath, "utf-8"));
}
