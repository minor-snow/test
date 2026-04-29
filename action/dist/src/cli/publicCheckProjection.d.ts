/**
 * P24: Public Check Projection
 *
 * Transforms internal verification/feedback objects into the stable
 * pantheon_check.v1 public JSON schema.
 *
 * CRITICAL: This module is the information boundary.
 * It must NOT expose internal objects (ChangeContract, boundary graph,
 * hash payload, gate registry, full observations).
 */
import type { DiffVerificationResult } from "../diffWorkflow/types.js";
import type { AgentFeedback } from "../agentFeedback/types.js";
import type { PantheonCheckPublic, PantheonRepoInfo } from "./types.js";
export declare function buildPublicCheck(input: {
    verification: DiffVerificationResult;
    feedback: AgentFeedback;
    intent: string;
    repo: PantheonRepoInfo;
    artifactRelDir?: string;
}): PantheonCheckPublic;
/**
 * Build a guard-phase (pre-check) public JSON.
 * No verification/feedback yet — just the baseline.
 */
export declare function buildPublicGuardBaseline(input: {
    intent: string;
    allowedCount: number;
    reviewRequiredCount: number;
    forbiddenCount: number;
    repo: PantheonRepoInfo;
    artifactRelDir?: string;
}): PantheonCheckPublic;
