/**
 * Multi-Artifact Trial Runner
 *
 * ref: P7a-004, P7b-006
 *
 * Orchestrates a trial across multiple artifacts.
 * Each cycle:
 *   1. Load current canonical for each artifact from store
 *   2. Run local linter on each artifact
 *   3. Run cross-artifact linter across all artifacts
 *   4. Merge all issues into a single queue
 *   5. Pick next unattempted issue
 *   6. Dispatch to runCycle() with the issue's source artifact
 *   7. Update that artifact's canonical
 *   8. Repeat
 *
 * Does NOT do:
 *   - Automatic cross-artifact patch
 *   - Automatic rebase
 *   - Global dependency graph
 *   - Multi-issue patch
 *   - Parallel cycles
 */
import { type StoreConfig } from "../artifactStore.js";
import type { Artifact } from "../types.js";
import type { LlmClient } from "./llmClient.js";
import { type CycleResult, type OverrideMode } from "./trialRunner.js";
export type MultiArtifactTrialConfig = {
    store: StoreConfig;
    client: LlmClient;
    overrideMode: OverrideMode;
    maxCycles: number;
    modelName?: string;
};
export type MultiArtifactTrialReport = {
    artifact_count: number;
    block_count: number;
    local_issues: number;
    cross_artifact_issues: number;
    proposals_generated: number;
    proposals_committed: number;
    mechanical_rejections: number;
    semantic_regressions: number;
    overrides: number;
    residual_by_artifact: Record<string, number>;
    cross_residuals: number;
    rejections_by_category: Record<string, number>;
    final_revision_ids: Record<string, string>;
    issues_by_priority_tier: Record<number, number>;
    attempted_by_priority_tier: Record<number, number>;
    skipped_due_to_budget: number;
    cycles: CycleResult[];
};
export declare function runMultiArtifactTrial(config: MultiArtifactTrialConfig, seeds: Artifact[]): Promise<MultiArtifactTrialReport>;
