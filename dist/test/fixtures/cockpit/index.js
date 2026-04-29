/**
 * Cockpit Pressure Fixtures
 *
 * ref: HARD-006
 *
 * 10 fixed failure samples covering different pipeline failure modes.
 * Each fixture defines:
 *   - A draft artifact
 *   - A patch text (or patch operations)
 *   - The expected pipeline outcome
 *
 * These are used by the cockpit to render diverse failure states,
 * not just the §21 happy-path walkthrough.
 */
import { computeBlockContentHash } from "../../../src/hash.js";
// ---------------------------------------------------------------------------
// Block builder
// ---------------------------------------------------------------------------
function block(overrides) {
    const b = {
        type: "invariant",
        text: "Default block text.",
        terms: [],
        status: "draft",
        content_hash: "",
        ...overrides,
    };
    b.content_hash = computeBlockContentHash(b);
    return b;
}
function makeArtifact(id, blocks, sectionCount = 1) {
    const sections = [];
    const blocksPerSection = Math.ceil(blocks.length / sectionCount);
    for (let i = 0; i < sectionCount; i++) {
        sections.push({
            section_id: `sec_${i}`,
            title: `Section ${i}`,
            commitments: blocks.slice(i * blocksPerSection, (i + 1) * blocksPerSection),
        });
    }
    return {
        artifact_id: id,
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_placeholder",
        sections,
        metadata: { created_by: "fixture" },
    };
}
// ===========================================================================
// The 10 fixtures
// ===========================================================================
/**
 * F01: undefined_term
 * Patch introduces `quarantine_gate` — undefined technical term.
 * Expected: regression_failed, undefined_term gate.
 */
const F01_UNDEFINED_TERM = {
    id: "f01_undefined_term",
    name: "Undefined Term",
    description: "Patch introduces an undefined technical term (quarantine_gate).",
    artifact: makeArtifact("f01", [
        block({
            block_id: "b_f01",
            text: "All entries are committed instantly.",
        }),
    ]),
    patchText: "Entries must pass a quarantine_gate before canonical commit.",
    expectedPhase: "regression_failed",
    expectedFailedGates: ["undefined_term"],
};
/**
 * F02: constraint_deletion
 * Original text has strong constraint ("must never"), replacement drops it.
 * Expected: regression_failed, constraint_deletion gate.
 */
const F02_CONSTRAINT_DELETION = {
    id: "f02_constraint_deletion",
    name: "Deleted Strong Constraint",
    description: 'Original text says "must never allow". Patch removes the strong constraint.',
    artifact: makeArtifact("f02", [
        block({
            block_id: "b_f02",
            text: "The system must never allow entries committed instantly.",
        }),
    ]),
    patchText: "The system handles entries through a standard process.",
    expectedPhase: "regression_failed",
    expectedFailedGates: ["constraint_deletion"],
};
/**
 * F03: both undefined_term AND constraint_deletion
 * Expected: regression_failed, both gates.
 */
const F03_DOUBLE_FAILURE = {
    id: "f03_double_failure",
    name: "Multiple Gate Failures",
    description: "Patch deletes a strong constraint AND introduces an undefined term.",
    artifact: makeArtifact("f03", [
        block({
            block_id: "b_f03",
            text: "The system must only allow entries committed instantly after validation.",
        }),
    ]),
    patchText: "The system uses a validation_proxy for entry handling.",
    expectedPhase: "regression_failed",
    expectedFailedGates: ["undefined_term", "constraint_deletion"],
};
/**
 * F04: clean pass (no linter issues)
 * Block text has no unsafe commit language — linter generates no issues.
 * Pipeline commits directly.
 */
const F04_CLEAN_PASS = {
    id: "f04_clean_pass",
    name: "Clean Pass (No Issues)",
    description: "Artifact has no linter issues. Pipeline commits directly.",
    artifact: makeArtifact("f04", [
        block({
            block_id: "b_f04",
            text: "The data store uses write-ahead logging for pipeline state persistence.",
        }),
    ]),
    expectedPhase: "committed",
};
/**
 * F05: too many operations (elevated review)
 * Multiple blocks with issues → multiple patch operations → elevated_review_required.
 * But if semantics pass, it still commits.
 */
