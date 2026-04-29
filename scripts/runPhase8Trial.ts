/**
 * Phase 8 — Idea-to-Architecture Drafting Trial
 *
 * ref: P8-004
 *
 * Runs the full idea-to-draft pipeline with a real LLM.
 * Validates that:
 *   1. LLM generates parseable JSON from a fuzzy idea
 *   2. DraftValidator accepts or rejects with clear errors
 *   3. Host recomputes all hashes (none from LLM trusted)
 *   4. Artifact lands in quarantine, NOT canonical
 *   5. Linter produces issues on the draft
 *   6. integrityCheck clean
 *
 * Usage: npx tsx scripts/runPhase8Trial.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import { runIdeaToDraft } from "../src/ideaToDraft.js";
import { computeBlockContentHash } from "../src/hash.js";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY ?? "sk-90b71c8c415b41ac93f7ff4e24a08a7c";

const TEST_IDEAS = [
  `A content moderation pipeline for a social media platform.
The system needs:
- ML-based classification of text and images
- Human review queue for borderline cases
- Appeal process for contested decisions
- Audit logging of all moderation actions
- Configurable severity thresholds per content category
- Real-time dashboard for moderation team leads`,
];

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  Pantheon Phase 8 — Idea-to-Draft Trial          ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log();

  const dataDir = join(process.cwd(), "data", "trial_p8");
  console.log(`Store: ${dataDir}`);
  console.log(`Model: deepseek-chat`);
  console.log();

  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    maxTokens: 4096,
    temperature: 0.4,
  });

  for (let i = 0; i < TEST_IDEAS.length; i++) {
    const idea = TEST_IDEAS[i];

    console.log(`── Trial ${i + 1}: Idea-to-Draft ──\n`);
    console.log(`  Idea: "${idea.slice(0, 80)}${idea.length > 80 ? '…' : ''}"`);
    console.log();

    // Run pipeline
    console.log("  [1/5] Calling LLM...");
    const result = await runIdeaToDraft(idea, client, { dataDir });

    console.log(`  [2/5] Pipeline status: ${result.status}`);
    console.log();

    if (result.status === "parse_error") {
      console.log("  ❌ JSON parse failed:");
      console.log(`    ${result.validation_errors?.join("\n    ")}`);
      console.log("\n  Raw output (first 500 chars):");
      console.log(`    ${result.raw_output?.slice(0, 500)}`);
      continue;
    }

    if (result.status === "validation_failed") {
      console.log("  ❌ DraftValidator rejected:");
      for (const err of result.validation_errors ?? []) {
        console.log(`    • ${err}`);
      }
      if (result.validation_warnings?.length) {
        console.log("  ⚠️ Warnings:");
        for (const w of result.validation_warnings) {
          console.log(`    • ${w}`);
        }
      }
      continue;
    }

    if (result.status === "llm_error") {
      console.log("  ❌ LLM error:");
      console.log(`    ${result.raw_output}`);
      continue;
    }

    // Success
    const artifact = result.artifact!;
    const totalBlocks = artifact.sections.reduce(
      (s, sec) => s + sec.commitments.length, 0
    );

    console.log("  ── Draft Summary ──\n");
    console.log(`  artifact_id:     ${artifact.artifact_id}`);
    console.log(`  artifact_type:   ${artifact.artifact_type}`);
    console.log(`  schema_version:  ${artifact.schema_version}`);
    console.log(`  revision_id:     ${artifact.revision_id}`);
    console.log(`  sections:        ${artifact.sections.length}`);
    console.log(`  blocks:          ${totalBlocks}`);
    console.log(`  created_by:      ${artifact.metadata.created_by}`);
    console.log();

    // [3/5] Verify host hashes
    console.log("  [3/5] Verifying host hashes...");
    let hashClean = true;
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        if (block.content_hash !== computeBlockContentHash(block)) {
          console.log(`    ❌ Hash mismatch: ${block.block_id}`);
          hashClean = false;
        }
      }
    }
    console.log(`    ${hashClean ? '✅ All hashes host-computed and verified' : '❌ Hash mismatch detected'}`);
    console.log();

    // Section breakdown
    console.log("  ── Sections ──\n");
    for (const section of artifact.sections) {
      console.log(`    ${section.section_id} (${section.title}): ${section.commitments.length} blocks`);
      const typeBreakdown: Record<string, number> = {};
      for (const b of section.commitments) {
        typeBreakdown[b.type] = (typeBreakdown[b.type] || 0) + 1;
      }
      const typeSummary = Object.entries(typeBreakdown).map(([t, c]) => `${t}:${c}`).join(", ");
      console.log(`      Types: ${typeSummary}`);
    }
    console.log();

    // [4/5] Lint issues
    console.log("  [4/5] Lint issues:");
    const issues = result.lint_issues ?? [];
    console.log(`    Total: ${issues.length}`);
    const byType: Record<string, number> = {};
    for (const issue of issues) {
      byType[issue.issue_type] = (byType[issue.issue_type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(byType)) {
      console.log(`      ${type}: ${count}`);
    }
    console.log();

    // [5/5] In-memory integrity verification
    console.log("  [5/5] Integrity verification...");
    let integrityClean = true;
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        if (block.content_hash !== computeBlockContentHash(block)) {
          console.log(`    ❌ Content hash mismatch: ${block.block_id}`);
          integrityClean = false;
        }
      }
    }
    // Verify revision_id is deterministic
    const { computeRevisionId } = await import("../src/hash.js");
    const expectedRevId = computeRevisionId(artifact);
    if (artifact.revision_id !== expectedRevId) {
      console.log(`    ❌ Revision ID mismatch: expected ${expectedRevId}, got ${artifact.revision_id}`);
      integrityClean = false;
    }
    console.log(`    ${integrityClean ? '✅ All integrity checks passed' : '❌ Integrity issues detected'}`);
    console.log();

    // Validation warnings
    if (result.validation_warnings?.length) {
      console.log("  ⚠️ Validation warnings:");
      for (const w of result.validation_warnings) {
        console.log(`    • ${w}`);
      }
      console.log();
    }

    // Confirm quarantine, not canonical
    console.log("  ── Quarantine Status ──\n");
    const quarantineDir = join(dataDir, "quarantine");
    try {
      const qFiles = await fs.readdir(quarantineDir);
      const draftFiles = qFiles.filter(f => f.includes("draft_"));
      console.log(`    Quarantine files: ${draftFiles.length}`);
    } catch {
      console.log("    ⚠️ Quarantine directory not found");
    }
    // Verify canonical pointer does NOT exist
    const canonicalPath = join(dataDir, "canonical", `${artifact.artifact_id}.json`);
    try {
      await fs.access(canonicalPath);
      console.log(`    ❌ FAIL: Canonical pointer exists at ${canonicalPath} — draft leaked to canonical!`);
    } catch {
      console.log(`    ✅ Confirmed: No canonical pointer for "${artifact.artifact_id}"`);
      console.log(`    ✅ Draft is in quarantine ONLY`);
    }
    console.log();
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("✅ P8 TRIAL COMPLETE");
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Trial failed:", err);
  process.exit(1);
});
