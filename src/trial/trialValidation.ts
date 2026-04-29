/**
 * Trial Validation — Release Gate
 *
 * ref: P3-005
 *
 * Validates a completed trial:
 *   1. Runs integrityCheck on trial store
 *   2. Loads final canonical projection
 *   3. Returns validation report
 *
 * integrityCheck clean is the release gate for trial completion.
 * It is NOT embedded in the pipeline's write path.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { integrityCheck, type IntegrityReport } from "../integrityCheck.js";
import type { StoreConfig } from "../artifactStore.js";
import type { TrialReport } from "./trialRunner.js";

export type TrialValidationResult = {
  integrityClean: boolean;
  report: IntegrityReport;
  canonicalMarkdown: string;
  trialReport: TrialReport;
};

/**
 * Validate a completed trial.
 *
 * @param config - Store configuration pointing to trial data directory
 * @param trialReport - The report from runTrial()
 * @returns Validation result with integrity status and final markdown
 */
export async function validateTrial(
  config: StoreConfig,
  trialReport: TrialReport
): Promise<TrialValidationResult> {
  // Run integrity check on the trial store
  const integrityReport = await integrityCheck(config);

  const integrityClean = integrityReport.summary.corruptions === 0;

  // Update trial report
  trialReport.integrity_clean = integrityClean;

  // Load final canonical markdown projection
  let canonicalMarkdown = "";
  const projectionsDir = join(config.dataDir, "projections");
  try {
    const files = await fs.readdir(projectionsDir);
    if (files.length > 0) {
      canonicalMarkdown = await fs.readFile(
        join(projectionsDir, files[0]),
        "utf8"
      );
    }
  } catch {
    canonicalMarkdown = "(No projection found)";
  }

  return {
    integrityClean,
    report: integrityReport,
    canonicalMarkdown,
    trialReport,
  };
}
