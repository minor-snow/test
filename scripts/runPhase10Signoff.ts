/**
 * Phase 10 — P10-007: DecisionLog + RiskRegister + Dogfood Report
 * Usage: npx tsx scripts/runPhase10Signoff.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { appendDecisionEntry } from "../src/cockpit/decisionLog.js";
import { appendRiskEntries, type RiskEntry } from "../src/cockpit/riskRegister.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const ts = new Date().toISOString();

// ---------------------------------------------------------------------------
// Decision entries
// ---------------------------------------------------------------------------

const DECISIONS = [
  {
    decision_id: "p10_decision_offline_migration",
    decision_type: "architecture_migration:approved",
    operator_id: "p10_operator",
    release_decision_id: "p10_decision_offline_migration",
    affected_artifacts: [
      "pet_triage_offline_architecture",
      "pet_triage_offline_interface",
      "pet_triage_offline_module",
    ],
    canonical_revision_ids: {
      pet_triage_offline_architecture: "rev_d252eb5b2bc6",
      pet_triage_offline_interface: "rev_a1695505f72c",
      pet_triage_offline_module: "rev_17695c778e19",
    },
    rationale:
      "P10 offline-first migration approved. Three-layer artifact family passes cross-artifact consistency (0 cross issues, 0 stale/orphan links, 10/10 requirement traceability, integrityCheck clean). Scores: 100/91/99.",
    created_at: ts,
  },
  {
    decision_id: "p10_decision_hybrid_conflict",
    decision_type: "design_decision:approved",
    operator_id: "p10_operator",
    release_decision_id: "p10_decision_offline_migration",
    affected_artifacts: ["pet_triage_offline_architecture"],
    canonical_revision_ids: {
      pet_triage_offline_architecture: "rev_d252eb5b2bc6",
    },
    rationale:
      "Hybrid conflict strategy accepted: Vector Clock for clinical data fields, LWW for metadata/timestamps. Rationale: clinical edits require causal ordering to avoid silent data loss; metadata can tolerate last-writer-wins semantics.",
    created_at: ts,
  },
  {
    decision_id: "p10_decision_local_pending",
    decision_type: "design_decision:approved",
    operator_id: "p10_operator",
    release_decision_id: "p10_decision_offline_migration",
    affected_artifacts: ["pet_triage_offline_interface"],
    canonical_revision_ids: {
      pet_triage_offline_interface: "rev_a1695505f72c",
    },
    rationale:
      "Local pending reports are created BEFORE backend confirmation. Network failure is recoverable (retry ledger), not terminal. This supersedes the old strong-sync contract where failure was terminal.",
    created_at: ts,
  },
  {
    decision_id: "p10_decision_consistency_pass",
    decision_type: "consistency_verification:pass_with_local_residuals",
    operator_id: "p10_operator",
    release_decision_id: "p10_decision_offline_migration",
    affected_artifacts: [
      "pet_triage_offline_architecture",
      "pet_triage_offline_interface",
      "pet_triage_offline_module",
    ],
    canonical_revision_ids: {
      pet_triage_offline_architecture: "rev_d252eb5b2bc6",
      pet_triage_offline_interface: "rev_a1695505f72c",
      pet_triage_offline_module: "rev_17695c778e19",
    },
    rationale:
      "P10-006 cross-artifact consistency: 0 cross issues, 10/10 traceability, integrityCheck clean. 73 local lint residuals (28 undefined_term, 45 domain_irrelevant_content) recorded but not blocking.",
    created_at: ts,
  },
];

// ---------------------------------------------------------------------------
// Risk entries
// ---------------------------------------------------------------------------

const RISKS: RiskEntry[] = [
  {
    risk_id: "p10_risk_lww_data_loss",
    source_issue_id: "p10_risk_lww_data_loss",
    issue_type: "design_risk",
    severity: "high",
    block_id: "b_conflict_002",
    artifact_id: "pet_triage_offline_architecture",
    canonical_revision_id: "rev_d252eb5b2bc6",
    accepted_by: "p10_operator",
    release_decision_id: "p10_decision_hybrid_conflict",
    why_accepted: "LWW is scoped to metadata-only fields (timestamps, read markers). Clinical data uses vector clock merge. Residual risk: if field classification drifts, clinical data could silently be overwritten.",
    mitigation: "Field classification must be enforced by schema validator at sync boundary. Add integration test for LWW scope.",
    created_at: ts,
  },
  {
    risk_id: "p10_risk_vector_clock_complexity",
    source_issue_id: "p10_risk_vector_clock_complexity",
    issue_type: "implementation_risk",
    severity: "medium",
    block_id: "b_conflict_001",
    artifact_id: "pet_triage_offline_architecture",
    canonical_revision_id: "rev_d252eb5b2bc6",
    accepted_by: "p10_operator",
    release_decision_id: "p10_decision_hybrid_conflict",
    why_accepted: "Vector clock merge is necessary for correct multi-clinic clinical data handling. Complexity is accepted as inherent.",
    mitigation: "Provide deterministic merge test fixtures. Document merge semantics for support team.",
    created_at: ts,
  },
  {
    risk_id: "p10_risk_stale_decision_tree",
    source_issue_id: "p10_risk_stale_decision_tree",
    issue_type: "operational_risk",
    severity: "medium",
    block_id: "b_offline_002",
    artifact_id: "pet_triage_offline_architecture",
    canonical_revision_id: "rev_d252eb5b2bc6",
    accepted_by: "p10_operator",
    release_decision_id: "p10_decision_offline_migration",
    why_accepted: "Offline decision tree is versioned and updated on connectivity restore. Risk: stale rules in prolonged offline periods.",
    mitigation: "Display rule version age indicator in UI. Alert if rules are > 7 days old.",
    created_at: ts,
  },
  {
    risk_id: "p10_risk_stuck_retry_queue",
    source_issue_id: "p10_risk_stuck_retry_queue",
    issue_type: "operational_risk",
    severity: "medium",
    block_id: "b_sync_003",
    artifact_id: "pet_triage_offline_architecture",
    canonical_revision_id: "rev_d252eb5b2bc6",
    accepted_by: "p10_operator",
    release_decision_id: "p10_decision_offline_migration",
    why_accepted: "Retry queue uses exponential backoff with terminal failure after max attempts. Pending reports may accumulate during extended outages.",
    mitigation: "Expose queue depth metric. Alert if > 50 pending reports. Manual drain endpoint for operators.",
    created_at: ts,
  },
  {
    risk_id: "p10_risk_local_lint_debt",
    source_issue_id: "p10_risk_local_lint_debt",
    issue_type: "toolchain_debt",
    severity: "low",
    block_id: "n/a",
    artifact_id: "pet_triage_offline_interface",
    canonical_revision_id: "rev_a1695505f72c",
    accepted_by: "p10_operator",
    release_decision_id: "p10_decision_consistency_pass",
    why_accepted: "73 local lint residuals are tool-classification gaps (undefined_term, domain_irrelevant_content). They do not affect cross-artifact consistency or requirement traceability.",
    mitigation: "Extend linter dictionary with pet-triage domain terms. Schedule lint cleanup pass.",
    created_at: ts,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P10-007: DecisionLog + RiskRegister + Signoff       ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Write decisions
  console.log("  [1/3] Recording decisions...");
  for (const d of DECISIONS) {
    await appendDecisionEntry(STORE_ROOT, d);
    console.log(`    ✅ ${d.decision_id}`);
  }

  // Write risks
  console.log("\n  [2/3] Recording risks...");
  const written = await appendRiskEntries(STORE_ROOT, RISKS);
  console.log(`    ✅ ${written} risk entries written (${RISKS.length - written} deduplicated)`);

  // Verify
  console.log("\n  [3/3] Verifying...");
  const decisionsFile = join(STORE_ROOT, "decisions", "decisions.jsonl");
  const risksFile = join(STORE_ROOT, "risks", "risks.jsonl");

  const decisionLines = (await fs.readFile(decisionsFile, "utf8")).trim().split("\n").filter(Boolean);
  const riskLines = (await fs.readFile(risksFile, "utf8")).trim().split("\n").filter(Boolean);

  console.log(`    Decision entries: ${decisionLines.length}`);
  console.log(`    Risk entries: ${riskLines.length}`);

  // Print summary
  console.log("\n  ══════════════════════════════════════════════════");
  console.log("  P10-007 SIGNOFF REPORT");
  console.log("  ══════════════════════════════════════════════════\n");

  console.log("  Decisions recorded:");
  for (const d of DECISIONS) {
    console.log(`    • ${d.decision_type}: ${d.decision_id}`);
  }

  console.log("\n  Risks recorded:");
  for (const r of RISKS) {
    console.log(`    • [${r.severity}] ${r.risk_id}`);
  }

  console.log(`\n  ── P10-007: ✅ COMPLETE ──`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main().catch(err => { console.error("Failed:", err); process.exit(1); });
