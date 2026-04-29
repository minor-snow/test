# ArchitectureDraft: `pantheon_architecture`

> **Revision:** `rev_939220b164f1` · **Schema:** `architecture_draft@0.1.0` · **Type:** ArchitectureDraft
> **Parent:** `rev_7dcd7f1b48e9`

---

## Core Principles

<sub>section: `sec_core`</sub>

### 🔒 Invariant: `b_trial_001`

**Status:** 📝 Draft

Every state transition in the Pantheon pipeline is deterministic host code. LLM outputs are treated as untrusted proposals that must pass through the quarantine-to-evidence promotion path before affecting canonical state.

**Terms:** `quarantine`, `evidence`, `canonical`

<sub>hash: `sha256:bfbb4e66b473d…`</sub>

---

### 🔒 Invariant: `b_trial_002`

**Status:** 📝 Draft

The system maintains a single source of truth per artifact through the canonical pointer, which references exactly one immutable revision. All revisions are content-addressed via SHA-256.

**Terms:** `canonical`, `revision`, `sha-256`

<sub>hash: `sha256:a3c1209a3912e…`</sub>

---

### 🔒 Invariant: `b_trial_003`

**Status:** 📝 Draft

Schema versioning follows the format type@major.minor.patch. Every persisted object must carry a schema_version field. Unknown schema versions are treated as corrupt data.

**Terms:** `schema_version`

<sub>hash: `sha256:3ee863d5f24fe…`</sub>

---

### 🔒 Invariant: `b_trial_004`

**Status:** 📝 Draft

Audit logs are append-only and must record every state transition that affects canonical state. Missing audit entries for canonical revisions indicate a partial write and are treated as corruption.

**Terms:** `audit_log`

<sub>hash: `sha256:61bf74beeae22…`</sub>

---

### 🔒 Invariant: `b_trial_005`

**Status:** 📝 Draft

In legacy mode, patch results were committed to the canonical store without gating. This behavior is now prohibited.

**Terms:** `canonical`

<sub>hash: `sha256:e22b28dbc28c2…`</sub>

---

### 🔒 Invariant: `b_trial_006`

**Status:** 📝 Draft

The integrity check system performs read-only scans of the data directory. It never modifies data. Every finding type has a fixed action defined in the recovery policy document.

**Terms:** `integrity_check`

<sub>hash: `sha256:79a40192af470…`</sub>

---

## Artifact Store

<sub>section: `sec_store`</sub>

### 🔒 Invariant: `b_trial_007`

**Status:** 📝 Draft

The artifact store uses a directory-based layout with five top-level subdirectories: revisions/, canonical/, audit/, quarantine/, and evidence/. Each artifact gets its own subdirectory under revisions/.

**Terms:** `artifact_store`, `revisions`, `quarantine`, `evidence`

<sub>hash: `sha256:fd4bfde9410f6…`</sub>

---

### 🔒 Invariant: `b_trial_008`

**Status:** 📝 Draft

All file writes use atomic write semantics: data is first written to a .tmp file, then renamed to the final path. This prevents partial writes from corrupting the store.

<sub>hash: `sha256:837bb0a13d1b9…`</sub>

---

### 🔒 Invariant: `b_trial_009`

**Status:** 📝 Draft

Revisions are immutable once written. The store enforces this by rejecting writes to existing revision files. Content modification requires creating a new revision with a new content-addressed ID.

**Terms:** `revision`

<sub>hash: `sha256:f89c7310a339a…`</sub>

---

### 🔒 Invariant: `b_trial_010`

**Status:** 📝 Draft

Projections are human-readable Markdown renders of artifact revisions. They are regenerated on demand and stored in a designated directory. Projections are not authoritative; the revision JSON is.

**Terms:** `projection`

<sub>hash: `sha256:3cb1c9ba27dc3…`</sub>

---

### 🔒 Invariant: `b_trial_011`

**Status:** 📝 Draft

The canonical pointer file stores the artifact identifier and current revision identifier. Both fields are validated during integrity checks. A pointer with a mismatched identifier is flagged as corrupt.

**Terms:** `canonical_pointer`

<sub>hash: `sha256:f5083e8a088fc…`</sub>

---

### 🔒 Invariant: `b_trial_012`

