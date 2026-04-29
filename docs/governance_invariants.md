# Pantheon Governance Invariants

This document declares the core governance invariants that Pantheon's deterministic system must uphold. Each invariant is mechanically enforced by at least one gate, and tested by at least one regression test.

## Source of Truth

The machine-readable source of truth for gate-level invariants is:

```
src/gateRegistry.ts       — 14 gates, each with required_checks, fail_closed_cases, regression_tests
```

The machine-readable source of truth for field-level invariants is:

```
src/governance/fieldBehaviorRegistry.ts — 15 field behaviors with expected/forbidden semantics
```

This document is the human-readable overlay. If this document and the registries conflict, the registries win.

---

## Core Invariants

### 1. Agent/LLM output never directly modifies canonical

Agent or LLM output may produce candidate artifacts or reports. It may never directly write to canonical revisions. Agent output enters quarantine first, passes through deterministic validation, and only reaches canonical via a promotion gate.

**Enforced by**: `validate_skill_output`, `compile_patch`, `apply_patch`, `integrity_check`
**Tested by**: `test/validators.test.ts`, `test/applyPatch.test.ts`, `test/integrityCheck.test.ts`, `test/corruption.test.ts`

### 2. Deterministic gates own state transitions

All state transitions (draft → candidate → canonical) are controlled by deterministic gates. No gate may be bypassed except through the explicit human override mechanism, which itself is gated (non-overridable mechanical gates cannot be overridden).

**Enforced by**: `compile_patch`, `apply_override_patch`
**Tested by**: `test/applyPatch.test.ts`, `test/applyOverridePatch.test.ts`

### 3. Content hashes are always host-computed

The host recomputes `content_hash` and `revision_id` for every artifact mutation. LLM-provided hashes are discarded. This ensures tamper detection is independent of the LLM.

**Enforced by**: `apply_patch`, `integrity_check`
**Tested by**: `test/applyPatch.test.ts`, `test/integrityCheck.test.ts`, `test/hash.test.ts`

### 4. Revisions are immutable

Once a revision is written, its content cannot be modified. The canonical pointer moves forward to new revisions; it never overwrites existing ones.

**Enforced by**: `integrity_check`
**Tested by**: `test/integrityCheck.test.ts`, `test/corruption.test.ts`

### 5. Repair verdict is bucket-based, not weight-based

The repair verifier computes verdict solely from bucket membership (forbidden → fail, outside_scope → requires_scope_expansion, review_required → requires_review, allowed → pass). The `audit_weight` field affects human report emphasis only, never the verdict.

**Enforced by**: `repairVerifier.ts` (verified by source code scan)
**Tested by**: `test/repair/repairVerifier.test.ts`, `test/governance/fieldBehaviorCoverage.test.ts`

### 6. Agent hypothesis never enters confirmed facts

When building a `BugFinding` from an `AgentBugReport`, the `agent_hypothesis` field is placed in `unverified_claims`, never in `confirmed_facts`. Confirmed facts come only from validated evidence.

**Enforced by**: `agentBugReportValidator.ts`, `bugFindingBuilder.ts`
**Tested by**: `test/governance/fieldBehaviorCoverage.test.ts`, `test/e2e/repairToAudit.e2e.test.ts`

### 7. BugFinding always states its limitation

Every `BugFinding` must have a non-empty `limitation` field set to `BUG_FINDING_V1_LIMITATION`. This prevents the finding from being mistaken as proof that the bug is real.

**Enforced by**: `bugFindingBuilder.ts`
**Tested by**: `test/governance/fieldBehaviorCoverage.test.ts`

### 8. Human audit decisions are append-only

Human audit decisions can add review/forbidden patterns and must_preserve entries. They cannot remove existing scope entries. The contract revision number increments with each decision.

**Enforced by**: `repairPlanRevisioner.ts`
**Tested by**: `test/e2e/repairToAudit.e2e.test.ts`

### 9. Public artifacts must not contain local paths

All public-facing artifacts (GitHub PR comments, step summaries, reports) are scanned by the artifact sanitizer. Windows absolute paths, Unix user paths, debug payloads, and secret-like keys cause the artifact to be rejected.

**Enforced by**: `artifactSanitizer.ts`
**Tested by**: `test/artifacts/artifactSanitizer.test.ts`, `test/e2e/repairToAudit.e2e.test.ts`

### 10. Boundary graph computation is deterministic

BoundaryGraph node/edge construction and BlastRadius traversal produce stable, reproducible results for the same input. No randomness or external state affects the output.

**Enforced by**: `boundaryGraph.ts`, `blastRadius.ts`
**Tested by**: `test/boundary/boundaryGraph.regression.test.ts`, `test/boundary/blastRadius.regression.test.ts`

---

## What These Invariants Do Not Cover

1. **Semantic correctness of repairs.** Invariants ensure structural governance, not that a repair actually fixes the bug.
2. **Language adapter completeness.** Python/TS/Java adapters are not covered by these invariants.
3. **Multi-agent concurrency.** Concurrent agent access patterns are not tested.
4. **Production deployment safety.** These are unit/integration tests, not production monitoring.

---

_Generated by P18.5-D. Last updated: 2026-04-29._
