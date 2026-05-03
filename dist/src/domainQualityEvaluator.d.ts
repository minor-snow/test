/**
 * Domain Quality Evaluator
 *
 * ref: P9-002
 *
 * Evaluates draft quality against a DomainProfile.
 * Produces:
 *   - Domain-aware lint issues (7 rules)
 *   - Required concept coverage (exact / alias / terms[])
 *   - Fixed quality score
 *   - Intake recommendation
 *
 * This is NOT a replacement for the structural linter (linter.ts).
 * It runs on top of validated drafts to assess domain alignment.
 *
 * Score formula (fixed, not configurable):
 *   score = 100 - 15*high - 8*medium - 3*low
 *          + 10 if coverage >= 90%
 *          + 5  if all required sections present
 *   Floor: 0, Cap: 100
 *
 * Score is advisory, not canonical truth.
 */
import type { Artifact, IssueSeverity } from "./types.js";
import type { DomainProfile } from "./domainProfile.js";
export type ConceptMatch = {
    concept: string;
    matched: boolean;
    matched_by?: string;
    excluded_placeholder?: boolean;
};
export type ConceptCoverageResult = {
    total_required: number;
    matched: number;
    coverage: number;
    details: ConceptMatch[];
};
export type DraftQualityReport = {
    artifact_id: string;
    revision_id: string;
    score: number;
    section_count: number;
    block_count: number;
    required_concept_coverage: number;
    concept_matches: ConceptMatch[];
    issue_breakdown: Record<string, number>;
    severity_breakdown: Record<string, number>;
    blocking_issues: DomainIssue[];
    improvement_issues: DomainIssue[];
    recommendation: "reject_draft" | "accept_for_cleanup" | "accept_as_seed";
};
export type DomainIssue = {
    issue_type: string;
    severity: IssueSeverity;
    message: string;
    block_id?: string;
    section_id?: string;
};
export declare function computeConceptCoverage(artifact: Artifact, profile: DomainProfile): ConceptCoverageResult;
export declare function evaluateDraftQuality(artifact: Artifact, profile: DomainProfile): DraftQualityReport;
