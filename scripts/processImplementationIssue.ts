/**
 * P13-B: Process Implementation Issue → Quarantine → Patch Proposal
 *
 * Takes an IMPL-xxx.json created by createImplementationIssue.ts,
 * validates it, copies it to quarantine, and creates a patch proposal stub.
 *
 * This connects the reverse issue to the governed pipeline:
 *   IMPL-xxx.json → validation → quarantine → patch_proposal → (manual: applyPatch → regression → regenerate)
 *
 * Usage:
 *   npx tsx scripts/processImplementationIssue.ts --issue IMPL-001
 *
 * ref: P13-B
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import type { ImplementationIssue } from "../src/handoff/types.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const ISSUES_DIR = join(STORE_ROOT, "implementation", "issues");
const QUARANTINE_DIR = join(STORE_ROOT, "quarantine");
const PATCH_DIR = join(STORE_ROOT, "implementation", "patches");

const VALID_TYPES = [
  "missing_field", "wrong_type", "missing_state", "wrong_transition",
  "missing_interface", "contract_mismatch", "acceptance_gap", "other",
];

async function main() {
  const issueArg = process.argv.find(a => a.startsWith("--issue"));
  const issueId = issueArg ? process.argv[process.argv.indexOf("--issue") + 1] : process.argv[2];
  if (!issueId) throw new Error("Usage: npx tsx processImplementationIssue.ts --issue IMPL-001");

  console.log(`\n  Processing implementation issue: ${issueId}\n`);

  // Step 1: Load issue
  const issuePath = join(ISSUES_DIR, `${issueId}.json`);
  const issueRaw = await fs.readFile(issuePath, "utf8");
  const issue: ImplementationIssue = JSON.parse(issueRaw);

  // Step 2: Validate issue structure
  const errors: string[] = [];
  if (!issue.issue_id) errors.push("Missing issue_id");
  if (!issue.target_artifact_id) errors.push("Missing target_artifact_id");
  if (!issue.target_block_id) errors.push("Missing target_block_id");
  if (!VALID_TYPES.includes(issue.issue_type)) errors.push(`Invalid issue_type: ${issue.issue_type}`);
  if (!issue.description || issue.description.length < 10) errors.push("Description too short (min 10 chars)");
  if (!issue.implementation_context) errors.push("Missing implementation_context");

  if (errors.length > 0) {
    console.log("  ❌ Validation failed:");
    for (const e of errors) console.log(`     - ${e}`);
    process.exit(1);
  }
  console.log("  ✅ Issue validation passed\n");

  // Step 3: Write to quarantine
  await fs.mkdir(QUARANTINE_DIR, { recursive: true });
  const quarantineId = `q_impl_${issueId.toLowerCase()}_${Date.now()}`;
  const quarantineEntry = {
    quarantine_id: quarantineId,
    source: "implementation_feedback",
    issue_id: issue.issue_id,
    target_artifact_id: issue.target_artifact_id,
    target_block_id: issue.target_block_id,
    issue_type: issue.issue_type,
    description: issue.description,
    implementation_context: issue.implementation_context,
    suggested_contract_change: issue.suggested_contract_change,
    quarantined_at: new Date().toISOString(),
    hash: createHash("sha256").update(issueRaw).digest("hex").slice(0, 16),
  };

  const quarantinePath = join(QUARANTINE_DIR, `${quarantineId}.json`);
  await fs.writeFile(quarantinePath, JSON.stringify(quarantineEntry, null, 2), "utf8");
  console.log(`  ✅ Quarantined: ${quarantinePath}\n`);

  // Step 4: Create patch proposal stub
  await fs.mkdir(PATCH_DIR, { recursive: true });
  const patchId = `PATCH-${issueId.replace("IMPL-", "")}`;
  const patchProposal = {
    patch_id: patchId,
    source_issue_id: issue.issue_id,
    quarantine_id: quarantineId,
    target_artifact_id: issue.target_artifact_id,
    target_block_id: issue.target_block_id,
    issue_type: issue.issue_type,
    status: "proposed",
    created_at: new Date().toISOString(),
    description: issue.description,
    suggested_change: issue.suggested_contract_change || "TODO: Define patch content",
    validation: {
      semantic_regression: "pending",
      integrity_check: "pending",
      readiness_recheck: "pending",
    },
    next_steps: [
      "Review patch proposal",
      "Apply patch to artifact via applyOverridePatch()",
      "Run semantic regression",
      "If pass → promote to canonical",
      "Regenerate handoff package",
      "Regenerate Kotlin contracts",
    ],
  };

  const patchPath = join(PATCH_DIR, `${patchId}.json`);
  await fs.writeFile(patchPath, JSON.stringify(patchProposal, null, 2), "utf8");
  console.log(`  ✅ Patch proposal: ${patchPath}\n`);

  // Step 5: Update issue status
  issue.status = "triaged";
  await fs.writeFile(issuePath, JSON.stringify(issue, null, 2), "utf8");
  console.log(`  ✅ Issue status: open → triaged\n`);

  // Summary
  console.log("  ══════════════════════════════════════════════════");
  console.log(`  ${issueId} → quarantine → ${patchId}`);
  console.log(`  Artifact: ${issue.target_artifact_id} → ${issue.target_block_id}`);
  console.log(`  Type: ${issue.issue_type}`);
  console.log("  Next: review patch → applyOverridePatch → regression → regenerate");
  console.log("  ══════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
