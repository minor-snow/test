/**
 * Phase 10 — P10-002: Migration-Aware ArchitectureDraft Generation
 *
 * Generates an offline-first ArchitectureDraft from:
 *   - Existing pet_triage_architecture baseline
 *   - Business change (offline-first migration)
 *   - Superseded constraints from project brief
 *   - Pet triage DomainProfile
 *
 * Validates quarantine-only invariant (BUG-6 regression).
 *
 * Usage: npx tsx scripts/runPhase10Migration.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import { generateMigrationDraft, type SupersededConstraint } from "../src/trial/draftAgent.js";
import { validateDraft } from "../src/draftValidator.js";
import { loadDomainProfile } from "../src/domainProfile.js";
import { evaluateDraftQuality } from "../src/domainQualityEvaluator.js";
import { saveToQuarantine, loadCanonicalPointer } from "../src/artifactStore.js";
import type { Artifact } from "../src/types.js";
import type { StoreConfig } from "../src/artifactStore.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY ?? "sk-90b71c8c415b41ac93f7ff4e24a08a7c";
const MODEL = "deepseek-chat";
const TEMPERATURE = 0.4;
const MAX_TOKENS = 8192; // migration drafts are larger

const PROFILE_PATH = join(process.cwd(), "data", "profiles", "pet_triage_offline_first.json");
const BRIEF_PATH = join(process.cwd(), "data", "dogfood", "p10", "project_brief.json");
const BASELINE_PATH = join(process.cwd(), "data", "dogfood", "p10", "baseline", "pet_triage_architecture.json");
const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");

const BUSINESS_CHANGE = `Evolve the existing online-first pet triage system into an offline-first Android architecture.
The Android client must:
- Execute multi-step triage decision trees locally without network
- Persist pending triage reports locally that survive app restart
- Synchronize pending reports with multi-clinic cloud backends asynchronously
- Use Vector Clock for conflict-sensitive clinical fields (diagnosis, vet edits, case status)
- Use Last-Writer-Wins for low-risk derived metadata (UI cursors, cache timestamps)
- Present deterministic conflict outcomes to clinicians when cloud-side edits conflict
- Never silently overwrite cloud-side veterinary modifications
- Never force user to re-enter data after offline completion`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P10-002: Migration-Aware ArchitectureDraft          ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Load inputs
  console.log("  Loading inputs...");
  const profile = await loadDomainProfile(PROFILE_PATH);
  console.log(`    Profile: ${profile.profile_id}`);

  const briefRaw = await fs.readFile(BRIEF_PATH, "utf8");
  const brief = JSON.parse(briefRaw);
  console.log(`    Brief: ${brief.project_id}`);

  const baselineRaw = await fs.readFile(BASELINE_PATH, "utf8");
  const existingArchitecture = JSON.parse(baselineRaw) as Artifact;
  console.log(`    Baseline: ${existingArchitecture.artifact_id} @ ${existingArchitecture.revision_id}`);

  const supersededConstraints: SupersededConstraint[] = brief.superseded_constraints.map(
    (sc: any) => ({
      block_id: sc.block_id,
      text: sc.text,
      reason: sc.reason,
      replacement_intent: sc.replacement_intent,
    })
  );
  console.log(`    Superseded constraints: ${supersededConstraints.length}`);

  // Create client
  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: MODEL,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  // Generate
  console.log("\n  [1/6] Calling DeepSeek for migration draft...");
  const rawOutput = await generateMigrationDraft(client, {
    idea: BUSINESS_CHANGE,
    existingArchitecture,
    supersededConstraints,
    profile,
  });

  // Save raw output
  const evidenceDir = join(STORE_ROOT, "evidence");
  await ensureDir(evidenceDir);
  await fs.writeFile(join(evidenceDir, "p10_002_raw_output.txt"), rawOutput, "utf8");
  console.log("    Raw output saved.");

  // Parse
  console.log("  [2/6] Parsing JSON...");
  const cleaned = stripCodeFences(rawOutput);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error(`    ❌ JSON parse failed: ${(e as Error).message}`);
    await fs.writeFile(join(evidenceDir, "p10_002_cleaned.txt"), cleaned, "utf8");
    process.exit(1);
  }

  // Normalize common LLM deviations before validation
  console.log("  [2b/6] Normalizing LLM output...");
  const obj = parsed as Record<string, unknown>;

  // LLMs often omit artifact_id — inject from project brief
  if (!obj.artifact_id) {
    obj.artifact_id = "pet_triage_offline_architecture";
    console.log("    Injected artifact_id: pet_triage_offline_architecture");
  }

  // LLMs sometimes use "blocks" instead of "commitments"
  if (Array.isArray(obj.sections)) {
    let remapped = 0;
    for (const section of obj.sections as Record<string, unknown>[]) {
      if (Array.isArray(section.blocks) && !Array.isArray(section.commitments)) {
        section.commitments = section.blocks;
        delete section.blocks;
        remapped++;
      }
    }
    if (remapped > 0) {
      console.log(`    Remapped "blocks" → "commitments" in ${remapped} sections`);
    }
  }

  // Validate
  console.log("  [3/6] Running DraftValidator...");
  const validation = validateDraft(parsed);
  if (validation.status === "rejected") {
    console.error("    ❌ Validation failed:");
    for (const err of validation.errors) console.error(`      • ${err}`);
    await fs.writeFile(
      join(evidenceDir, "p10_002_validation.json"),
      JSON.stringify({ status: "rejected", errors: validation.errors }, null, 2),
      "utf8"
    );
    process.exit(1);
  }

  const artifact = validation.artifact;
  const blockCount = artifact.sections.reduce((s, sec) => s + sec.commitments.length, 0);
  console.log(`    ✅ Valid: ${artifact.sections.length} sections, ${blockCount} blocks`);
  if (validation.warnings.length > 0) {
    console.log(`    Warnings: ${validation.warnings.length}`);
  }

  // Save to quarantine
  console.log("  [4/6] Saving to quarantine...");
  const store: StoreConfig = { dataDir: STORE_ROOT };
  const quarantineId = `draft_${artifact.artifact_id}_${Date.now()}`;
  await saveToQuarantine(store, quarantineId, artifact);
  console.log(`    quarantine_id: ${quarantineId}`);

  // BUG-6 regression check
  const canonicalPointer = await loadCanonicalPointer(store, artifact.artifact_id);
  const canonicalExists = canonicalPointer !== null;
  console.log(`    canonical_pointer_exists: ${canonicalExists} ${canonicalExists ? "❌ BUG-6 REGRESSION" : "✅"}`);

  // Quality evaluation
  console.log("  [5/6] Evaluating quality...");
  const report = evaluateDraftQuality(artifact, profile);

  // Check superseded constraint coverage
  const allBlockTexts = artifact.sections
    .flatMap(s => s.commitments)
    .map(b => (b.text + " " + (b.rationale || "")).toLowerCase());
  const supersededCoverage = supersededConstraints.map(sc => {
    const referenced = allBlockTexts.some(
      t => t.includes(sc.block_id.toLowerCase()) || t.includes(sc.replacement_intent.toLowerCase().slice(0, 30))
    );
    return { block_id: sc.block_id, referenced };
  });
  const supersededRefCount = supersededCoverage.filter(s => s.referenced).length;

  // Print report
  console.log("\n  ══════════════════════════════════════════════════");
  console.log("  P10-002 MIGRATION DRAFT REPORT");
  console.log("  ══════════════════════════════════════════════════\n");

  console.log(`  artifact_id:              ${artifact.artifact_id}`);
  console.log(`  sections:                 ${artifact.sections.length}`);
  console.log(`  blocks:                   ${blockCount}`);
  console.log(`  score:                    ${report.score}`);
  console.log(`  concept_coverage:         ${(report.required_concept_coverage * 100).toFixed(0)}%`);
  console.log(`  recommendation:           ${report.recommendation}`);
  console.log(`  quarantine_id:            ${quarantineId}`);
  console.log(`  canonical_pointer_exists: ${canonicalExists}`);

  console.log("\n  Issue breakdown:");
  for (const [type, count] of Object.entries(report.issue_breakdown)) {
    console.log(`    ${type}: ${count}`);
  }

  console.log("\n  Concept matches:");
  for (const cm of report.concept_matches) {
    const icon = cm.matched ? "✅" : (cm.excluded_placeholder ? "⚠️" : "❌");
    console.log(`    ${cm.concept}: ${icon} ${cm.matched_by || (cm.excluded_placeholder ? "placeholder" : "missing")}`);
  }

  console.log("\n  Superseded constraint references:");
  for (const sc of supersededCoverage) {
    console.log(`    ${sc.block_id}: ${sc.referenced ? "✅" : "❌"}`);
  }
  console.log(`    Total referenced: ${supersededRefCount}/${supersededConstraints.length}`);

  console.log("\n  Blocking issues:");
  if (report.blocking_issues.length === 0) {
    console.log("    None ✅");
  } else {
    for (const issue of report.blocking_issues) {
      console.log(`    • [${issue.severity}] ${issue.message}`);
    }
  }

  // Save full evidence
  console.log("\n  [6/6] Saving evidence...");
  await fs.writeFile(
    join(evidenceDir, "p10_002_artifact.json"),
    JSON.stringify(artifact, null, 2),
    "utf8"
  );
  await fs.writeFile(
    join(evidenceDir, "p10_002_quality_report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  await fs.writeFile(
    join(evidenceDir, "p10_002_validation.json"),
    JSON.stringify({ status: "accepted", warnings: validation.warnings }, null, 2),
    "utf8"
  );
  await fs.writeFile(
    join(evidenceDir, "p10_002_superseded_coverage.json"),
    JSON.stringify({ supersededCoverage, supersededRefCount }, null, 2),
    "utf8"
  );

  // Pass/fail
  console.log("\n  ── Pass/Fail ──\n");
  const checks = [
    { name: "score >= 75", pass: report.score >= 75, val: report.score },
    { name: "concept_coverage >= 80%", pass: report.required_concept_coverage >= 0.8, val: `${(report.required_concept_coverage * 100).toFixed(0)}%` },
    { name: "missing_required_section = 0", pass: (report.issue_breakdown["missing_required_section"] || 0) === 0, val: report.issue_breakdown["missing_required_section"] || 0 },
    { name: "domain_irrelevant_content = 0", pass: (report.issue_breakdown["domain_irrelevant_content"] || 0) === 0, val: report.issue_breakdown["domain_irrelevant_content"] || 0 },
    { name: "placeholder_concept = 0", pass: (report.issue_breakdown["placeholder_concept"] || 0) === 0, val: report.issue_breakdown["placeholder_concept"] || 0 },
    { name: "canonical_pointer_exists = false", pass: !canonicalExists, val: canonicalExists },
    { name: "blocks >= 30", pass: blockCount >= 30, val: blockCount },
  ];

  let allPass = true;
  for (const c of checks) {
    console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}: ${c.val}`);
    if (!c.pass) allPass = false;
  }

  console.log(`\n  ── Overall: ${allPass ? "✅ P10-002 PASS" : "❌ P10-002 NEEDS REVIEW"} ──`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("P10-002 failed:", err);
  process.exit(1);
});
