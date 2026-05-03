/**
 * P21: Reviewer Report Renderer
 *
 * Generates a human-readable markdown report for code reviewers.
 * Shows authorized scope vs actual diff and verification result.
 */
import type { ChangeContractLite } from "../changeContract/lite/types.js";
import type { RepoObservations } from "../repoObservation/types.js";
import type { AgentScopeLite, GitDiffSummary, DiffVerificationResult } from "./types.js";
export declare function renderReviewerReport(input: {
    intent?: string;
    diff: GitDiffSummary;
    contract: ChangeContractLite;
    scope: AgentScopeLite;
    verification?: DiffVerificationResult;
    observations: RepoObservations;
}): string;
