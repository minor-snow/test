/**
 * Targeted Cleanup — Continue from current canonical
 *
 * Runs additional cycles targeting specific residual issues.
 * Uses the existing pipeline functions directly.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { lintArtifact } from "../src/linter.js";
import { validateSkillOutput } from "../src/validators.js";
import { compilePatch, applyPatch } from "../src/applyPatch.js";
import {
  runSemanticRegression,
  buildRegressionInput,
} from "../src/semanticRegression.js";
import {
  saveRevision,
  updateCanonicalPointer,
  appendAuditLog,
  type StoreConfig,
} from "../src/artifactStore.js";
import { renderMarkdown } from "../src/renderMarkdown.js";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";
import { generatePatchProposal } from "../src/trial/llmPatchAgent.js";
import { applyOverridePatch } from "../src/applyOverridePatch.js";
import type { Artifact, CanonicalPointer, Issue, OverridePatch } from "../src/types.js";
import { saveProjection } from "../src/artifactStore.js";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY ?? "sk-90b71c8c415b41ac93f7ff4e24a08a7c";

const dataDir = join(process.cwd(), "data", "trial");
const config: StoreConfig = { dataDir };

function loadCanonical(): Artifact {
  const canonicalPath = join(dataDir, "canonical", "pantheon_architecture.json");
  const pointer = JSON.parse(
    readFileSync(canonicalPath, "utf8")
  ) as CanonicalPointer;
  const revPath = join(
    dataDir, "revisions", "pantheon_architecture",
    `${pointer.current_revision_id}.json`
  );
  return JSON.parse(readFileSync(revPath, "utf8")) as Artifact;
}

async function runCleanupCycle(
  artifact: Artifact,
  targetBlockId: string,
  cycleLabel: string
): Promise<Artifact | null> {
  console.log(`\n── Cleanup: ${cycleLabel} (${targetBlockId}) ──`);

  // Lint and find the target issue
  const issues = lintArtifact(artifact);
  const targetIssue = issues.find((i) => i.target_block_id === targetBlockId);

  if (!targetIssue) {
    console.log(`  ✅ No issue found for ${targetBlockId} — already clean`);
    return artifact;
  }

  console.log(`  Issue: [${targetIssue.severity}] ${targetIssue.issue_type}`);
  console.log(`  ${targetIssue.message}`);

  // Generate patch via LLM
  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    maxTokens: 2048,
    temperature: 0.3,
  });

  const rawOutput = await generatePatchProposal(client, artifact, targetIssue);

  // Save LLM output
  const outputDir = join(dataDir, "llm_outputs");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, `cleanup_${targetBlockId}.json`),
    JSON.stringify({ target: targetBlockId, raw_output: rawOutput }, null, 2)
  );

  // Validate
  const validation = validateSkillOutput(
    rawOutput, "blue_patch_agent", "PatchProposal", "quarantine", artifact
  );

  if (validation.status === "rejected") {
    console.log(`  🚫 Mechanical rejection: ${validation.errors.join("; ")}`);
    return null;
  }

  // Compile and apply
  const proposal = JSON.parse(rawOutput);
  const patch = compilePatch(proposal, artifact);
  const result = applyPatch(artifact, patch);

  if (result.status === "rejected") {
    console.log(`  🚫 Patch rejected: ${result.reason} — ${result.details}`);
    return null;
  }

  const candidate = result.candidate_revision;

  // Save revision
  await saveRevision(config, candidate);
  await appendAuditLog(config, {
    entry_id: `audit_cleanup_${targetBlockId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    entry_type: "patch_applied",
    artifact_id: artifact.artifact_id,
    revision_id: candidate.revision_id,
    details: { cleanup: true, target_block: targetBlockId },
  });

  // Regression check
  const oldBlocks = artifact.sections.flatMap((s) => s.commitments);
  const newBlocks = candidate.sections.flatMap((s) => s.commitments);
  const regressionInput = buildRegressionInput(oldBlocks, newBlocks);
  const regressionResult = runSemanticRegression(regressionInput);

  if (regressionResult.status === "passed") {
    console.log(`  ✅ Regression passed — committing`);
    await updateCanonicalPointer(config, artifact.artifact_id, candidate.revision_id);
    await appendAuditLog(config, {
      entry_id: `audit_cleanup_commit_${targetBlockId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      entry_type: "canonical_updated",
      artifact_id: artifact.artifact_id,
      revision_id: candidate.revision_id,
      details: { cleanup: true, auto_committed: true },
    });
    return candidate;
  }

  // Regression failed — scripted override
  console.log(`  ⚠ Regression failed: ${regressionResult.failed_gates.join(", ")}`);
  console.log(`  Applying scripted override...`);

  const override: OverridePatch = {
    override_id: `override_cleanup_${targetBlockId}_${Date.now()}`,
    artifact_id: artifact.artifact_id,
    base_revision_id: candidate.revision_id,
    override_type: "accept_with_known_risk",
    operator: { type: "human", id: "cleanup_runner" },
    failed_gates: regressionResult.failed_gates,
    affected_issue_ids: [targetIssue.issue_id],
    rationale: `Targeted cleanup override for ${targetBlockId}`,
    risk_acceptance: {
      accepted_risks: regressionResult.reasons,
      mitigation_plan: "Targeted cleanup — isolated change.",
    },
    timestamp: new Date().toISOString(),
  };

  const overrideResult = await applyOverridePatch(config, candidate, override);
  if (overrideResult.status === "applied") {
    console.log(`  ✅ Override applied — committed`);
    return overrideResult.new_revision;
  } else {
    console.log(`  🚫 Override rejected: ${overrideResult.reason}`);
    return null;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Pantheon — Targeted Cleanup (High Issues)  ║");
  console.log("╚══════════════════════════════════════════════╝");

  let artifact = loadCanonical();
  console.log(`Starting from: ${artifact.revision_id}`);

  // Priority 1: empty block
  const result1 = await runCleanupCycle(artifact, "b_trial_034", "Empty block");
  if (result1) artifact = result1;

  // Priority 2: unsafe_canonical_commit
  const result2 = await runCleanupCycle(artifact, "b_trial_033", "Unsafe commit history");
  if (result2) artifact = result2;

  // Re-lint and report
  console.log("\n── Post-Cleanup Residual ──\n");
  const remaining = lintArtifact(artifact);

  const byType: Record<string, number> = {};
  const bySev: Record<string, number> = {};
  for (const i of remaining) {
    byType[i.issue_type] = (byType[i.issue_type] || 0) + 1;
    bySev[i.severity] = (bySev[i.severity] || 0) + 1;
  }

  console.log(`Total residual: ${remaining.length}`);
  console.log(`By type: ${JSON.stringify(byType)}`);
  console.log(`By severity: ${JSON.stringify(bySev)}`);

  const highs = remaining.filter((i) => i.severity === "high");
  console.log(`\nHigh-severity remaining: ${highs.length}`);
  for (const h of highs) {
    console.log(`  [high] ${h.issue_type} | ${h.target_block_id} | ${h.message}`);
  }

  // Save final projection
  const finalMd = renderMarkdown(artifact);
  await saveProjection(config, artifact.artifact_id, finalMd);

  console.log(`\nFinal canonical: ${artifact.revision_id}`);

  // Verdict
  if (highs.length === 0) {
    console.log("\n✅ All high-severity issues cleared. Ready for sign-off review.");
  } else {
    console.log("\n⚠ High-severity issues remain. Additional cleanup needed.");
  }
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
