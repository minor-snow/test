/**
 * Phase 10 — P10-005: ModuleSpec Generation
 * Usage: npx tsx scripts/runPhase10Module.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import { generateModuleSpecDraft } from "../src/trial/draftAgent.js";
import { validateDraft } from "../src/draftValidator.js";
import { loadDomainProfile } from "../src/domainProfile.js";
import { evaluateDraftQuality } from "../src/domainQualityEvaluator.js";
import { saveToQuarantine, loadCanonicalPointer, loadCanonicalRevision } from "../src/artifactStore.js";
import { promoteDraft } from "../src/promoteDraft.js";
import { appendDecisionEntry } from "../src/cockpit/decisionLog.js";
import type { Artifact } from "../src/types.js";
import type { StoreConfig } from "../src/artifactStore.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "sk-90b71c8c415b41ac93f7ff4e24a08a7c";
const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const MOD_PROFILE_PATH = join(process.cwd(), "data", "profiles", "pet_triage_offline_first_module.json");

function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

function normalize(parsed: unknown): { crossArchLinks: Map<string, string[]>; crossIfaceLinks: Map<string, string[]> } {
  const obj = parsed as Record<string, unknown>;
  if (!obj.artifact_id) {
    obj.artifact_id = "pet_triage_offline_module";
    console.log("    Injected artifact_id: pet_triage_offline_module");
  }
  const crossArchLinks = new Map<string, string[]>();
  const crossIfaceLinks = new Map<string, string[]>();
  if (Array.isArray(obj.sections)) {
    let remapped = 0, titleFixed = 0;
    for (const sec of obj.sections as Record<string, unknown>[]) {
      if (Array.isArray(sec.blocks) && !Array.isArray(sec.commitments)) {
        sec.commitments = sec.blocks; delete sec.blocks; remapped++;
      }
      if (sec.name && !sec.title) { sec.title = sec.name; delete sec.name; titleFixed++; }
      // Fallback: derive title from section_id if both name and title are missing
      if (!sec.title && sec.section_id && typeof sec.section_id === "string") {
        sec.title = (sec.section_id as string)
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        titleFixed++;
      }
      if (Array.isArray(sec.commitments)) {
        for (const b of sec.commitments as Record<string, unknown>[]) {
          if (Array.isArray(b.linked_architecture_blocks)) {
            crossArchLinks.set(b.block_id as string, b.linked_architecture_blocks as string[]);
            delete b.linked_architecture_blocks;
          }
          if (Array.isArray(b.linked_interface_blocks)) {
            crossIfaceLinks.set(b.block_id as string, b.linked_interface_blocks as string[]);
            delete b.linked_interface_blocks;
          }
        }
      }
    }
    if (remapped > 0) console.log(`    blocks→commitments: ${remapped}`);
    if (titleFixed > 0) console.log(`    name→title: ${titleFixed}`);
  }
  return { crossArchLinks, crossIfaceLinks };
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P10-005: ModuleSpec Generation + Intake             ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const store: StoreConfig = { dataDir: STORE_ROOT };
  const profile = await loadDomainProfile(MOD_PROFILE_PATH);

  const architecture = await loadCanonicalRevision(store, "pet_triage_offline_architecture");
  const interfaceSpec = await loadCanonicalRevision(store, "pet_triage_offline_interface");
  if (!architecture || !interfaceSpec) { console.error("❌ Missing canonical artifacts"); process.exit(1); }

  console.log(`  Architecture: ${architecture.artifact_id} @ ${architecture.revision_id}`);
  console.log(`  Interface: ${interfaceSpec.artifact_id} @ ${interfaceSpec.revision_id}`);

  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY, model: "deepseek-chat", maxTokens: 8192, temperature: 0.4,
  });

  // Generate
  console.log("\n  [1/6] Calling DeepSeek for ModuleSpec...");
  const rawOutput = await generateModuleSpecDraft(client, { architecture, interfaceSpec, profile });

  const evidenceDir = join(STORE_ROOT, "evidence");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(join(evidenceDir, "p10_005_raw_output.txt"), rawOutput, "utf8");

  // Parse + normalize
  console.log("  [2/6] Parsing...");
  const cleaned = stripCodeFences(rawOutput);
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch (e) {
    console.error(`    ❌ Parse failed: ${(e as Error).message}`);
    await fs.writeFile(join(evidenceDir, "p10_005_cleaned.txt"), cleaned, "utf8");
    process.exit(1);
  }

  const { crossArchLinks, crossIfaceLinks } = normalize(parsed);
  console.log(`    Cross-links: ${crossArchLinks.size} arch, ${crossIfaceLinks.size} iface`);

  // Validate
  console.log("  [3/6] Validating...");
  const validation = validateDraft(parsed);
  if (validation.status === "rejected") {
    console.error("    ❌ Rejected:");
    for (const e of validation.errors) console.error(`      • ${e}`);
    process.exit(1);
  }

  const artifact = validation.artifact;
  // Reattach cross-links
  for (const sec of artifact.sections) {
    for (const b of sec.commitments) {
      const al = crossArchLinks.get(b.block_id);
      if (al) b.linked_architecture_blocks = al;
      const il = crossIfaceLinks.get(b.block_id);
      if (il) b.linked_interface_blocks = il;
    }
  }

  const blockCount = artifact.sections.reduce((s, sec) => s + sec.commitments.length, 0);
  console.log(`    ✅ Valid: ${artifact.sections.length} sections, ${blockCount} blocks`);

  // Quarantine
  console.log("  [4/6] Quarantine + quality...");
  const quarantineId = `draft_${artifact.artifact_id}_${Date.now()}`;
  await saveToQuarantine(store, quarantineId, artifact);

  const report = evaluateDraftQuality(artifact, profile);
  let totalArchLinks = 0, totalIfaceLinks = 0;
  for (const sec of artifact.sections) {
    for (const b of sec.commitments) {
      if (b.linked_architecture_blocks) totalArchLinks += b.linked_architecture_blocks.length;
      if (b.linked_interface_blocks) totalIfaceLinks += b.linked_interface_blocks.length;
    }
  }

  // Intake + promote (gated on quality)
  console.log("  [5/6] Intake + promote...");

  let promoteResult: { status: string; canonical_revision_id?: string; artifact?: any; reason?: string } =
    { status: "blocked", reason: "quality_gate" };

  const qualitySnapshot = {
    score: report.score,
    required_concept_coverage: report.required_concept_coverage,
    recommendation: report.recommendation,
    blocking_issues_count: report.blocking_issues.length,
    issue_breakdown: report.issue_breakdown,
  };

  if (report.recommendation === "reject_draft") {
    // Record rejection — do NOT intake or promote
    const rejectId = `reject_mod_p10_${Date.now()}`;
    await appendDecisionEntry(STORE_ROOT, {
      decision_id: rejectId,
      decision_type: "draft_intake:reject_draft",
      operator_id: "p10_operator",
      release_decision_id: rejectId,
      affected_artifacts: [quarantineId],
      canonical_revision_ids: {},
      rationale: `P10-005 ModuleSpec rejected by quality gate: score=${report.score}, recommendation=${report.recommendation}, ${blockCount} blocks, ${report.blocking_issues.length} blocking issues.`,
      created_at: new Date().toISOString(),
      quality_snapshot: qualitySnapshot,
    });
    console.log(`    ❌ Quality gate blocked intake: recommendation=${report.recommendation}, score=${report.score}`);
    console.log(`    Decision recorded: draft_intake:reject_draft`);
  } else {
    // Quality gate passed — proceed with intake + promote
    const intakeId = `intake_mod_p10_${Date.now()}`;
    await appendDecisionEntry(STORE_ROOT, {
      decision_id: intakeId,
      decision_type: "draft_intake:accept_as_seed",
      operator_id: "p10_operator",
      release_decision_id: intakeId,
      affected_artifacts: [quarantineId],
      canonical_revision_ids: {},
      rationale: `P10-005 ModuleSpec: score=${report.score}, coverage=${(report.required_concept_coverage*100).toFixed(0)}%, ${blockCount} blocks.`,
      created_at: new Date().toISOString(),
      quality_snapshot: qualitySnapshot,
    });

    promoteResult = await promoteDraft(store, {
      quarantine_id: quarantineId,
      operator_id: "p10_operator",
      rationale: "P10-005: ModuleSpec promotion after quality gate pass.",
    });
    console.log(`    ✅ Intake + promotion: ${promoteResult.status}`);
  }

  // Report
  console.log("\n  ══════════════════════════════════════════════════");
  console.log("  P10-005 MODULESPEC REPORT");
  console.log("  ══════════════════════════════════════════════════\n");

  console.log(`  artifact_id:              ${artifact.artifact_id}`);
  console.log(`  sections:                 ${artifact.sections.length}`);
  console.log(`  blocks:                   ${blockCount}`);
  console.log(`  score:                    ${report.score}`);
  console.log(`  concept_coverage:         ${(report.required_concept_coverage * 100).toFixed(0)}%`);
  console.log(`  recommendation:           ${report.recommendation}`);
  console.log(`  linked_architecture_blocks: ${totalArchLinks}`);
  console.log(`  linked_interface_blocks:  ${totalIfaceLinks}`);
  console.log(`  promoted:                 ${promoteResult.status === "promoted" ? "✅" : "❌"}`);
  if (promoteResult.status === "promoted") {
    console.log(`  canonical_revision:       ${promoteResult.canonical_revision_id}`);
  }

  console.log("\n  Issue breakdown:");
  for (const [type, count] of Object.entries(report.issue_breakdown)) console.log(`    ${type}: ${count}`);

  console.log("\n  Concept matches:");
  for (const cm of report.concept_matches) {
    console.log(`    ${cm.concept}: ${cm.matched ? "✅" : "❌"} ${cm.matched_by || "missing"}`);
  }

  // Pass/fail
  console.log("\n  ── Pass/Fail ──\n");
  const checks = [
    { name: "score >= 75", pass: report.score >= 75, val: report.score },
    { name: "coverage >= 80%", pass: report.required_concept_coverage >= 0.8, val: `${(report.required_concept_coverage*100).toFixed(0)}%` },
    { name: "blocks 20-35", pass: blockCount >= 20 && blockCount <= 35, val: blockCount },
    { name: "arch cross-links >= 10", pass: totalArchLinks >= 10, val: totalArchLinks },
    { name: "iface cross-links >= 10", pass: totalIfaceLinks >= 10, val: totalIfaceLinks },
    { name: "promoted", pass: promoteResult.status === "promoted", val: promoteResult.status },
  ];
  for (const c of checks) console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}: ${c.val}`);

  await fs.writeFile(join(evidenceDir, "p10_005_artifact.json"), JSON.stringify(artifact, null, 2), "utf8");
  await fs.writeFile(join(evidenceDir, "p10_005_quality_report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log(`\n  ── Overall: ${checks.every(c => c.pass) ? "✅ P10-005 PASS" : "❌ P10-005 NEEDS REVIEW"} ──`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main().catch(err => { console.error("Failed:", err); process.exit(1); });
