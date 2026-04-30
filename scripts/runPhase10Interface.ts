/**
 * Phase 10 — P10-004: InterfaceSpec Evolution
 *
 * Generates offline-first InterfaceSpec from:
 *   - Canonical offline-first ArchitectureDraft
 *   - Existing online-first InterfaceSpec baseline
 *   - Superseded interface blocks
 *   - InterfaceSpec DomainProfile
 *
 * Usage: npx tsx scripts/runPhase10Interface.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import { generateInterfaceSpecDraft, type SupersededConstraint } from "../src/trial/draftAgent.js";
import { validateDraft } from "../src/draftValidator.js";
import { loadDomainProfile } from "../src/domainProfile.js";
import { evaluateDraftQuality } from "../src/domainQualityEvaluator.js";
import { saveToQuarantine, loadCanonicalPointer, loadCanonicalRevision } from "../src/artifactStore.js";
import type { Artifact } from "../src/types.js";
import type { StoreConfig } from "../src/artifactStore.js";
import { requireDeepSeekApiKey } from "../src/trial/requireEnv.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEEPSEEK_API_KEY = requireDeepSeekApiKey();
const MODEL = "deepseek-chat";
const TEMPERATURE = 0.4;
const MAX_TOKENS = 8192;

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const IFACE_PROFILE_PATH = join(process.cwd(), "data", "profiles", "pet_triage_offline_first_interface.json");
const BASELINE_IFACE_PATH = join(STORE_ROOT, "baseline", "pet_triage_interface.json");

// Superseded interface blocks from the existing strong-sync InterfaceSpec
const SUPERSEDED_INTERFACE_BLOCKS: SupersededConstraint[] = [
  {
    block_id: "b_pet_iface_002",
    text: "POST /triage/submit is synchronous: the request blocks until the backend returns or fails.",
    reason: "Offline-first means triage completes locally; submission is asynchronous.",
    replacement_intent: "Offline report creation is local; sync upload is background + async.",
  },
  {
    block_id: "b_pet_iface_005",
    text: "Network timeout or transport failure is terminal for that triage attempt.",
    reason: "Offline-first: network failure is recoverable, not terminal.",
    replacement_intent: "Failed sync enters retry ledger; report remains pending.",
  },
  {
    block_id: "b_pet_iface_006",
    text: "No offline submission endpoint, no deferred upload token, no queue handshake.",
    reason: "Offline-first requires all three.",
    replacement_intent: "POST /offline-reports, sync queue, deferred upload with idempotency key.",
  },
  {
    block_id: "b_pet_iface_007",
    text: "No conflict metadata: no version vectors, no LWW markers, no change tokens.",
    reason: "Multi-clinic sync requires conflict detection metadata.",
    replacement_intent: "Conflict payload with vector clock, LWW fields, and resolution state.",
  },
  {
    block_id: "b_pet_iface_009",
    text: "On failure the client must not create a pending report or partial triage record.",
    reason: "Offline-first creates pending reports BEFORE network success.",
    replacement_intent: "Pending reports are created locally on triage completion, regardless of network.",
  },
  {
    block_id: "b_pet_iface_010",
    text: "One backend authority; no reconciliation between clinic replicas.",
    reason: "Multi-clinic sync means multiple authorities with reconciliation.",
    replacement_intent: "Per-clinic sync with conflict resolution contract.",
  },
];

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

function normalizeOutput(parsed: unknown): void {
  const obj = parsed as Record<string, unknown>;
  if (!obj.artifact_id) {
    obj.artifact_id = "pet_triage_offline_interface";
    console.log("    Injected artifact_id: pet_triage_offline_interface");
  }
  if (Array.isArray(obj.sections)) {
    let remapped = 0;
    let titleFixed = 0;
    for (const section of obj.sections as Record<string, unknown>[]) {
      // Remap blocks → commitments
      if (Array.isArray(section.blocks) && !Array.isArray(section.commitments)) {
        section.commitments = section.blocks;
        delete section.blocks;
        remapped++;
      }
      // Remap name → title
      if (section.name && !section.title) {
        section.title = section.name;
        delete section.name;
        titleFixed++;
      }
    }
    if (remapped > 0) console.log(`    Remapped "blocks" → "commitments" in ${remapped} sections`);
    if (titleFixed > 0) console.log(`    Remapped "name" → "title" in ${titleFixed} sections`);
  }
}

/**
 * Strip linked_architecture_blocks from blocks before validation
 * (they are cross-artifact refs, not internal links).
 * Returns a map so we can re-attach after validation.
 */
