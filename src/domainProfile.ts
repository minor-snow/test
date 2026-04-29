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

import { promises as fs } from "node:fs";
import type { ArtifactType, BlockType } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

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
export async function loadDomainProfile(filePath: string): Promise<DomainProfile> {
  const content = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(content);

  if (typeof data !== "object" || data === null) {
    throw new Error("DomainProfile must be a non-null JSON object");
  }

  const errors: string[] = [];

  if (!data.profile_id || typeof data.profile_id !== "string") {
    errors.push("missing or invalid profile_id");
  }
  if (!data.artifact_type || typeof data.artifact_type !== "string") {
    errors.push("missing or invalid artifact_type");
  }
  if (!data.domain_name || typeof data.domain_name !== "string") {
    errors.push("missing or invalid domain_name");
  }
  if (!Array.isArray(data.required_concepts)) {
    errors.push("missing or invalid required_concepts (must be array)");
  }
  if (!Array.isArray(data.required_sections)) {
    errors.push("missing or invalid required_sections (must be array)");
  }
  if (!Array.isArray(data.forbidden_generic_phrases)) {
    errors.push("missing or invalid forbidden_generic_phrases (must be array)");
  }
  if (!data.quality_rubric || typeof data.quality_rubric !== "object") {
    errors.push("missing or invalid quality_rubric");
  } else {
    for (const key of ["min_sections", "min_blocks", "max_blocks", "min_required_concept_coverage"]) {
      if (typeof data.quality_rubric[key] !== "number") {
        errors.push(`quality_rubric.${key} must be a number`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid DomainProfile: ${errors.join("; ")}`);
  }

  return data as DomainProfile;
}
