/**
 * P17: Scoped Implementation Boundary Protocol — Types
 *
 * Defines the tool-agnostic protocol package (.pantheon/scope.json)
 * that downstream AI coding agents must respect.
 *
 * Core invariants:
 * - Technical IDs (node_id, file_path, symbol_name) are NEVER translated.
 * - .pantheon/ is vendor-neutral protocol, .cursor/ is the first adapter.
 * - handoff.json is reference-only, never a scoped subset dump.
 * - enforced_by in v1 is heuristic-derived and must be labeled.
 *
 * ref: P17
 */
// ---------------------------------------------------------------------------
// Protocol Constants
// ---------------------------------------------------------------------------
/** Forbidden patterns that are always included regardless of project type. */
export const PROTOCOL_FORBIDDEN_PATTERNS = [
    { pattern: ".pantheon/**", reason: "Pantheon protocol files must not be modified by downstream agents." },
    { pattern: ".cursor/**", reason: "Cursor adapter files must not be modified by downstream agents." },
];
/** Generic advice phrases forbidden in cursor rules output. */
export const FORBIDDEN_GENERIC_PHRASES = [
    "follow good architecture",
    "be careful",
    "keep code clean",
    "ensure quality",
    "use best practices",
    "maintain standards",
    "write clean code",
];
export const GENERATOR_VERSION = "p17.0";
/**
 * Valid issue types accepted by scripts/createImplementationIssue.ts.
 * P17 reverse issue triggers MUST only use these types.
 * Source of truth: scripts/createImplementationIssue.ts line 28-31
 */
export const VALID_REVERSE_ISSUE_TYPES = [
    "missing_field",
    "wrong_type",
    "missing_state",
    "wrong_transition",
    "missing_interface",
    "contract_mismatch",
    "acceptance_gap",
    "other",
];
//# sourceMappingURL=types.js.map