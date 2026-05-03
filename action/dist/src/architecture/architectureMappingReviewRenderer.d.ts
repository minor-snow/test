/**
 * P30: Architecture Mapping Review Renderer
 *
 * Generates `architecture_mapping_review.md` — the core human-facing UX of P30.
 * Groups claims by confidence, provides reproducible CLI commands for each claim,
 * and surfaces unmapped claims and glossary term candidates for manual resolution.
 *
 * P30-0.5 evolution: Now includes:
 * - Term Candidates section (glossary terms found but not yet accepted)
 * - Claims Needing Term Mapping section (text with no glossary match)
 * - `pantheon arch term` commands alongside `arch map` commands
 *
 * ref: P30
 */
import type { ArchitectureClaim, ArchitectureEvidenceCandidate, ArchitectureRelation } from "./types.js";
import type { ArchitectureGlossary } from "./architectureGlossary.js";
export type MappingReviewInput = {
    readonly archId: string;
    readonly sourcePath: string;
    readonly claims: readonly ArchitectureClaim[];
    readonly evidence: readonly ArchitectureEvidenceCandidate[];
    readonly relations: readonly ArchitectureRelation[];
    readonly glossary?: ArchitectureGlossary;
};
/**
 * Render the architecture mapping review as markdown.
 */
export declare function renderArchitectureMappingReview(input: MappingReviewInput): string;
