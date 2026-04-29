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
import { type IntegrityReport } from "../integrityCheck.js";
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
export declare function validateTrial(config: StoreConfig, trialReport: TrialReport): Promise<TrialValidationResult>;
