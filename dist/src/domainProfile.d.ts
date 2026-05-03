/**
 * Domain Profile
 *
 * ref: P9-001
 *
 * A domain profile constrains draft generation and quality evaluation.
 * It is NOT an Artifact — it is a static input constraint loaded from JSON.
 *
 * Profiles declare:
 *   - What concepts the domain requires / allows
 *   - What sections the artifact should contain
 *   - What phrases are forbidden filler
 *   - Quality rubric thresholds
 *
 * Profiles are artifact_type-scoped: each profile targets exactly one
 * artifact type (e.g., ArchitectureDraft).
 */
import type { ArtifactType, BlockType } from "./types.js";
/**
 * A required concept with optional aliases for fuzzy matching.
 * Coverage is computed via exact phrase / alias / terms[] match.
 * No embeddings. Must be explainable.
 */
export type ConceptRule = {
    concept: string;
    aliases: string[];
    required: boolean;
};
/**
 * A required section with aliases so near-synonymous titles still match.
 */
export type RequiredSectionRule = {
    title: string;
    aliases: string[];
};
/**
 * Quality rubric — fixed thresholds for the evaluator.
 */
export type QualityRubric = {
    min_sections: number;
    min_blocks: number;
    max_blocks: number;
    min_required_concept_coverage: number;
};
/**
 * Domain profile — scoped to a single artifact_type.
 */
export type DomainProfile = {
    profile_id: string;
    artifact_type: ArtifactType;
    domain_name: string;
    allowed_concepts: string[];
    required_concepts: ConceptRule[];
    forbidden_generic_phrases: string[];
    required_sections: RequiredSectionRule[];
    preferred_block_types: BlockType[];
    quality_rubric: QualityRubric;
};
/**
 * Load a DomainProfile from a JSON file.
 *
 * Performs structural validation:
 *   - Must be a non-null object
 *   - Must have profile_id, artifact_type, domain_name
 *   - Must have required_concepts as array
 *   - Must have required_sections as array
 *   - Must have quality_rubric with numeric fields
 *
 * @throws if file not found or structurally invalid
 */
export declare function loadDomainProfile(filePath: string): Promise<DomainProfile>;
