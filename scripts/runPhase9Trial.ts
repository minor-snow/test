/**
 * Phase 9 — A/B Quality Trial
 *
 * ref: P9-004
 *
 * Compares v1 (no profile) vs v2 (with DomainProfile) drafting
 * using the same idea, model, temperature, and token budget.
 *
 * Saves complete evidence for both trials.
 *
 * Usage: npx tsx scripts/runPhase9Trial.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import { generateDraft, generateDraftV2 } from "../src/trial/draftAgent.js";
import { validateDraft } from "../src/draftValidator.js";
import { loadDomainProfile } from "../src/domainProfile.js";
import { evaluateDraftQuality, type DraftQualityReport } from "../src/domainQualityEvaluator.js";
import { computeBlockContentHash, computeRevisionId } from "../src/hash.js";
import { buildDraftPrompt, buildDraftPromptV2 } from "../src/trial/draftAgent.js";
import type { Artifact } from "../src/types.js";
import { requireDeepSeekApiKey } from "../src/trial/requireEnv.js";

// ---------------------------------------------------------------------------
// Config — locked variables
// ---------------------------------------------------------------------------

const DEEPSEEK_API_KEY = requireDeepSeekApiKey();

const MODEL = "deepseek-chat";
const TEMPERATURE = 0.4;
const MAX_TOKENS = 4096;

const IDEA = `A content moderation pipeline for a social media platform.
The system needs:
- ML-based classification of text and images
- Human review queue for borderline cases
- Appeal process for contested decisions
- Audit logging of all moderation actions
- Configurable severity thresholds per content category
- Real-time dashboard for moderation team leads`;

const PROFILE_PATH = join(process.cwd(), "data", "profiles", "software_engineering_architecture.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

async function saveEvidence(dir: string, data: Record<string, unknown>): Promise<void> {
  await ensureDir(dir);
  for (const [name, content] of Object.entries(data)) {
    const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    await fs.writeFile(join(dir, name), text, "utf8");
  }
}

function printReport(label: string, report: DraftQualityReport): void {
  console.log(`\n  ── ${label} Quality Report ──\n`);
  console.log(`    Score:              ${report.score}`);
  console.log(`    Recommendation:     ${report.recommendation}`);
  console.log(`    Sections:           ${report.section_count}`);
  console.log(`    Blocks:             ${report.block_count}`);
  console.log(`    Concept coverage:   ${(report.required_concept_coverage * 100).toFixed(0)}%`);
  console.log(`\n    Issue breakdown:`);
  for (const [type, count] of Object.entries(report.issue_breakdown)) {
    console.log(`      ${type}: ${count}`);
  }
  console.log(`\n    Blocking issues: ${report.blocking_issues.length}`);
  for (const issue of report.blocking_issues) {
    console.log(`      • [${issue.severity}] ${issue.message}`);
  }
  console.log(`\n    Concept matches:`);
  for (const cm of report.concept_matches) {
    const status = cm.matched ? `✅ ${cm.matched_by}` : (cm.excluded_placeholder ? "❌ placeholder only" : "❌ not found");
    console.log(`      ${cm.concept}: ${status}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  Pantheon Phase 9 — A/B Quality Trial            ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log();
  console.log(`  Model:       ${MODEL}`);
  console.log(`  Temperature: ${TEMPERATURE}`);
  console.log(`  Max tokens:  ${MAX_TOKENS}`);
  console.log(`  Idea:        "${IDEA.slice(0, 60)}…"`);
  console.log();

  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: MODEL,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  const profile = await loadDomainProfile(PROFILE_PATH);
  console.log(`  Profile:     ${profile.profile_id} (${profile.artifact_type})`);
  console.log();

  const baseDir = join(process.cwd(), "data", "phase9");

  // ═══════════════════════════════════════════════════
  // Trial A: v1 (no profile)
  // ═══════════════════════════════════════════════════

  console.log("━━━ Trial A: Prompt v1 (no profile) ━━━\n");
  const promptA = buildDraftPrompt(IDEA);
  console.log("  [1/4] Calling LLM...");
  const rawA = await generateDraft(client, IDEA);
  const cleanedA = stripCodeFences(rawA);
  console.log("  [2/4] Validating...");

  let artifactA: Artifact | null = null;
  let reportA: DraftQualityReport | null = null;
  let validationA: Record<string, unknown> = {};

  try {
    const parsed = JSON.parse(cleanedA);
    const vResult = validateDraft(parsed);
    validationA = { status: vResult.status, errors: vResult.errors, warnings: vResult.warnings };

    if (vResult.status === "accepted") {
      artifactA = vResult.artifact;
      console.log(`    ✅ Validated: ${artifactA.sections.length} sections, ${artifactA.sections.reduce((s, sec) => s + sec.commitments.length, 0)} blocks`);
      console.log("  [3/4] Evaluating quality...");
      reportA = evaluateDraftQuality(artifactA, profile);
      printReport("Trial A (v1)", reportA);
    } else {
      console.log(`    ❌ Validation failed: ${vResult.errors.join("; ")}`);
    }
  } catch (e) {
    console.log(`    ❌ JSON parse failed: ${(e as Error).message}`);
    validationA = { status: "parse_error", error: (e as Error).message };
  }

  // Save evidence
  const dirA = join(baseDir, "trial_a_v1");
  await saveEvidence(dirA, {
    "prompt.txt": promptA,
    "raw_output.txt": rawA,
    "validation_result.json": validationA,
    ...(reportA ? { "quality_report.json": reportA } : {}),
    ...(artifactA ? { "artifact.json": artifactA } : {}),
  });
  console.log(`\n  Evidence saved: ${dirA}`);

  // ═══════════════════════════════════════════════════
  // Trial B: v2 (with profile)
  // ═══════════════════════════════════════════════════

  console.log("\n━━━ Trial B: Prompt v2 (with profile) ━━━\n");
  const promptB = buildDraftPromptV2(IDEA, profile);
  console.log("  [1/4] Calling LLM...");
  const rawB = await generateDraftV2(client, IDEA, profile);
  const cleanedB = stripCodeFences(rawB);
  console.log("  [2/4] Validating...");

  let artifactB: Artifact | null = null;
  let reportB: DraftQualityReport | null = null;
  let validationB: Record<string, unknown> = {};

  try {
    const parsed = JSON.parse(cleanedB);
    const vResult = validateDraft(parsed);
    validationB = { status: vResult.status, errors: vResult.errors, warnings: vResult.warnings };

    if (vResult.status === "accepted") {
      artifactB = vResult.artifact;
      console.log(`    ✅ Validated: ${artifactB.sections.length} sections, ${artifactB.sections.reduce((s, sec) => s + sec.commitments.length, 0)} blocks`);
      console.log("  [3/4] Evaluating quality...");
      reportB = evaluateDraftQuality(artifactB, profile);
      printReport("Trial B (v2)", reportB);
    } else {
      console.log(`    ❌ Validation failed: ${vResult.errors.join("; ")}`);
    }
  } catch (e) {
    console.log(`    ❌ JSON parse failed: ${(e as Error).message}`);
    validationB = { status: "parse_error", error: (e as Error).message };
  }

  // Save evidence
  const dirB = join(baseDir, "trial_b_v2");
  await saveEvidence(dirB, {
    "prompt.txt": promptB,
    "raw_output.txt": rawB,
    "validation_result.json": validationB,
    ...(reportB ? { "quality_report.json": reportB } : {}),
    ...(artifactB ? { "artifact.json": artifactB } : {}),
  });
  console.log(`\n  Evidence saved: ${dirB}`);

  // ═══════════════════════════════════════════════════
  // Comparison
  // ═══════════════════════════════════════════════════

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  A/B COMPARISON");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (reportA && reportB) {
    const metrics = [
      ["Score", reportA.score, reportB.score],
      ["Sections", reportA.section_count, reportB.section_count],
      ["Blocks", reportA.block_count, reportB.block_count],
      ["Concept coverage", `${(reportA.required_concept_coverage * 100).toFixed(0)}%`, `${(reportB.required_concept_coverage * 100).toFixed(0)}%`],
      ["Recommendation", reportA.recommendation, reportB.recommendation],
    ] as const;

    console.log("  Metric                  v1          v2");
    console.log("  ─────────────────────────────────────────");
    for (const [name, a, b] of metrics) {
      console.log(`  ${name.padEnd(24)} ${String(a).padEnd(12)} ${b}`);
    }

    // Issue-by-issue comparison
    const allTypes = new Set([
      ...Object.keys(reportA.issue_breakdown),
      ...Object.keys(reportB.issue_breakdown),
    ]);
    console.log("\n  Issue type                    v1    v2    Δ");
    console.log("  ─────────────────────────────────────────────");
    for (const type of [...allTypes].sort()) {
      const a = reportA.issue_breakdown[type] || 0;
      const b = reportB.issue_breakdown[type] || 0;
      const delta = b - a;
      const arrow = delta < 0 ? "↓" : delta > 0 ? "↑" : "=";
      console.log(`  ${type.padEnd(32)} ${String(a).padEnd(6)}${String(b).padEnd(6)}${arrow}${Math.abs(delta)}`);
    }

    // Pass/fail criteria
    console.log("\n  ── Pass/Fail Criteria ──\n");
    const diA = reportA.issue_breakdown["domain_irrelevant_content"] || 0;
    const diB = reportB.issue_breakdown["domain_irrelevant_content"] || 0;
    const diThreshold = Math.ceil(diA * 0.3);
    const diPass = diB <= diThreshold || diA === 0;
    console.log(`  domain_irrelevant v2 <= 30% of v1:  ${diPass ? "✅" : "❌"} (${diB} vs threshold ${diThreshold}, v1=${diA})`);

    const covPass = reportB.required_concept_coverage >= 0.8;
    console.log(`  required_concept_coverage >= 80%:   ${covPass ? "✅" : "❌"} (${(reportB.required_concept_coverage * 100).toFixed(0)}%)`);

    const phB = reportB.issue_breakdown["placeholder_concept"] || 0;
    const phPass = phB === 0;
    console.log(`  placeholder_concept = 0:            ${phPass ? "✅" : "❌"} (${phB})`);

    const msB = reportB.issue_breakdown["missing_required_section"] || 0;
    const msPass = msB === 0;
    console.log(`  missing_required_section = 0:       ${msPass ? "✅" : "❌"} (${msB})`);

    const allPass = diPass && covPass && phPass && msPass;
    console.log(`\n  ── Overall: ${allPass ? "✅ P9-004 PASS" : "❌ P9-004 NEEDS REVIEW"} ──`);
  } else {
    console.log("  ❌ Cannot compare — one or both trials failed validation");
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("✅ P9 A/B TRIAL COMPLETE");
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Trial failed:", err);
  process.exit(1);
});
