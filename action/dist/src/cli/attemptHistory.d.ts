/**
 * P24: Attempt History
 *
 * Lightweight attempt tracking for pantheon check.
 * Each check run creates attempts/attempt_N/ with report, feedback, check, diff.
 * check.json includes history summary.
 */
import type { PantheonCheckPublic } from "./types.js";
export type AttemptRecord = {
    readonly attempt: number;
    readonly verdict: string;
    readonly violation_count: number;
    readonly artifact_dir: string;
    readonly timestamp: string;
};
export type CheckWithHistory = PantheonCheckPublic & {
    readonly attempt: number;
    readonly history: readonly AttemptRecord[];
};
/**
 * Determine the next attempt number by scanning existing attempt dirs.
 */
export declare function nextAttemptNumber(repoRoot: string): number;
/**
 * Create the attempt directory and return its path.
 */
export declare function ensureAttemptDir(repoRoot: string, attempt: number): string;
/**
 * Write an attempt record (report.md, feedback.md, check.json, diff_name_status.txt).
 */
export declare function writeAttemptArtifacts(attemptDir: string, artifacts: {
    reportMd: string;
    feedbackMd: string;
    checkJson: string;
    diffNameStatus: string;
}): void;
/**
 * Load history of all past attempts from attempts/ directory.
 */
export declare function loadAttemptHistory(repoRoot: string): AttemptRecord[];
/**
 * Enrich a PantheonCheckPublic with attempt number and history.
 */
export declare function enrichCheckWithHistory(check: PantheonCheckPublic, attempt: number, history: AttemptRecord[]): CheckWithHistory;
