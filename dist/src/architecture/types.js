/**
 * P30: Architecture Governance Types
 *
 * All architecture-specific data models for the Architecture Mapping Review MVP.
 * Covers the full lifecycle: ingest → claims → evidence → relations → overrides → contract → constraints.
 *
 * ref: P30
 */
/** Relations that generate hard constraints in MVP. */
export const CONSTRAINT_GENERATING_RELATIONS = [
    "owns",
    "located_at",
    "depends_on",
    "must_not_depend_on",
    "review_required_for",
    "forbidden_change",
    "allowed_change",
    "external_service",
];
/** Relations that are advisory-only in MVP. */
export const ADVISORY_ONLY_RELATIONS = [
    "exposes_interface",
    "entrypoint_for",
    "tested_by",
    "adapter_for",
    "reads_from",
    "writes_to",
    "boundary_between",
];
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Fixed limitations block per Invariant 5. */
export const ARCHITECTURE_CONTRACT_LIMITATIONS = [
    "Architecture contracts are governance constraints derived from reviewed documentation and repository evidence.",
    "They do not prove semantic correctness or complete dependency structure.",
    "Unreviewed claims are advisory only and do not affect verdicts.",
    "must_not_depend_on enforcement is path-pattern based; no full import/call graph analysis.",
    "Contextual ownership constraints only apply when the change/repair target matches the owning module.",
];
//# sourceMappingURL=types.js.map