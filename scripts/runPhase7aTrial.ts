/**
 * Phase 7a — Dual-Artifact Cross-Link Trial
 *
 * ref: P7a-007
 *
 * Runs multi-artifact trial with ArchitectureDraft + InterfaceSpec,
 * then prints results for cockpit signoff.
 *
 * Usage: npx tsx scripts/runPhase7aTrial.ts
 */

import { join } from "node:path";
import { createTrialArtifact } from "../src/trial/trialArtifact.js";
import { createInterfaceSpecSeed } from "../src/trial/interfaceSpecSeed.js";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import {
  runMultiArtifactTrial,
  type MultiArtifactTrialConfig,
} from "../src/trial/multiArtifactTrialRunner.js";
import { lintArtifact } from "../src/linter.js";
import { crossLintArtifacts } from "../src/crossArtifactLinter.js";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY ?? "sk-90b71c8c415b41ac93f7ff4e24a08a7c";

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║   Pantheon Phase 7a — Dual-Artifact Cross Trial  ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log();

  const dataDir = join(process.cwd(), "data", "trial_p7a");
  console.log(`Store: ${dataDir}`);
  console.log(`Model: deepseek-chat`);
  console.log(`Max cycles: 25`);
  console.log();

  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    maxTokens: 2048,
    temperature: 0.3,
  });

  // Seeds
  const arch = createTrialArtifact();
  const iface = createInterfaceSpecSeed();

  const archIssues = lintArtifact(arch);
  const ifaceIssues = lintArtifact(iface);
  const crossIssues = crossLintArtifacts([arch, iface]);

  console.log("── Seed Artifacts ──\n");
  console.log(`  ArchitectureDraft: ${arch.artifact_id}`);
  console.log(
    `    Sections: ${arch.sections.length}, ` +
    `Blocks: ${arch.sections.reduce((s, sec) => s + sec.commitments.length, 0)}`
  );
  console.log(`    Local issues: ${archIssues.length}`);
  console.log();
  console.log(`  InterfaceSpec: ${iface.artifact_id}`);
  console.log(
    `    Sections: ${iface.sections.length}, ` +
    `Blocks: ${iface.sections.reduce((s, sec) => s + sec.commitments.length, 0)}`
  );
  console.log(`    Local issues: ${ifaceIssues.length}`);
  console.log();
  console.log(`  Cross-artifact issues: ${crossIssues.length}`);
  for (const ci of crossIssues) {
    console.log(`    [${ci.severity}] ${ci.issue_type}: ${ci.target_block_id}`);
  }
  console.log();

  // Trial
  const config: MultiArtifactTrialConfig = {
    store: { dataDir },
    client,
    overrideMode: "scripted",
    maxCycles: 25,
    modelName: "deepseek-chat",
  };

  console.log("Starting dual-artifact trial...\n");
  const report = await runMultiArtifactTrial(config, [arch, iface]);

  // Results
  console.log("\n── Trial Complete ──\n");
  console.log(`Artifact count:        ${report.artifact_count}`);
  console.log(`Block count:           ${report.block_count}`);
  console.log(`Local issues found:    ${report.local_issues}`);
  console.log(`Cross issues found:    ${report.cross_artifact_issues}`);
  console.log(`Proposals generated:   ${report.proposals_generated}`);
  console.log(`Proposals committed:   ${report.proposals_committed}`);
  console.log(`Mechanical rejections: ${report.mechanical_rejections}`);
  console.log(`Semantic regressions:  ${report.semantic_regressions}`);
  console.log(`Overrides:             ${report.overrides}`);
  console.log(`Cross residuals:       ${report.cross_residuals}`);

  console.log("\n── Residuals by Artifact ──\n");
  for (const [id, count] of Object.entries(report.residual_by_artifact)) {
    console.log(`  ${id}: ${count}`);
  }

  console.log("\n── Final Revisions ──\n");
  for (const [id, rev] of Object.entries(report.final_revision_ids)) {
    console.log(`  ${id}: ${rev}`);
  }

  // Rejection taxonomy
  if (Object.keys(report.rejections_by_category).length > 0) {
    console.log("\n── Rejection Taxonomy ──\n");
    for (const [cat, count] of Object.entries(report.rejections_by_category)) {
      console.log(`  ${cat}: ${count}`);
    }
  }

  // Per-cycle
  console.log("\n── Cycle Details ──\n");
  for (const cycle of report.cycles) {
    const status = cycle.committed
      ? "✅ committed"
      : cycle.mechanicalRejection
        ? `🚫 rejected [${cycle.rejectionCategories.join(", ") || "unknown"}]`
        : cycle.error
          ? `❌ ${cycle.error}`
          : "⏸ halted";
    const artifact = cycle.issue?.artifact_id ?? "?";
    console.log(
      `  Cycle ${String(cycle.cycle).padStart(2)}: ${status}` +
      ` (${artifact} / ${cycle.issue?.issue_type ?? "?"}: ${cycle.issue?.target_block_id ?? "?"})`
    );
  }

  // P7a success criteria
  console.log("\n── Phase 7a Success Criteria ──\n");
  const criteria = [
    { name: "2 artifacts", pass: report.artifact_count === 2, val: report.artifact_count },
    { name: "50+ blocks", pass: report.block_count >= 50, val: report.block_count },
    { name: "5+ cross issues", pass: report.cross_artifact_issues >= 5, val: report.cross_artifact_issues },
    { name: "10+ LLM proposals", pass: report.proposals_generated >= 10, val: report.proposals_generated },
    { name: "cross_residuals tracked", pass: report.cross_residuals !== undefined, val: report.cross_residuals },
    { name: "both artifacts in final_revision_ids", pass: Object.keys(report.final_revision_ids).length === 2, val: Object.keys(report.final_revision_ids).length },
  ];

  for (const c of criteria) {
    console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}: ${c.val}`);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("✅ TRIAL COMPLETE — proceed to multi-artifact cockpit");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n🏛️  Start cockpit: npx tsx src/cockpit/releaseServer.ts");
  console.log(`    Then open: http://localhost:3456/cockpit/multi?artifacts=${arch.artifact_id},${iface.artifact_id}\n`);
}

main().catch((err) => {
  console.error("Trial failed:", err);
  process.exit(1);
});
