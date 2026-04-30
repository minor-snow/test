/**
 * Phase 7b — Full Artifact Family Trial
 *
 * ref: P7b-006
 *
 * Runs multi-artifact trial with ArchitectureDraft + InterfaceSpec + ModuleSpec.
 *
 * Usage: npx tsx scripts/runPhase7bTrial.ts
 */

import { join } from "node:path";
import { createTrialArtifact } from "../src/trial/trialArtifact.js";
import { createInterfaceSpecSeed } from "../src/trial/interfaceSpecSeed.js";
import { createModuleSpecSeed } from "../src/trial/moduleSpecSeed.js";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import {
  runMultiArtifactTrial,
  type MultiArtifactTrialConfig,
} from "../src/trial/multiArtifactTrialRunner.js";
import { requireDeepSeekApiKey } from "../src/trial/requireEnv.js";
import { lintArtifact } from "../src/linter.js";
import { crossLintArtifacts } from "../src/crossArtifactLinter.js";

const DEEPSEEK_API_KEY = requireDeepSeekApiKey();

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  Pantheon Phase 7b — Full Artifact Family Trial  ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log();

  const dataDir = join(process.cwd(), "data", "trial_p7b");
  console.log(`Store: ${dataDir}`);
  console.log(`Model: deepseek-chat`);
  console.log(`Max cycles: 35`);
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
  const mod = createModuleSpecSeed();

  const archIssues = lintArtifact(arch);
  const ifaceIssues = lintArtifact(iface);
  const modIssues = lintArtifact(mod);
  const crossIssues = crossLintArtifacts([arch, iface, mod]);

  console.log("── Seed Artifacts ──\n");
  for (const [name, artifact, issues] of [
    ["ArchitectureDraft", arch, archIssues],
    ["InterfaceSpec", iface, ifaceIssues],
    ["ModuleSpec", mod, modIssues],
  ] as const) {
    const blocks = artifact.sections.reduce((s, sec) => s + sec.commitments.length, 0);
    console.log(`  ${name}: ${artifact.artifact_id}`);
    console.log(`    Sections: ${artifact.sections.length}, Blocks: ${blocks}`);
    console.log(`    Local issues: ${issues.length}`);
    console.log();
  }
  console.log(`  Cross-artifact issues: ${crossIssues.length}`);
  for (const ci of crossIssues) {
    console.log(`    [${ci.severity}] ${ci.issue_type}: ${ci.target_block_id} (${ci.artifact_id})`);
  }
  console.log();

  // Trial
  const config: MultiArtifactTrialConfig = {
    store: { dataDir },
    client,
    overrideMode: "scripted",
    maxCycles: 35,
    modelName: "deepseek-chat",
  };

  console.log("Starting 3-artifact trial...\n");
  const report = await runMultiArtifactTrial(config, [arch, iface, mod]);

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
  console.log(`Skipped (budget):      ${report.skipped_due_to_budget}`);

  console.log("\n── Residuals by Artifact ──\n");
  for (const [id, count] of Object.entries(report.residual_by_artifact)) {
    console.log(`  ${id}: ${count}`);
  }

  console.log("\n── Final Revisions ──\n");
  for (const [id, rev] of Object.entries(report.final_revision_ids)) {
    console.log(`  ${id}: ${rev}`);
  }

  console.log("\n── Priority Tier Budget ──\n");
  console.log("  Issues remaining by tier:");
  for (const [tier, count] of Object.entries(report.issues_by_priority_tier)) {
    console.log(`    Tier ${tier}: ${count}`);
  }
  console.log("  Attempted by tier:");
  for (const [tier, count] of Object.entries(report.attempted_by_priority_tier)) {
    console.log(`    Tier ${tier}: ${count}`);
  }

  // Per-cycle
  console.log("\n── Cycle Details ──\n");
  for (const cycle of report.cycles) {
    const status = cycle.committed
      ? "✅ committed"
      : cycle.mechanicalRejection
        ? `🚫 rejected`
        : cycle.error
          ? `❌ ${cycle.error}`
          : "⏸ halted";
    const artifact = cycle.issue?.artifact_id ?? "?";
    console.log(
      `  Cycle ${String(cycle.cycle).padStart(2)}: ${status}` +
      ` (${artifact} / ${cycle.issue?.issue_type ?? "?"}: ${cycle.issue?.target_block_id ?? "?"})`
    );
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("✅ TRIAL COMPLETE — proceed to multi-artifact cockpit");
  console.log("═══════════════════════════════════════════════════");
  console.log(`\n🏛️  Start cockpit: npx tsx src/cockpit/releaseServer.ts`);
  console.log(`    Then open: http://localhost:3456/cockpit/multi?artifacts=${arch.artifact_id},${iface.artifact_id},${mod.artifact_id}\n`);
}

main().catch((err) => {
  console.error("Trial failed:", err);
  process.exit(1);
});
