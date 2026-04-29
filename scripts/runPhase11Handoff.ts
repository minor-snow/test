/**
 * Phase 11.1 — Handoff Package Generation + Structural Term Closure + Readiness
 *
 * Usage: npx tsx scripts/runPhase11Handoff.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { loadCanonicalRevision } from "../src/artifactStore.js";
import { generateHandoffPackage } from "../src/handoff/generateHandoffPackage.js";
import { evaluateHandoffReadiness } from "../src/handoff/handoffReadinessEvaluator.js";
import { resolveStructuralTerms } from "../src/handoff/structuralTermResolver.js";
import { loadRegister } from "../src/handoff/uncertaintyRegister.js";
import type { StoreConfig } from "../src/artifactStore.js";
import type { SourceArtifactRef } from "../src/handoff/types.js";
import type { RiskRegisterEntry } from "../src/handoff/generateHandoffPackage.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const HANDOFF_DIR = join(STORE_ROOT, "handoff");

async function loadRisks(): Promise<RiskRegisterEntry[]> {
  const risksPath = join(STORE_ROOT, "risks", "risks.jsonl");
  try {
    const content = await fs.readFile(risksPath, "utf8");
    return content.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P11.1: Handoff + Structural Term Closure            ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const store: StoreConfig = { dataDir: STORE_ROOT };

  // Load canonical artifacts
  console.log("  [1/7] Loading canonical artifacts...");
  const arch = await loadCanonicalRevision(store, "pet_triage_offline_architecture");
  const iface = await loadCanonicalRevision(store, "pet_triage_offline_interface");
  const mod = await loadCanonicalRevision(store, "pet_triage_offline_module");

  if (!arch || !iface || !mod) {
    console.error("    ❌ Missing canonical artifacts");
    process.exit(1);
  }

  console.log(`    ✅ ${arch.artifact_id} @ ${arch.revision_id}`);
  console.log(`    ✅ ${iface.artifact_id} @ ${iface.revision_id}`);
  console.log(`    ✅ ${mod.artifact_id} @ ${mod.revision_id}`);

  // Load risks
  const risks = await loadRisks();
  console.log(`    Risks loaded: ${risks.length}`);

  // Generate handoff package
  console.log("\n  [2/7] Generating handoff package...");
  const result = generateHandoffPackage(arch, iface, mod, risks);
  const { pkg, contracts, conflicts, dataModels, stateMachines, renderMarkdown } = result;

  console.log(`    Contract definitions: ${contracts.mandatory_coverage.covered}/${contracts.mandatory_coverage.total}`);
  if (contracts.mandatory_coverage.missing.length > 0) {
    console.log(`    ⚠️  Missing terms: ${contracts.mandatory_coverage.missing.join(", ")}`);
  }
  console.log(`    Unknown structural terms: ${contracts.unknown_structural_terms.length}`);
  console.log(`    Conflict policy entries: ${conflicts.field_groups_covered}`);
  console.log(`    Clinical LWW violations: ${conflicts.clinical_lww_violations.length}`);
  console.log(`    Data models: ${dataModels.room_entity_count} Room + ${dataModels.network_dto_count} DTO`);
  console.log(`    Unknown field types: ${dataModels.unknown_field_types.length}`);
  console.log(`    State machines: ${stateMachines.machines.length}`);
  console.log(`    Orphan states: ${stateMachines.orphan_states.length}`);
  console.log(`    Implementation tasks: ${pkg.implementation_tasks.length}`);
  console.log(`    Forbidden assumptions: ${pkg.forbidden_assumptions.length}`);
  console.log(`    Risk notes: ${pkg.risk_notes.length}`);

  // Structural term closure
  console.log("\n  [3/7] Resolving structural terms...");
  const closure = resolveStructuralTerms(contracts.unknown_structural_terms, pkg);
  console.log(`    Total unknown: ${closure.total_unknown_structural_terms}`);
  console.log(`    Resolved: ${closure.resolved_count}`);
  console.log(`    Unresolved: ${closure.unresolved_count}`);

  for (const r of closure.resolved_terms) {
    console.log(`    ✅ ${r.term} → ${r.resolved_by} (${r.reason})`);
  }
  for (const u of closure.unresolved_terms) {
    console.log(`    ❌ ${u.term}: ${u.reason}`);
  }

  // Run readiness evaluator (now with unresolved terms)
  console.log("\n  [4/7] Evaluating readiness...");
  const canonicalRefs: SourceArtifactRef[] = [
    { artifact_id: arch.artifact_id, artifact_type: arch.artifact_type, revision_id: arch.revision_id },
    { artifact_id: iface.artifact_id, artifact_type: iface.artifact_type, revision_id: iface.revision_id },
    { artifact_id: mod.artifact_id, artifact_type: mod.artifact_type, revision_id: mod.revision_id },
  ];

  const unresolvedTermNames = closure.unresolved_terms.map(t => t.term);

  // Load uncertainty register (P13-C)
  const uncertaintyPath = join(STORE_ROOT, "uncertainty_register.json");
  const uncertaintyRegister = await loadRegister(uncertaintyPath);
  const blockingCount = uncertaintyRegister.entries.filter(
    e => e.status === "open" && e.blocking_decisions.length > 0
  ).length;
  if (uncertaintyRegister.entries.length > 0) {
    console.log(`    Uncertainty register: ${uncertaintyRegister.entries.length} entries, ${blockingCount} blocking`);
  }

  const readiness = evaluateHandoffReadiness(
    pkg,
    canonicalRefs,
    contracts.mandatory_coverage.total,
    contracts.mandatory_coverage.missing,
    unresolvedTermNames,
    uncertaintyRegister,
  );

  for (const c of readiness.checks) {
    const icon = c.status === "pass" ? "✅" : c.status === "warning" ? "⚠️" : "❌";
    console.log(`    ${icon} ${c.check_id}: ${c.message}`);
  }

  console.log(`\n    Readiness: ${readiness.status.toUpperCase()}`);

  // Save outputs
  console.log("\n  [5/7] Saving outputs...");
  await fs.mkdir(HANDOFF_DIR, { recursive: true });

  await fs.writeFile(join(HANDOFF_DIR, "handoff_package.json"), JSON.stringify(pkg, null, 2), "utf8");
  console.log("    ✅ handoff_package.json");

  await fs.writeFile(join(HANDOFF_DIR, "HANDOFF.md"), renderMarkdown(closure), "utf8");
  console.log("    ✅ HANDOFF.md");

  await fs.writeFile(join(HANDOFF_DIR, "HANDOFF-READINESS-report.json"), JSON.stringify(readiness, null, 2), "utf8");
  console.log("    ✅ HANDOFF-READINESS-report.json");

  // Save structural term closure report
  console.log("\n  [6/7] Saving structural term closure...");
  await fs.writeFile(join(HANDOFF_DIR, "structural_term_closure_report.json"), JSON.stringify(closure, null, 2), "utf8");
  console.log("    ✅ structural_term_closure_report.json");

  // Save projection metadata (upgraded)
  await fs.writeFile(join(HANDOFF_DIR, "projection_metadata.json"), JSON.stringify({
    contracts_coverage: contracts.mandatory_coverage,
    unknown_structural_terms: contracts.unknown_structural_terms,
    structural_term_closure: {
      total: closure.total_unknown_structural_terms,
      resolved: closure.resolved_count,
      unresolved: closure.unresolved_count,
      resolution_report_path: "structural_term_closure_report.json",
    },
    conflict_matrix: {
      field_groups_covered: conflicts.field_groups_covered,
      clinical_lww_violations: conflicts.clinical_lww_violations,
    },
    data_models: {
      room_entities: dataModels.room_entity_count,
      network_dtos: dataModels.network_dto_count,
      unknown_field_types: dataModels.unknown_field_types,
    },
    state_machines: {
      count: stateMachines.machines.length,
      total_states: stateMachines.total_states,
      total_transitions: stateMachines.total_transitions,
      total_forbidden: stateMachines.total_forbidden,
      orphan_states: stateMachines.orphan_states,
    },
    tasks_count: pkg.implementation_tasks.length,
    forbidden_assumptions_count: pkg.forbidden_assumptions.length,
    risk_notes_count: pkg.risk_notes.length,
  }, null, 2), "utf8");
  console.log("    ✅ projection_metadata.json");

  // Acceptance criteria check
  console.log("\n  [7/7] Acceptance criteria...");
  const criteria = [
    { name: "handoff_package.json generated", pass: true },
    { name: "HANDOFF.md generated", pass: true },
    { name: "Contract terms covered", pass: contracts.mandatory_coverage.missing.length === 0 },
    { name: "Conflict matrix complete", pass: conflicts.field_groups_covered >= 13 },
    { name: "No clinical LWW violations", pass: conflicts.clinical_lww_violations.length === 0 },
    { name: "Room entities >= 6", pass: dataModels.room_entity_count >= 6 },
    { name: "Network DTOs >= 7", pass: dataModels.network_dto_count >= 7 },
    { name: "State machines >= 3", pass: stateMachines.machines.length >= 3 },
    { name: "Tasks >= 8", pass: pkg.implementation_tasks.length >= 8 },
    { name: "Forbidden assumptions >= 6", pass: pkg.forbidden_assumptions.length >= 6 },
    { name: "Structural term closure", pass: closure.unresolved_count === 0 },
    { name: "Readiness != not_ready", pass: readiness.status !== "not_ready" },
  ];

  let allPass = true;
  for (const c of criteria) {
    console.log(`    ${c.pass ? "✅" : "❌"} ${c.name}`);
    if (!c.pass) allPass = false;
  }

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P11.1 HANDOFF + TERM CLOSURE: ${allPass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Readiness: ${readiness.status.toUpperCase()}`);
  console.log(`  Structural terms: ${closure.resolved_count}/${closure.total_unknown_structural_terms} resolved`);
  console.log(`  ══════════════════════════════════════════════════`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main().catch(err => { console.error("P11.1 failed:", err); process.exit(1); });
