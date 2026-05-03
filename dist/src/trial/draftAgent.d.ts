/**
 * Draft Agent
 *
 * ref: P8-002
 *
 * LLM-powered agent that takes a fuzzy idea and produces a raw
 * ArchitectureDraft artifact as JSON.
 *
 * This module NEVER retries, NEVER auto-fixes, NEVER falls back.
 * The caller validates the output through DraftValidator.
 *
 * The prompt instructs the LLM to produce ONLY the artifact body.
 * Host generates: revision_id, content_hash, metadata, canonical pointer.
 */
import type { LlmClient } from "./llmClient.js";
import type { Artifact, ArtifactType } from "../types.js";
import type { DomainProfile } from "../domainProfile.js";
/**
 * Build the prompt for draft generation.
 *
 * Visible for testing — the prompt is the contract between host and LLM.
 */
export declare function buildDraftPrompt(idea: string, artifactType?: ArtifactType): string;
/**
 * Build a domain-profiled prompt for draft generation.
 *
 * Injects:
 *   - Required sections as scaffolding
 *   - Required concepts for content alignment
 *   - Forbidden generic phrases as negative examples
 *   - Good/bad block examples for quality calibration
 *   - Requirement for terms[] and rationale on every block
 */
export declare function buildDraftPromptV2(idea: string, profile: DomainProfile): string;
/**
 * Generate a draft artifact from an idea (v1, no profile).
 */
export declare function generateDraft(client: LlmClient, idea: string, artifactType?: ArtifactType): Promise<string>;
/**
 * Generate a draft artifact from an idea (v2, with DomainProfile).
 */
export declare function generateDraftV2(client: LlmClient, idea: string, profile: DomainProfile): Promise<string>;
/**
 * A superseded constraint from the existing architecture.
 */
export type SupersededConstraint = {
    block_id: string;
    text: string;
    reason: string;
    replacement_intent: string;
};
/**
 * Build a migration-aware prompt for architecture evolution.
 *
 * Unlike v1/v2 which generate from scratch, this prompt:
 *   1. Shows the existing architecture's key invariants
 *   2. Explicitly lists superseded constraints with reasons
 *   3. Requires the new draft to address conflicts between old and new
 *   4. Uses DomainProfile for section/concept requirements
 *
 * ref: P10-001
 */
export declare function buildMigrationPrompt(opts: {
    idea: string;
    existingArchitecture: Artifact;
    supersededConstraints: SupersededConstraint[];
    profile: DomainProfile;
}): string;
/**
 * Generate a migration-aware architecture draft.
 *
 * ref: P10-001
 */
export declare function generateMigrationDraft(client: LlmClient, opts: {
    idea: string;
    existingArchitecture: Artifact;
    supersededConstraints: SupersededConstraint[];
    profile: DomainProfile;
}): Promise<string>;
/**
 * Build an InterfaceSpec prompt derived from architecture + existing interface.
 * ref: P10-004
 */
export declare function buildInterfaceSpecPrompt(opts: {
    architecture: Artifact;
    existingInterface: Artifact;
    supersededInterfaceBlocks: SupersededConstraint[];
    profile: DomainProfile;
}): string;
/**
 * Generate an InterfaceSpec draft.
 * ref: P10-004
 */
export declare function generateInterfaceSpecDraft(client: LlmClient, opts: {
    architecture: Artifact;
    existingInterface: Artifact;
    supersededInterfaceBlocks: SupersededConstraint[];
    profile: DomainProfile;
}): Promise<string>;
export declare function buildModuleSpecPrompt(opts: {
    architecture: Artifact;
    interfaceSpec: Artifact;
    profile: DomainProfile;
}): string;
export declare function generateModuleSpecDraft(client: LlmClient, opts: {
    architecture: Artifact;
    interfaceSpec: Artifact;
    profile: DomainProfile;
}): Promise<string>;
