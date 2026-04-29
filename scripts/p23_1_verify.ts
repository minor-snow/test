/**
 * P23.1b: Verify an attempt's real git diff against Pantheon scope.
 *
 * Usage:
 *   npx tsx scripts/p23_1_verify.ts --repo "G:\pet test" --attempt 1
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { verifyDiffAgainstScope } from "../src/diffWorkflow/diffVerifier.js";
import { buildAgentFeedbackFromDiffVerification } from "../src/agentFeedback/diffFeedbackBuilder.js";
import { renderAgentFeedbackMarkdown } from "../src/agentFeedback/agentFeedbackRenderer.js";
import type { AgentScopeLite, GitDiffSummary } from "../src/diffWorkflow/types.js";
import type { ChangeContractLite } from "../src/changeContract/lite/types.js";

const repoRoot = process.argv.find(a => a.startsWith("--repo="))?.slice(7)
  ?? process.argv[process.argv.indexOf("--repo") + 1]
  ?? "G:\\pet test";

const attemptNum = parseInt(
  process.argv.find(a => a.startsWith("--attempt="))?.slice(10)
    ?? process.argv[process.argv.indexOf("--attempt") + 1]
    ?? "1"
);

const pantheonDir = join(repoRoot, ".pantheon");
const attemptDir = join(pantheonDir, "attempts", `attempt_${attemptNum}`);

console.log(`P23.1b: Verifying attempt ${attemptNum}`);
console.log(`  Repo: ${repoRoot}`);
console.log(`  Output: ${attemptDir}`);

// Step 1: Capture real git diff
const nameStatus = execSync("git diff --name-status", { cwd: repoRoot, encoding: "utf-8" });
const patch = execSync("git diff", { cwd: repoRoot, encoding: "utf-8" });

writeFileSync(join(attemptDir, "diff_name_status.txt"), nameStatus);
writeFileSync(join(attemptDir, "diff.patch"), patch);

console.log("  Captured diff:");
console.log("    " + nameStatus.trim().split("\n").join("\n    "));

// Step 2: Parse name-status into GitDiffSummary
const changedFiles = nameStatus.trim().split("\n")
  .filter(line => line.length > 0)
  .map(line => {
    const parts = line.split("\t");
    const statusChar = parts[0].charAt(0);
    const path = parts[parts.length - 1];
    const statusMap: Record<string, string> = {
      M: "modified", A: "added", D: "deleted", R: "renamed", C: "copied",
    };
    return { path, status: statusMap[statusChar] ?? "modified" };
  })
  // Exclude node_modules
  .filter(f => !f.path.startsWith("node_modules/"));

const diff: GitDiffSummary = {
  changed_files: changedFiles as any,
  source: "git_diff",
};

// Step 3: Load scope and contract
const scope: AgentScopeLite = JSON.parse(readFileSync(join(pantheonDir, "agent_scope.json"), "utf-8"));
const contract: ChangeContractLite = JSON.parse(readFileSync(join(pantheonDir, "change_contract_lite.json"), "utf-8"));

// Step 4: Verify
const verification = verifyDiffAgainstScope({ diff, scope });
writeFileSync(join(attemptDir, "diff_verification_result.json"), JSON.stringify(verification, null, 2));

console.log(`\n  Verdict: ${verification.verdict}`);
console.log(`  File statuses:`);
for (const fs of verification.file_statuses) {
  console.log(`    ${fs.status.padEnd(16)} ${fs.path}`);
}

// Step 5: Generate feedback
const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
writeFileSync(join(attemptDir, "agent_feedback.json"), JSON.stringify(feedback, null, 2));
writeFileSync(join(attemptDir, "agent_feedback.md"), renderAgentFeedbackMarkdown(feedback));

console.log(`\n  Feedback:`);
console.log(`    Violations: ${feedback.summary.violation_count}`);
console.log(`    Blocking: ${feedback.summary.blocking_count}`);
console.log(`    Requires human: ${feedback.summary.requires_human_count}`);
console.log(`    Retry allowed: ${feedback.retry_guidance.retry_allowed}`);

console.log(`\n=== Attempt ${attemptNum} artifacts written ===`);
console.log(`  ${attemptDir}/diff_name_status.txt`);
console.log(`  ${attemptDir}/diff.patch`);
console.log(`  ${attemptDir}/diff_verification_result.json`);
console.log(`  ${attemptDir}/agent_feedback.json`);
console.log(`  ${attemptDir}/agent_feedback.md`);
