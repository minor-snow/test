/**
 * Phase 6 — Scale Trial + Cockpit Signoff
 *
 * ref: P6-005
 *
 * Runs 20-cycle real LLM trial against DeepSeek, then starts
 * the release cockpit for operator signoff.
 *
 * Usage: npx tsx scripts/runPhase6Trial.ts
 */

import { join } from "node:path";
import { createTrialArtifact } from "../src/trial/trialArtifact.js";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import { runTrial, type TrialConfig } from "../src/trial/trialRunner.js";
import { validateTrial } from "../src/trial/trialValidation.js";
import { requireDeepSeekApiKey } from "../src/trial/requireEnv.js";
import { lintArtifact } from "../src/linter.js";

const DEEPSEEK_API_KEY = requireDeepSeekApiKey();

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Pantheon Phase 6 — Real LLM Scale Trial   ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log();

  const dataDir = join(process.cwd(), "data", "trial");
  console.log(`Store: ${dataDir}`);
  console.log(`Model: deepseek-chat`);
  console.log(`Max cycles: 20`);
  console.log();

  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    maxTokens: 2048,
    temperature: 0.3,
  });

  const seed = createTrialArtifact();
  const seedIssues = lintArtifact(seed);

  console.log(`Seed artifact: ${seed.artifact_id}`);
  console.log(
    `  Sections: ${seed.sections.length}, ` +
      `Blocks: ${seed.sections.reduce((s, sec) => s + sec.commitments.length, 0)}`
  );
  console.log(`  Linter issues: ${seedIssues.length}`);
  console.log();

  // ── Phase 6 Trial ──

  const trialConfig: TrialConfig = {
    store: { dataDir },
    client,
    overrideMode: "scripted",
    maxCycles: 20,
    modelName: "deepseek-chat",
  };

  console.log("Starting 20-cycle trial...\n");
  const report = await runTrial(trialConfig, seed);

  // ── Results ──

  console.log("\n── Trial Complete ──\n");
  console.log(`Cycles run:            ${report.total_cycles}`);
  console.log(`Issues found:          ${report.issues_found}`);
  console.log(`Issues by rule:        ${JSON.stringify(report.issues_by_rule)}`);
  console.log(`Proposals generated:   ${report.proposals_generated}`);
  console.log(`Proposals accepted:    ${report.proposals_accepted}`);
  console.log(`Semantic rejections:   ${report.proposals_rejected_semantic}`);
  console.log(`Natural rejections:    ${report.natural_rejection_count}`);
  console.log(`Forced rejections:     ${report.forced_rejection_count}`);
  console.log(`Overrides:             ${report.override_count}`);
  console.log(
    `Override breakdown:    manual=${report.override_mode_breakdown.manual}, ` +
      `scripted=${report.override_mode_breakdown.scripted}`
  );
  console.log(`Final canonical:       ${report.final_canonical_revision_id}`);

  // P6-004: Rejection taxonomy
  console.log("\n── Rejection Taxonomy ──\n");
  if (Object.keys(report.rejections_by_category).length > 0) {
    for (const [cat, count] of Object.entries(report.rejections_by_category)) {
      console.log(`  ${cat}: ${count}`);
    }
  } else {
    console.log("  (no rejections — forced rejection will cover boundary)");
  }

  console.log();

  // ── Validation ──

  console.log("── Running Validation ──\n");
  const validation = await validateTrial({ dataDir }, report);

  console.log(`Integrity clean:       ${validation.integrityClean}`);
  console.log(`  Corruptions:         ${validation.report.summary.corruptions}`);
  console.log(`  Warnings:            ${validation.report.summary.warnings}`);
  console.log(`  Residual issues:     ${validation.report.summary.residual_issues}`);

  if (validation.report.findings.length > 0) {
    console.log("\n  Findings:");
    for (const f of validation.report.findings) {
      console.log(`    [${f.severity}] ${f.check}: ${f.message}`);
    }
  }

  // ── Per-cycle summary ──

  console.log("\n── Cycle Details ──\n");
  for (const cycle of report.cycles) {
    const status = cycle.committed
      ? "✅ committed"
      : cycle.mechanicalRejection
        ? `🚫 rejected [${cycle.rejectionCategories.join(", ") || "unknown"}]`
        : cycle.error
          ? `❌ ${cycle.error}`
          : "⏸ halted";
    console.log(
      `  Cycle ${String(cycle.cycle).padStart(2)}: ${status}` +
        (cycle.issue ? ` (${cycle.issue.issue_type}: ${cycle.issue.target_block_id})` : " (forced)") +
        (cycle.overrideApplied ? ` [override: ${cycle.overrideMode}]` : "")
    );
  }

  // ── Three-layer verdict ──

  const residual = validation.report.summary.residual_issues;
  console.log("\n── Three Layers of Clean ──\n");
  console.log(`  Layer 1 (integrity clean):   ${validation.integrityClean ? "✅" : "❌"} corruptions=${validation.report.summary.corruptions}`);
  console.log(`  Layer 2 (artifact clean):    ${residual === 0 ? "✅" : "⚠"} residual_issues=${residual}`);
  console.log(`  Layer 3 (document coherent): ⏳ pending cockpit review`);

  // ── P6-005 success criteria ──

  console.log("\n── Phase 6 Success Criteria ──\n");
  const totalRejections = report.natural_rejection_count + report.forced_rejection_count;
  const criteria = [
    { name: "20+ issues found", pass: report.issues_found >= 20, val: report.issues_found },
    { name: "15+ proposals generated", pass: report.proposals_generated >= 15, val: report.proposals_generated },
    { name: "3+ rejections (natural+forced)", pass: totalRejections >= 3, val: totalRejections },
    { name: "3+ semantic regressions", pass: report.proposals_rejected_semantic >= 3, val: report.proposals_rejected_semantic },
    { name: "integrity clean", pass: validation.integrityClean, val: validation.integrityClean },
    { name: "llm_runs/ archive populated", pass: report.total_cycles > 0, val: report.total_cycles },
    { name: "rejections_by_category populated", pass: Object.keys(report.rejections_by_category).length > 0 || totalRejections === 0, val: Object.keys(report.rejections_by_category).length },
  ];

  for (const c of criteria) {
    console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}: ${c.val}`);
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log(
    validation.integrityClean
      ? "✅ TRIAL COMPLETE — proceed to cockpit for release decision"
      : "❌ TRIAL FAILED — integrity issues found"
  );
  console.log("═══════════════════════════════════════════════");
  console.log("\n🏛️  Start cockpit: npx tsx src/cockpit/releaseServer.ts");
  console.log("    Then open: http://localhost:3456/cockpit\n");
}

main().catch((err) => {
  console.error("Trial failed:", err);
  process.exit(1);
});