**Status:** 📝 Draft

Quarantine items must not be promoted to the evidence store until they have passed all four validation gates.

**Terms:** `quarantine`, `evidence`

<sub>hash: `sha256:d4ec8134b3934…`</sub>

---

## Pipeline Orchestration

<sub>section: `sec_pipeline`</sub>

### 🔒 Invariant: `b_trial_013`

**Status:** 📝 Draft

The pipeline executes a fixed 14-step workflow from human idea to committed revision. The orchestrator is a general-purpose function that accepts an artifact and optional patch text override.

**Terms:** `pipeline`

<sub>hash: `sha256:dff2a416a7460…`</sub>

---

### 🔒 Invariant: `b_trial_014`

**Status:** 📝 Draft

Step sequence: create artifact → lint → quarantine issues → validate → promote to evidence → generate patch proposal → compile patch → apply patch → semantic regression → commit or halt for override.

**Terms:** `patch_proposal`

<sub>hash: `sha256:cf7e8fcc5a428…`</sub>

---

### 🔒 Invariant: `b_trial_015`

**Status:** 📝 Draft

The pipeline halts at the semantic regression gate if any regression is detected. Control passes to the human override cockpit. The pipeline does not auto-resolve regressions.

**Terms:** `semantic_regression`, `override`

<sub>hash: `sha256:c0777109cbef3…`</sub>

---

### 🔒 Invariant: `b_trial_016`

**Status:** 📝 Draft

If a patch is rejected by the mechanical gates, the pipeline records the rejection in the audit log and halts. The operator must then decide whether to manually intervene or retry.

<sub>hash: `sha256:f5aff3defe1a5…`</sub>

---

### 🔒 Invariant: `b_trial_017`

**Status:** 📝 Draft

Each pipeline cycle processes exactly one issue. Multi-issue resolution requires multiple cycles. This constraint prevents patch conflicts and keeps the audit trail linear.

<sub>hash: `sha256:4318247dc7b28…`</sub>

---

### 🚧 Constraint: `b_trial_018`

**Status:** 📝 Draft

The architecture must include a control group to isolate the effect of the intervention.

<sub>hash: `sha256:b475513ae92db…`</sub>

---

### 🔒 Invariant: `b_trial_019`

**Status:** 📝 Draft

The orchestrator must not contain demo-specific logic. All demo flows are isolated in the src/demo/ directory and injected via parameters.

**Terms:** `orchestrator`

<sub>hash: `sha256:d5b75ed6df477…`</sub>

---

## Gate System

<sub>section: `sec_gates`</sub>

### 🔒 Invariant: `b_trial_020`

**Status:** 📝 Draft

Four sequential gates validate every skill output before it can affect system state: Schema Gate (G-01), Source Reference Gate (G-02), Capability Gate (G-03), and Type-Specific Invariant Gate (G-04).

**Terms:** `schema_gate`, `source_reference_gate`, `capability_gate`

<sub>hash: `sha256:90fda592bc2bc…`</sub>

---

### 🔒 Invariant: `b_trial_021`

**Status:** 📝 Draft

The Capability Gate enforces skill-level restrictions. L1 skills can only produce Issues. L2 skills can produce PatchProposals. No skill may write directly to canonical or commit stores.

**Terms:** `skill_level`

<sub>hash: `sha256:8b69562e0b0f1…`</sub>

---

### 🔒 Invariant: `b_trial_022`

**Status:** 📝 Draft

The validation pipeline separates LLM output from host state. Raw LLM JSON enters as untrusted input and must pass all four gates to reach quarantine status.

**Terms:** `quarantine`

<sub>hash: `sha256:b110ddcfb9bac…`</sub>

---

### 🔒 Invariant: `b_trial_023`

**Status:** 📝 Draft

ArtifactPatch objects are never produced by LLM directly. The host compiles them from PatchProposals by resolving block references and computing expected hashes.

**Terms:** `artifact_patch`, `compile_patch`

<sub>hash: `sha256:7e919b7080b2c…`</sub>

---

### 🔒 Invariant: `b_trial_024`

**Status:** 📝 Draft

Before the gate system was introduced, validated outputs were committed without capability checks. This created an escalation path where L1 skills could forge patch proposals.

