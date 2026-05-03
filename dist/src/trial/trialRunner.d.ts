/**
 * Trial Runner — Multi-Cycle Pipeline Orchestrator
 *
 * ref: P3-003, P3-004
 *
 * Runs the Pantheon pipeline in multiple cycles against the trial artifact.
 * Each cycle: load canonical → lint → pick issue → LLM patch → apply → regression → commit/override.
 *
 * Supports dual override mode:
 *   - "scripted": uses fixture decisions (for tests/CI)
 *   - "manual": halts for human input (for live trial)
 *
 * After all cycles, if no natural mechanical rejection occurred,
 * runs a forced rejection cycle to prove gate boundaries still hold.
 */
import { type StoreConfig } from "../artifactStore.js";
import type { Artifact, Issue } from "../types.js";
import type { LlmClient } from "./llmClient.js";
import { type RejectionCategory } from "./rejectionTaxonomy.js";
export type OverrideMode = "manual" | "scripted";
export type TrialConfig = {
    store: StoreConfig;
    client: LlmClient;
    overrideMode: OverrideMode;
    maxCycles: number;
    modelName?: string;
};
export type CycleResult = {
    cycle: number;
    issue: Issue | null;
    llmRawOutput: string | null;
    proposalValid: boolean;
    patchAccepted: boolean;
    regressionPassed: boolean | null;
    overrideApplied: boolean;
    overrideMode: OverrideMode | null;
    mechanicalRejection: boolean;
    rejectionReason: string | null;
    rejectionCategories: RejectionCategory[];
    committed: boolean;
    error: string | null;
};
export type TrialReport = {
    total_cycles: number;
    issues_found: number;
    issues_by_rule: Record<string, number>;
    proposals_generated: number;
    proposals_accepted: number;
    proposals_rejected_semantic: number;
    natural_rejection_count: number;
    forced_rejection_count: number;
    override_count: number;
    override_mode_breakdown: {
        manual: number;
        scripted: number;
    };
    rejections_by_category: Record<string, number>;
    final_canonical_revision_id: string;
    integrity_clean: boolean;
    final_readability_note: string;
    cycles: CycleResult[];
};
export declare function runCycle(config: TrialConfig, artifact: Artifact, issue: Issue, cycleNum: number, peerArtifacts?: Artifact[]): Promise<{
    result: CycleResult;
    newArtifact: Artifact | null;
}>;
export declare function runTrial(config: TrialConfig, seedArtifact: Artifact): Promise<TrialReport>;
