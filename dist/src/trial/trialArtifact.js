/**
 * Phase 3 Trial Artifact — Pantheon ArchitectureDraft
 *
 * ref: P3-001
 *
 * This is the FROZEN seed artifact for the Phase 3 real-artifact trial.
 * It describes Pantheon's own architecture as a real ArchitectureDraft.
 *
 * Structure: 6 sections, 36 blocks total.
 *
 * Linter trigger design (intentionally planted, marked with LINT-TRIGGER):
 *   - 4 blocks contain "committed instantly" → unsafe_canonical_commit
 *   - 4 blocks reference undefined backtick terms → undefined_term
 *   - 2 blocks have empty text → empty_block_text
 *   - All remaining blocks are clean, real architecture descriptions.
 *
 * DO NOT MODIFY after initial verification.
 * Any changes to the trial artifact invalidate the trial baseline.
 */
import { computeBlockContentHash, computeRevisionId } from "../hash.js";
// ---------------------------------------------------------------------------
// Block factory
// ---------------------------------------------------------------------------
let blockSeq = 0;
function block(opts) {
    blockSeq++;
    const b = {
        block_id: `b_trial_${String(blockSeq).padStart(3, "0")}`,
        type: opts.type ?? "invariant",
        text: opts.text,
        terms: opts.terms ?? [],
        rationale: opts.rationale,
        status: "draft",
        content_hash: "",
    };
    b.content_hash = computeBlockContentHash(b);
    return b;
}
function section(id, title, blocks) {
    return { section_id: id, title, commitments: blocks };
}
// ---------------------------------------------------------------------------
// Section 1: Core Principles (6 blocks)
// ---------------------------------------------------------------------------
const corePrinciples = section("sec_core", "Core Principles", [
    block({
        text: "Every state transition in the Pantheon pipeline is deterministic host code. " +
            "LLM outputs are treated as untrusted proposals that must pass through " +
            "the quarantine-to-evidence promotion path before affecting canonical state.",
        terms: ["quarantine", "evidence", "canonical"],
    }),
    block({
        text: "The system maintains a single source of truth per artifact through " +
            "the canonical pointer, which references exactly one immutable revision. " +
            "All revisions are content-addressed via SHA-256.",
        terms: ["canonical", "revision", "sha-256"],
    }),
    block({
        text: "Schema versioning follows the format type@major.minor.patch. " +
            "Every persisted object must carry a schema_version field. " +
            "Unknown schema versions are treated as corrupt data.",
        terms: ["schema_version"],
    }),
    block({
        text: "Audit logs are append-only and must record every state transition " +
            "that affects canonical state. Missing audit entries for canonical " +
            "revisions indicate a partial write and are treated as corruption.",
        terms: ["audit_log"],
    }),
    block({
        // LINT-TRIGGER: unsafe_canonical_commit
        text: "In legacy mode, patch results were committed instantly to the " +
            "canonical store without gating. This behavior is now prohibited.",
        terms: ["canonical"],
    }),
    block({
        text: "The integrity check system performs read-only scans of the data " +
            "directory. It never modifies data. Every finding type has a fixed " +
            "action defined in the recovery policy document.",
        terms: ["integrity_check"],
    }),
]);
// ---------------------------------------------------------------------------
// Section 2: Artifact Store (6 blocks)
// ---------------------------------------------------------------------------
const artifactStore = section("sec_store", "Artifact Store", [
    block({
        text: "The artifact store uses a directory-based layout with five top-level " +
            "subdirectories: revisions/, canonical/, audit/, quarantine/, and evidence/. " +
            "Each artifact gets its own subdirectory under revisions/.",
        terms: ["artifact_store", "revisions", "quarantine", "evidence"],
    }),
    block({
        text: "All file writes use atomic write semantics: data is first written to " +
            "a .tmp file, then renamed to the final path. This prevents partial " +
            "writes from corrupting the store.",
    }),
    block({
        text: "Revisions are immutable once written. The store enforces this by " +
            "rejecting writes to existing revision files. Content modification " +
            "requires creating a new revision with a new content-addressed ID.",
        terms: ["revision"],
    }),
    block({
        // LINT-TRIGGER: undefined_term (backtick term `projection_cache` not defined)
        text: "Projections are human-readable Markdown renders of artifact revisions. " +
            "They are regenerated on demand and stored in the `projection_cache` " +
            "directory. Projections are not authoritative; the revision JSON is.",
        terms: ["projection"],
    }),
    block({
        text: "The canonical pointer file stores the artifact_id and current_revision_id. " +
            "Both fields are validated during integrity checks. A pointer with a " +
            "mismatched artifact_id is flagged as corrupt.",
        terms: ["canonical_pointer"],
    }),
    block({
        // LINT-TRIGGER: unsafe_canonical_commit
        text: "Quarantine items must never be committed instantly to the evidence " +
            "store. Promotion requires passing all four validation gates first.",
        terms: ["quarantine", "evidence"],
    }),
]);
// ---------------------------------------------------------------------------
// Section 3: Pipeline Orchestration (7 blocks)
// ---------------------------------------------------------------------------
const pipelineOrchestration = section("sec_pipeline", "Pipeline Orchestration", [
    block({
        text: "The pipeline executes a fixed 14-step workflow from human idea to " +
            "committed revision. The orchestrator is a general-purpose function " +
            "that accepts an artifact and optional patch text override.",
        terms: ["pipeline"],
    }),
    block({
        text: "Step sequence: create artifact → lint → quarantine issues → validate → " +
            "promote to evidence → generate patch proposal → compile patch → " +
            "apply patch → semantic regression → commit or halt for override.",
        terms: ["patch_proposal"],
    }),
    block({
        text: "The pipeline halts at the semantic regression gate if any regression " +
            "is detected. Control passes to the human override cockpit. " +
            "The pipeline does not auto-resolve regressions.",
        terms: ["semantic_regression", "override"],
    }),
    block({
        // LINT-TRIGGER: undefined_term (backtick term `rollback_policy` not defined)
        text: "If a patch is rejected by the mechanical gates, the pipeline records " +
            "the rejection in the audit log and halts. The `rollback_policy` " +
            "defines whether the operator must manually intervene or can retry.",
    }),
    block({
        text: "Each pipeline cycle processes exactly one issue. Multi-issue resolution " +
            "requires multiple cycles. This constraint prevents patch conflicts " +
            "and keeps the audit trail linear.",
    }),
    block({
        // LINT-TRIGGER: empty_block_text
        text: "",
        type: "constraint",
    }),
    block({
        text: "The orchestrator must not contain demo-specific logic. All demo flows " +
            "are isolated in the src/demo/ directory and injected via parameters.",
        terms: ["orchestrator"],
    }),
]);
// ---------------------------------------------------------------------------
// Section 4: Gate System (6 blocks)
// ---------------------------------------------------------------------------
const gateSystem = section("sec_gates", "Gate System", [
    block({
        text: "Four sequential gates validate every skill output before it can " +
            "affect system state: Schema Gate (G-01), Source Reference Gate (G-02), " +
            "Capability Gate (G-03), and Type-Specific Invariant Gate (G-04).",
        terms: ["schema_gate", "source_reference_gate", "capability_gate"],
    }),
    block({
        text: "The Capability Gate enforces skill-level restrictions. L1 skills " +
            "can only produce Issues. L2 skills can produce PatchProposals. " +
            "No skill may write directly to canonical or commit stores.",
        terms: ["skill_level"],
    }),
    block({
        // LINT-TRIGGER: undefined_term (`trust_boundary` not defined)
        text: "The `trust_boundary` between LLM output and host state is the " +
            "validation pipeline. Raw LLM JSON enters as untrusted input and " +
            "must pass all four gates to reach quarantine status.",
        terms: ["quarantine"],
    }),
    block({
        text: "ArtifactPatch objects are never produced by LLM directly. The host " +
            "compiles them from PatchProposals by resolving block references and " +
            "computing expected hashes. This is the compilePatch function.",
        terms: ["artifact_patch", "compile_patch"],
    }),
    block({
        // LINT-TRIGGER: unsafe_canonical_commit
        text: "Before the gate system was introduced, validated outputs were " +
            "committed instantly without capability checks. This created " +
            "an escalation path where L1 skills could forge patch proposals.",
    }),
    block({
        text: "The applyPatch function performs seven mechanical checks in order: " +
            "artifact_id match, base_revision_id match, target_block_id existence, " +
            "expected_old_hash match, cross-section check, new_block hash verification, " +
            "and elevated review flagging for patches with more than three operations.",
        terms: ["apply_patch"],
    }),
]);
// ---------------------------------------------------------------------------
// Section 5: Semantic Regression (5 blocks)
// ---------------------------------------------------------------------------
const semanticRegression = section("sec_regression", "Semantic Regression", [
    block({
        text: "The semantic regression gate compares old and new block pairs to detect " +
            "two categories of regression: constraint deletion and undefined term " +
            "introduction. It operates on text diff, not structural diff.",
        terms: ["constraint_deletion", "undefined_term"],
    }),
    block({
        text: "Constraint deletion is detected by checking whether strong modal " +
            "keywords (must, never, always, shall, prohibited, forbidden, required) " +
            "present in the old text are absent from the new text.",
    }),
    block({
        text: "The regression gate produces a SemanticRegressionResult with status " +
            "(passed/failed), a list of failed gates, affected block IDs, and " +
            "human-readable reasons for each failure.",
        terms: ["semantic_regression_result"],
    }),
    block({
        // LINT-TRIGGER: undefined_term (`confidence_score` not defined)
        text: "Each regression finding carries a `confidence_score` between 0 and 1. " +
            "Findings below the configurable threshold are downgraded to warnings " +
            "and do not block the pipeline.",
    }),
    block({
        text: "Human overrides can accept regressions with known risk. Override " +
            "decisions are recorded in the audit log with the override type, " +
            "justification, and the operator's identifier.",
        terms: ["override"],
    }),
]);
// ---------------------------------------------------------------------------
// Section 6: Integrity & Recovery (5 blocks)
// ---------------------------------------------------------------------------
const integrityRecovery = section("sec_integrity", "Integrity & Recovery", [
    block({
        text: "The integrity check performs 8 categories of validation: canonical " +
            "pointer target existence, revision parseability, schema version " +
            "registration, block hash consistency, revision ID recomputation, " +
            "parent chain continuity, orphan detection, and audit log validation.",
    }),
    block({
        text: "Every finding type has exactly one fixed action. Corrupt findings " +
            "block pipeline execution. Warning findings are reported but do not " +
            "block. There is no case-by-case handling.",
        terms: ["finding"],
    }),
    block({
        // LINT-TRIGGER: unsafe_canonical_commit
        text: "In early development, corrupted revisions were committed instantly " +
            "to canonical without integrity verification. Phase 2 hardening " +
            "eliminated this path by requiring integrity checks as a release gate.",
        terms: ["integrity_check"],
    }),
    block({
        // LINT-TRIGGER: empty_block_text
        text: "",
        type: "constraint",
    }),
    block({
        text: "Automatic repair of corrupt data is prohibited. All corrupt findings " +
            "require human intervention following the four-step recovery flow: " +
            "inspect report, decide fix, execute fix, re-run integrity check.",
        terms: ["recovery_flow"],
    }),
    block({
        // LINT-TRIGGER: undefined_term (Phase 6 addition to reach 20+ issues)
        text: "The `recovery_orchestrator` coordinates with the `repair_ledger` to " +
            "determine which corrupt entries require prioritized human attention.",
        type: "constraint",
    }),
]);
// ---------------------------------------------------------------------------
// Assemble and export
// ---------------------------------------------------------------------------
export function createTrialArtifact() {
    // Reset block counter for deterministic IDs
    blockSeq = 0;
    const artifact = {
        artifact_id: "pantheon_architecture",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_placeholder",
        sections: [
            corePrinciples,
            artifactStore,
            pipelineOrchestration,
            gateSystem,
            semanticRegression,
            integrityRecovery,
        ],
        metadata: {
            created_by: "human",
            created_at: "2026-04-25T00:00:00Z",
            notes: "Phase 3 trial seed artifact — frozen after initial verification.",
        },
    };
    artifact.revision_id = computeRevisionId(artifact);
    return artifact;
}
//# sourceMappingURL=trialArtifact.js.map