<sub>hash: `sha256:5aab7f2e0c242…`</sub>

---

### 🔒 Invariant: `b_trial_025`

**Status:** 📝 Draft

The patch application function performs seven mechanical checks in order: artifact identifier match, base revision identifier match, target block existence, expected old hash match, cross-section check, new block hash verification, and elevated review flagging for patches with more than three operations.

**Terms:** `apply_patch`

<sub>hash: `sha256:1fe6cea7924f0…`</sub>

---

## Semantic Regression

<sub>section: `sec_regression`</sub>

### 🔒 Invariant: `b_trial_026`

**Status:** 📝 Draft

The semantic regression gate compares old and new block pairs to detect two categories of regression: constraint deletion and undefined term introduction. It operates on text diff, not structural diff.

**Terms:** `constraint_deletion`, `undefined_term`

<sub>hash: `sha256:e970fd324b695…`</sub>

---

### 🔒 Invariant: `b_trial_027`

**Status:** 📝 Draft

Constraint deletion is detected by checking whether strong modal keywords (must, never, always, shall, prohibited, forbidden, required) present in the old text are absent from the new text.

<sub>hash: `sha256:8e055dee93d1f…`</sub>

---

### 🔒 Invariant: `b_trial_028`

**Status:** 📝 Draft

The regression gate produces a SemanticRegressionResult with status (passed/failed), a list of failed gates, affected block IDs, and human-readable reasons for each failure.

**Terms:** `semantic_regression_result`

<sub>hash: `sha256:f64ebd6ae38e2…`</sub>

---

### 🔒 Invariant: `b_trial_029`

**Status:** 📝 Draft

Each regression finding carries a confidence score between 0 and 1. Findings below the configurable threshold are downgraded to warnings and do not block the pipeline.

<sub>hash: `sha256:deb3fc4d892bc…`</sub>

---

### 🔒 Invariant: `b_trial_030`

**Status:** 📝 Draft

Human overrides can accept regressions with known risk. Override decisions are recorded in the audit log with the override type, justification, and the operator's identifier.

**Terms:** `override`

<sub>hash: `sha256:0de96e82a7796…`</sub>

---

## Integrity & Recovery

<sub>section: `sec_integrity`</sub>

### 🔒 Invariant: `b_trial_031`

**Status:** 📝 Draft

The integrity check performs 8 categories of validation: canonical pointer target existence, revision parseability, schema version registration, block hash consistency, revision ID recomputation, parent chain continuity, orphan detection, and audit log validation.

<sub>hash: `sha256:f1232a6bf8484…`</sub>

---

### 🔒 Invariant: `b_trial_032`

**Status:** 📝 Draft

Every finding type has exactly one fixed action. Corrupt findings block pipeline execution. Warning findings are reported but do not block. There is no case-by-case handling.

**Terms:** `finding`

<sub>hash: `sha256:d270dc324bc84…`</sub>

---

### 🔒 Invariant: `b_trial_033`

**Status:** 📝 Draft

In early development, corrupted revisions could be committed to canonical without integrity verification. Phase 2 hardening eliminated this path by requiring integrity checks as a release gate.

**Terms:** `integrity_check`

<sub>hash: `sha256:6cadd1a6a222f…`</sub>

---

### 🚧 Constraint: `b_trial_034`

**Status:** 📝 Draft

The system must enforce a maximum response time of 200 milliseconds for all user-facing requests.

<sub>hash: `sha256:0165d3bfff484…`</sub>

---

### 🔒 Invariant: `b_trial_035`

**Status:** 📝 Draft

Automatic repair of corrupt data is prohibited. All corrupt findings require human intervention following the four-step recovery flow: inspect report, decide fix, execute fix, re-run integrity check.

**Terms:** `recovery_flow`

<sub>hash: `sha256:c2c86e8fcd7be…`</sub>

---

### 🚧 Constraint: `b_trial_036`

**Status:** 📝 Draft

The system coordinates with the repair ledger to determine which corrupt entries require prioritized human attention.

<sub>hash: `sha256:9b9d6bbabd3de…`</sub>

---


<sub>Generated from JSON Artifact. This Markdown is a read-only projection (ref: C-01).</sub>