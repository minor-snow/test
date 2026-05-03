/**
 * P30-0.5: Architecture Glossary Types
 *
 * Project-local architecture term mapping.
 * The glossary is the primary stable asset for architecture governance —
 * phrase rules are fallback, not the main pillar.
 *
 * Three-layer model:
 *   Layer A: Core relation triggers (~100 keywords, built-in)
 *   Layer B: Repo-derived term candidates (auto-extracted, unaccepted)
 *   Layer C: User glossary (accepted via `pantheon arch term`, stable asset)
 *
 * ref: P30
 */
export type ArchitectureGlossaryEntryKind = "module" | "package" | "service" | "external_service" | "boundary" | "data_store" | "interface" | "policy_surface" | "unknown";
export type ArchitectureGlossaryEntrySource = "repo_observation" | "architecture_doc" | "user_override" | "manual";
export type ArchitectureGlossaryEntryStatus = "candidate" | "accepted" | "rejected";
export type ArchitectureGlossaryEntry = {
    readonly term_id: string;
    readonly term: string;
    readonly aliases: readonly string[];
    readonly kind: ArchitectureGlossaryEntryKind;
    readonly path_patterns: readonly string[];
    readonly evidence_paths: readonly string[];
    readonly source: ArchitectureGlossaryEntrySource;
    readonly confidence: "high" | "medium" | "low";
    readonly status: ArchitectureGlossaryEntryStatus;
};
export type ArchitectureGlossary = {
    readonly schema_version: "architecture_glossary@0.1.0";
    readonly arch_id: string;
    readonly entries: readonly ArchitectureGlossaryEntry[];
    readonly glossary_hash: string;
};
export type ArchitectureStructuredHint = {
    readonly module: string;
    readonly owns?: readonly string[];
    readonly review_required?: readonly string[];
    readonly forbidden?: readonly string[];
    readonly external?: readonly string[];
    readonly depends_on?: readonly string[];
    readonly must_not_depend_on?: readonly string[];
    readonly lineStart: number;
    readonly lineEnd: number;
};
export type GlossaryTermMatch = {
    readonly entry: ArchitectureGlossaryEntry;
    readonly matched_text: string;
    readonly match_type: "exact" | "alias" | "partial";
};
