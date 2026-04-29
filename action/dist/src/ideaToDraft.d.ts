/**
 * Idea-to-Draft Pipeline
 *
 * ref: P8-003
 *
 * End-to-end pipeline:
 *   idea → LLM draft → DraftValidator → quarantine → lint → result
 *
 * The resulting artifact is in quarantine. It does NOT become canonical
 * until cockpit signoff via promoteDraft().
 */
import type { Artifact, Issue } from "./types.js";
import type { LlmClient } from "./trial/llmClient.js";
import type { StoreConfig } from "./artifactStore.js";
export type DraftPipelineResult = {
    status: "success" | "validation_failed" | "parse_error" | "llm_error";
    artifact?: Artifact;
    validation_errors?: string[];
    validation_warnings?: string[];
    lint_issues?: Issue[];
    raw_output?: string;
};
/**
 * Run the full idea-to-draft pipeline.
 *
 * Steps:
 *   1. Call LLM to generate draft JSON
 *   2. Parse JSON
 *   3. Validate with DraftValidator
 *   4. Save finalized artifact to quarantine
 *   5. Lint the finalized artifact
 *   6. Return result
 *
 * The artifact is in quarantine, NOT canonical.
 */
export declare function runIdeaToDraft(idea: string, client: LlmClient, store: StoreConfig, existingArtifactIds?: string[]): Promise<DraftPipelineResult>;
