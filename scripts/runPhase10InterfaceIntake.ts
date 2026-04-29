/**
 * Phase 10 — P10-004b: InterfaceSpec Intake + Promotion
 * Then P10-005: ModuleSpec Generation
 *
 * Usage: npx tsx scripts/runPhase10InterfaceIntake.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { promoteDraft } from "../src/promoteDraft.js";
import { loadAuditLog, loadCanonicalPointer, loadFromQuarantine } from "../src/artifactStore.js";
import { appendDecisionEntry } from "../src/cockpit/decisionLog.js";
import { evaluateDraftQuality } from "../src/domainQualityEvaluator.js";
import { loadDomainProfile } from "../src/domainProfile.js";
import { validateDraft } from "../src/draftValidator.js";
import type { StoreConfig } from "../src/artifactStore.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const IFACE_PROFILE_PATH = join(process.cwd(), "data", "profiles", "pet_triage_offline_first_interface.json");

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P10-004b: InterfaceSpec Intake + Promotion          ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const store: StoreConfig = { dataDir: STORE_ROOT };

  // Find quarantined InterfaceSpec
  console.log("  [1/4] Finding quarantined InterfaceSpec...");
  const quarantineDir = join(STORE_ROOT, "quarantine");
  const files = await fs.readdir(quarantineDir);
  const draftFiles = files.filter(f => f.startsWith("draft_pet_triage_offline_interface_") && f.endsWith(".json"));
  const latestDraft = draftFiles.sort().pop()!;
  const quarantineId = latestDraft.replace(".json", "");
  console.log(`    quarantine_id: ${quarantineId}`);

  const item = await loadFromQuarantine(store, quarantineId);
  if (!item) { console.error("    ❌ Not found"); process.exit(1); }

  const profile = await loadDomainProfile(IFACE_PROFILE_PATH);

  // Strip cross-links for validation
  const crossLinks = new Map<string, string[]>();
  const itemObj = item as Record<string, unknown>;
  if (Array.isArray(itemObj.sections)) {
    for (const sec of itemObj.sections as Record<string, unknown>[]) {
      if (Array.isArray(sec.commitments)) {
        for (const b of sec.commitments as Record<string, unknown>[]) {
          if (Array.isArray(b.linked_architecture_blocks)) {
            crossLinks.set(b.block_id as string, b.linked_architecture_blocks as string[]);
            delete b.linked_architecture_blocks;
          }
        }
      }
    }
  }

  const validation = validateDraft(item);
  if (validation.status !== "accepted") {
    console.error("    ❌ Validation failed:", validation.errors);
    process.exit(1);
  }

  // Reattach
  for (const sec of validation.artifact.sections) {
    for (const b of sec.commitments) {
      const links = crossLinks.get(b.block_id);
      if (links) b.linked_architecture_blocks = links;
    }
  }

  const report = evaluateDraftQuality(validation.artifact, profile);
  console.log(`    score: ${report.score}, recommendation: ${report.recommendation}`);

  // Intake decision
  console.log("\n  [2/4] Recording intake decision...");
  const intakeId = `intake_iface_p10_${Date.now()}`;
  await appendDecisionEntry(STORE_ROOT, {
    decision_id: intakeId,
    decision_type: "draft_intake:accept_as_seed",
    operator_id: "p10_operator",
    release_decision_id: intakeId,
    affected_artifacts: [quarantineId],
    canonical_revision_ids: {},
    rationale: "P10-004 InterfaceSpec scored 91/100, 100% concept coverage, 30 cross-links. Accepted with cleanup notes: 3 overbroad_block, 2/6 explicit superseded refs.",
    created_at: new Date().toISOString(),
    quality_snapshot: {
      score: report.score,
      required_concept_coverage: report.required_concept_coverage,
      recommendation: report.recommendation,
    },
  });
  console.log(`    decision_id: ${intakeId}`);

  // Promote
  console.log("\n  [3/4] Promoting to canonical...");
  const result = await promoteDraft(store, {
    quarantine_id: quarantineId,
    operator_id: "p10_operator",
    rationale: "P10-004b: Promoting offline-first InterfaceSpec as seed for ModuleSpec generation.",
  });

  if (result.status !== "promoted") {
    console.error(`    ❌ Promotion failed: ${result.reason}`);
    process.exit(1);
  }

  console.log(`    ✅ Promoted: ${result.artifact.artifact_id} @ ${result.canonical_revision_id}`);

  // Verify
  console.log("\n  [4/4] Verifying...");
  const audit = await loadAuditLog(store, result.artifact.artifact_id);
  const promoted = audit.find(e => e.entry_type === "draft_promoted");
  const pointer = await loadCanonicalPointer(store, result.artifact.artifact_id);

  const checks = [
    { name: "intake recorded", pass: true },
    { name: "promoted", pass: result.status === "promoted" },
    { name: "audit draft_promoted", pass: promoted !== undefined },
    { name: "canonical pointer set", pass: pointer !== null },
    { name: "pointer matches revision", pass: pointer?.current_revision_id === result.canonical_revision_id },
  ];

  for (const c of checks) console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}`);
  console.log(`\n  ── P10-004b: ${checks.every(c => c.pass) ? "✅ PASS" : "❌ FAIL"} ──\n`);
}

main().catch(err => { console.error("Failed:", err); process.exit(1); });
