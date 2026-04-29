/**
 * Live Trial Entry Point
 *
 * ref: P3-006
 *
 * Runs the full Phase 3 trial against DeepSeek API.
 *
 * Usage: npx tsx src/trial/runLiveTrial.ts
 */
import { join } from "node:path";
import { createTrialArtifact } from "./trialArtifact.js";
import { createDeepSeekClient } from "./deepseekAdapter.js";
import { runTrial } from "./trialRunner.js";
import { validateTrial } from "./trialValidation.js";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "sk-90b71c8c415b41ac93f7ff4e24a08a7c";
async function main() {
    console.log("╔══════════════════════════════════════════╗");
    console.log("║   Pantheon Phase 3 — Real Artifact Trial ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log();
    const dataDir = join(process.cwd(), "data", "trial");
    console.log(`Store: ${dataDir}`);
    console.log(`Model: deepseek-chat`);
    console.log();
    const client = createDeepSeekClient({
        apiKey: DEEPSEEK_API_KEY,
        model: "deepseek-chat",
        maxTokens: 2048,
        temperature: 0.3,
    });
    const seed = createTrialArtifact();
    console.log(`Seed artifact: ${seed.artifact_id}`);
    console.log(`  Sections: ${seed.sections.length}, ` +
        `Blocks: ${seed.sections.reduce((s, sec) => s + sec.commitments.length, 0)}`);
    console.log();
    const trialConfig = {
        store: { dataDir },
        client,
        overrideMode: "scripted", // First trial uses scripted overrides
        maxCycles: 10,
        modelName: "deepseek-chat",
    };
    console.log("Starting trial...\n");
    const report = await runTrial(trialConfig, seed);
    console.log("── Trial Complete ──\n");
    console.log(`Cycles run: ${report.total_cycles}`);
    console.log(`Issues found: ${report.issues_found}`);
    console.log(`Issues by rule: ${JSON.stringify(report.issues_by_rule)}`);
    console.log(`Proposals generated: ${report.proposals_generated}`);
    console.log(`Proposals accepted: ${report.proposals_accepted}`);
    console.log(`Semantic rejections: ${report.proposals_rejected_semantic}`);
    console.log(`Natural rejections: ${report.natural_rejection_count}`);
    console.log(`Forced rejections: ${report.forced_rejection_count}`);
    console.log(`Overrides: ${report.override_count}`);
    console.log(`Override breakdown: manual=${report.override_mode_breakdown.manual}, ` +
        `scripted=${report.override_mode_breakdown.scripted}`);
    console.log(`Final canonical: ${report.final_canonical_revision_id}`);
    console.log();
    // Validate
    console.log("── Running Validation ──\n");
    const validation = await validateTrial({ dataDir }, report);
    console.log(`Integrity clean: ${validation.integrityClean}`);
    console.log(`  Corruptions: ${validation.report.summary.corruptions}`);
    console.log(`  Warnings: ${validation.report.summary.warnings}`);
    console.log(`  Residual issues: ${validation.report.summary.residual_issues}`);
    console.log(`  Artifacts scanned: ${validation.report.summary.artifacts_scanned}`);
    if (validation.report.findings.length > 0) {
        console.log("\n  Findings:");
        for (const f of validation.report.findings) {
            console.log(`    [${f.severity}] ${f.check}: ${f.message}`);
        }
    }
    console.log("\n── Final Canonical Markdown (first 500 chars) ──\n");
    console.log(validation.canonicalMarkdown.slice(0, 500));
    console.log("...\n");
    // Per-cycle summary
    console.log("── Cycle Details ──\n");
    for (const cycle of report.cycles) {
        const status = cycle.committed
            ? "✅ committed"
            : cycle.mechanicalRejection
                ? "🚫 rejected"
                : cycle.error
                    ? `❌ ${cycle.error}`
                    : "⏸ halted";
        console.log(`  Cycle ${cycle.cycle}: ${status}` +
            (cycle.issue ? ` (${cycle.issue.issue_type}: ${cycle.issue.target_block_id})` : " (forced)") +
            (cycle.overrideApplied ? ` [override: ${cycle.overrideMode}]` : ""));
    }
    // Three-layer verdict
    const residual = validation.report.summary.residual_issues;
    console.log("\n── Three Layers of Clean ──\n");
    console.log(`  Layer 1 (integrity clean):  ${validation.integrityClean ? "✅" : "❌"} corruptions=${validation.report.summary.corruptions}`);
    console.log(`  Layer 2 (artifact clean):   ${residual === 0 ? "✅" : "⚠"} residual_issues=${residual}`);
    console.log(`  Layer 3 (document coherent): ⏳ pending human review`);
    console.log("\n═══════════════════════════════════════════");
    console.log(validation.integrityClean
        ? "✅ TRIAL PASSED — integrity clean"
        : "❌ TRIAL FAILED — integrity issues found");
    console.log("═══════════════════════════════════════════\n");
}
main().catch((err) => {
    console.error("Trial failed:", err);
    process.exit(1);
});
//# sourceMappingURL=runLiveTrial.js.map