function stripCrossLinks(parsed: unknown): Map<string, string[]> {
  const linkMap = new Map<string, string[]>();
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.sections)) {
    for (const section of obj.sections as Record<string, unknown>[]) {
      if (Array.isArray(section.commitments)) {
        for (const block of section.commitments as Record<string, unknown>[]) {
          if (Array.isArray(block.linked_architecture_blocks)) {
            linkMap.set(block.block_id as string, block.linked_architecture_blocks as string[]);
            delete block.linked_architecture_blocks;
          }
        }
      }
    }
  }
  return linkMap;
}

function reattachCrossLinks(artifact: Artifact, linkMap: Map<string, string[]>): void {
  for (const section of artifact.sections) {
    for (const block of section.commitments) {
      const links = linkMap.get(block.block_id);
      if (links) {
        block.linked_architecture_blocks = links;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P10-004: InterfaceSpec Evolution                    ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const store: StoreConfig = { dataDir: STORE_ROOT };

  // Load inputs
  console.log("  Loading inputs...");
  const profile = await loadDomainProfile(IFACE_PROFILE_PATH);
  console.log(`    Profile: ${profile.profile_id}`);

  const architecture = await loadCanonicalRevision(store, "pet_triage_offline_architecture");
  if (!architecture) {
    console.error("    ❌ No canonical offline architecture found");
    process.exit(1);
  }
  console.log(`    Architecture: ${architecture.artifact_id} @ ${architecture.revision_id}`);

  const existingInterface = JSON.parse(
    await fs.readFile(BASELINE_IFACE_PATH, "utf8")
  ) as Artifact;
  console.log(`    Existing interface: ${existingInterface.artifact_id} @ ${existingInterface.revision_id}`);
  console.log(`    Superseded interface blocks: ${SUPERSEDED_INTERFACE_BLOCKS.length}`);

  // Generate
  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: MODEL,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  console.log("\n  [1/5] Calling DeepSeek for InterfaceSpec...");
  const rawOutput = await generateInterfaceSpecDraft(client, {
    architecture,
    existingInterface,
    supersededInterfaceBlocks: SUPERSEDED_INTERFACE_BLOCKS,
    profile,
  });

  const evidenceDir = join(STORE_ROOT, "evidence");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(join(evidenceDir, "p10_004_raw_output.txt"), rawOutput, "utf8");

  // Parse
  console.log("  [2/5] Parsing and normalizing...");
  const cleaned = stripCodeFences(rawOutput);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error(`    ❌ JSON parse failed: ${(e as Error).message}`);
    await fs.writeFile(join(evidenceDir, "p10_004_cleaned.txt"), cleaned, "utf8");
    process.exit(1);
  }

  normalizeOutput(parsed);
  // Strip cross-artifact links before validation (validator checks them as internal)
  const crossLinks = stripCrossLinks(parsed);
  console.log(`    Cross-artifact links preserved: ${crossLinks.size} blocks`);

  // Validate
  console.log("  [3/5] Running DraftValidator...");
  const validation = validateDraft(parsed);
  if (validation.status === "rejected") {
    console.error("    ❌ Validation failed:");
    for (const err of validation.errors) console.error(`      • ${err}`);
    await fs.writeFile(
      join(evidenceDir, "p10_004_validation.json"),
      JSON.stringify({ status: "rejected", errors: validation.errors }, null, 2),
      "utf8"
    );
    process.exit(1);
  }

  const artifact = validation.artifact;
  // Re-attach cross-artifact links
  reattachCrossLinks(artifact, crossLinks);
  const blockCount = artifact.sections.reduce((s, sec) => s + sec.commitments.length, 0);
  console.log(`    ✅ Valid: ${artifact.sections.length} sections, ${blockCount} blocks`);

  // Quarantine
  console.log("  [4/5] Saving to quarantine...");
  const quarantineId = `draft_${artifact.artifact_id}_${Date.now()}`;
  await saveToQuarantine(store, quarantineId, artifact);
  console.log(`    quarantine_id: ${quarantineId}`);

  const canonicalExists = (await loadCanonicalPointer(store, artifact.artifact_id)) !== null;
  console.log(`    canonical_pointer_exists: ${canonicalExists} ${canonicalExists ? "❌" : "✅"}`);

  // Quality
  console.log("  [5/5] Evaluating quality...");
  const report = evaluateDraftQuality(artifact, profile);

  // Count linked_architecture_blocks
  let totalLinks = 0;
  const linkedBlockIds = new Set<string>();
  for (const section of artifact.sections) {
    for (const block of section.commitments) {
      if (block.linked_architecture_blocks && Array.isArray(block.linked_architecture_blocks)) {
        totalLinks += block.linked_architecture_blocks.length;
        for (const id of block.linked_architecture_blocks) linkedBlockIds.add(id);
      }
    }
  }

  // Check superseded coverage
  const allTexts = artifact.sections
    .flatMap(s => s.commitments)
    .map(b => (b.text + " " + (b.rationale || "")).toLowerCase());
  const supersededCoverage = SUPERSEDED_INTERFACE_BLOCKS.map(sc => ({
    block_id: sc.block_id,
    referenced: allTexts.some(t =>
      t.includes(sc.block_id.toLowerCase()) ||
      t.includes(sc.replacement_intent.toLowerCase().slice(0, 25))
    ),
  }));

  // Report
  console.log("\n  ══════════════════════════════════════════════════");
  console.log("  P10-004 INTERFACESPEC REPORT");
  console.log("  ══════════════════════════════════════════════════\n");

  console.log(`  artifact_id:              ${artifact.artifact_id}`);
  console.log(`  sections:                 ${artifact.sections.length}`);
  console.log(`  blocks:                   ${blockCount}`);
  console.log(`  score:                    ${report.score}`);
  console.log(`  concept_coverage:         ${(report.required_concept_coverage * 100).toFixed(0)}%`);
  console.log(`  recommendation:           ${report.recommendation}`);
  console.log(`  linked_architecture_blocks: ${totalLinks} (${linkedBlockIds.size} unique)`);
  console.log(`  canonical_pointer_exists: ${canonicalExists}`);

  console.log("\n  Issue breakdown:");
  for (const [type, count] of Object.entries(report.issue_breakdown)) {
    console.log(`    ${type}: ${count}`);
  }

  console.log("\n  Concept matches:");
  for (const cm of report.concept_matches) {
    const icon = cm.matched ? "✅" : "❌";
    console.log(`    ${cm.concept}: ${icon} ${cm.matched_by || "missing"}`);
  }

  console.log("\n  Superseded interface coverage:");
  for (const sc of supersededCoverage) {
    console.log(`    ${sc.block_id}: ${sc.referenced ? "✅" : "❌"}`);
  }

  // Save evidence
  await fs.writeFile(join(evidenceDir, "p10_004_artifact.json"), JSON.stringify(artifact, null, 2), "utf8");
  await fs.writeFile(join(evidenceDir, "p10_004_quality_report.json"), JSON.stringify(report, null, 2), "utf8");

  // Pass/fail
  console.log("\n  ── Pass/Fail ──\n");
  const checks = [
    { name: "score >= 75", pass: report.score >= 75, val: report.score },
    { name: "concept_coverage >= 80%", pass: report.required_concept_coverage >= 0.8, val: `${(report.required_concept_coverage * 100).toFixed(0)}%` },
    { name: "blocks 15-30", pass: blockCount >= 15 && blockCount <= 30, val: blockCount },
    { name: "linked_architecture_blocks >= 10", pass: totalLinks >= 10, val: totalLinks },
    { name: "missing_required_section = 0", pass: (report.issue_breakdown["missing_required_section"] || 0) === 0, val: report.issue_breakdown["missing_required_section"] || 0 },
    { name: "canonical_pointer_exists = false", pass: !canonicalExists, val: canonicalExists },
  ];

  let allPass = true;
  for (const c of checks) {
    console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}: ${c.val}`);
    if (!c.pass) allPass = false;
  }

  console.log(`\n  ── Overall: ${allPass ? "✅ P10-004 PASS" : "❌ P10-004 NEEDS REVIEW"} ──`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("P10-004 failed:", err);
  process.exit(1);
});