const F05_ELEVATED_REVIEW = {
    id: "f05_elevated_review",
    name: "Elevated Review (Many Ops)",
    description: "Single block with unsafe commit. Patch text is clean, passes regression.",
    artifact: makeArtifact("f05", [
        block({
            block_id: "b_f05",
            text: "All entries are committed instantly without review.",
        }),
    ]),
    patchText: "All entries are committed after validation and review.",
    expectedPhase: "committed",
};
/**
 * F06: undefined term with backtick syntax
 * Uses backtick-wrapped term like `audit_bridge` — more explicit trigger.
 */
const F06_BACKTICK_TERM = {
    id: "f06_backtick_term",
    name: "Undefined Backtick Term",
    description: "Patch uses backtick-wrapped term `audit_bridge` not in terms list.",
    artifact: makeArtifact("f06", [
        block({
            block_id: "b_f06",
            text: "All entries are committed instantly.",
        }),
    ]),
    patchText: "Entries route through `audit_bridge` before final commit.",
    expectedPhase: "regression_failed",
    expectedFailedGates: ["undefined_term"],
};
/**
 * F07: multiple undefined terms
 * Patch introduces several undefined technical terms.
 */
const F07_MULTI_UNDEFINED = {
    id: "f07_multi_undefined",
    name: "Multiple Undefined Terms",
    description: "Patch introduces multiple undefined snake_case terms.",
    artifact: makeArtifact("f07", [
        block({
            block_id: "b_f07",
            text: "All entries are committed instantly.",
        }),
    ]),
    patchText: "Entries pass through integrity_scanner and compliance_gate before commit.",
    expectedPhase: "regression_failed",
    expectedFailedGates: ["undefined_term"],
};
/**
 * F08: empty block text triggers linter
 * Block with only whitespace — linter catches empty text.
 */
const F08_EMPTY_BLOCK = {
    id: "f08_empty_block",
    name: "Empty Block Text",
    description: "Block has near-empty text. Linter flags it. Patch fixes with clean text.",
    artifact: makeArtifact("f08", [
        block({
            block_id: "b_f08",
            text: "All entries are committed instantly.",
        }),
        block({
            block_id: "b_f08_empty",
            text: "   ",
        }),
    ]),
    patchText: "The validation layer enforces schema compliance.",
    expectedPhase: "committed",
};
/**
 * F09: patch text uses "only" (strong constraint introduced, not deleted)
 * Introducing a strong constraint is fine — deleting one is not.
 * Expected: passes regression.
 */
const F09_CONSTRAINT_ADDED = {
    id: "f09_constraint_added",
    name: "Strong Constraint Added",
    description: 'Patch introduces "must only" — adding a constraint is safe.',
    artifact: makeArtifact("f09", [
        block({
            block_id: "b_f09",
            text: "All entries are committed instantly.",
        }),
    ]),
    patchText: "Entries must only be committed after full validation.",
    expectedPhase: "committed",
};
/**
 * F10: regression fails on "never" deletion
 * Original has "never skip". Replacement removes "never".
 */
const F10_NEVER_DELETION = {
    id: "f10_never_deletion",
    name: 'Deleted "never" Constraint',
    description: 'Original says "must never skip validation". Patch drops "never".',
    artifact: makeArtifact("f10", [
        block({
            block_id: "b_f10",
            text: "The system must never skip validation for entries committed instantly.",
        }),
    ]),
    patchText: "The system performs validation before commit.",
    expectedPhase: "regression_failed",
    expectedFailedGates: ["constraint_deletion"],
};
// ===========================================================================
// Export
// ===========================================================================
export const COCKPIT_FIXTURES = [
    F01_UNDEFINED_TERM,
    F02_CONSTRAINT_DELETION,
    F03_DOUBLE_FAILURE,
    F04_CLEAN_PASS,
    F05_ELEVATED_REVIEW,
    F06_BACKTICK_TERM,
    F07_MULTI_UNDEFINED,
    F08_EMPTY_BLOCK,
    F09_CONSTRAINT_ADDED,
    F10_NEVER_DELETION,
];
export function getFixtureById(id) {
    return COCKPIT_FIXTURES.find((f) => f.id === id);
}
//# sourceMappingURL=index.js.map