/**
 * P23.2: Verify synthetic violation attempt.
 *
 * Usage:
 *   npx tsx scripts/p23_2_verify.ts --repo "G:\pet test" --attempt 1 --out-dir p23_2_attempt_1
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { verifyDiffAgainstScope } from "../src/diffWorkflow/diffVerifier.js";
import { buildAgentFeedbackFromDiffVerification } from "../src/agentFeedback/diffFeedbackBuilder.js";
import { renderAgentFeedbackMarkdown } from "../src/agentFeedback/agentFeedbackRenderer.js";
import type { AgentScopeLite, GitDiffSummary } from "../src/diffWorkflow/types.js";
import type { ChangeContractLite } from "../src/changeContract/lite/types.js";

const args = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  const eq = args.find(a => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : def;
};

const repoRoot = getArg("repo", "G:\\pet test");
const attemptNum = getArg("attempt", "1");
const outDirName = getArg("out-dir", `p23_2_attempt_${attemptNum}`);

const pantheonDir = join(repoRoot, ".pantheon");
const attemptDir = join(pantheonDir, "attempts", outDirName);

console.log(`P23.2: Verifying attempt ${attemptNum}`);
console.log(`  Repo: ${repoRoot}`);
console.log(`  Output: ${attemptDir}`);

// Capture real git diff
const nameStatus = execSync("git diff --name-status", { cwd: repoRoot, encoding: "utf-8" });
const patch = execSync("git diff", { cwd: repoRoot, encoding: "utf-8" });

writeFileSync(join(attemptDir, "diff_name_status.txt"), nameStatus);
writeFileSync(join(attemptDir, "diff.patch"), patch);

console.log("  Changed files:");
const lines = nameStatus.trim().split("\n").filter(l => l.length > 0);
for (const l of lines) console.log("    " + l);

// Parse into diff summary
const changedFiles = lines
  .map(line => {
    const parts = line.split("\t");
    const statusChar = parts[0].charAt(0);
    const path = parts[parts.length - 1];
    const statusMap: Record<string, string> = {
      M: "modified", A: "added", D: "deleted", R: "renamed", C: "copied",
    };
    return { path, status: statusMap[statusChar] ?? "modified" };
  })
  .filter(f => !f.path.startsWith("node_modules/"));

const diff: GitDiffSummary = { changed_files: changedFiles as any, source: "git_diff" };

// Load scope and contract
const scope: AgentScopeLite = JSON.parse(readFileSync(join(pantheonDir, "agent_scope.json"), "utf-8"));
const contract: ChangeContractLite = JSON.parse(readFileSync(join(pantheonDir, "change_contract_lite.json"), "utf-8"));

// Verify
const verification = verifyDiffAgainstScope({ diff, scope });
writeFileSync(join(attemptDir, "diff_verification_result.json"), JSON.stringify(verification, null, 2));

console.log(`\n  Verdict: ${verification.verdict}`);
for (const fs of verification.file_statuses) {
  console.log(`    ${fs.status.padEnd(16)} ${fs.path}`);
  if (fs.reasons) for (const r of fs.reasons) console.log(`      → ${r}`);
}

// Generate feedback
const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
writeFileSync(join(attemptDir, "agent_feedback.json"), JSON.stringify(feedback, null, 2));
writeFileSync(join(attemptDir, "agent_feedback.md"), renderAgentFeedbackMarkdown(feedback));

console.log(`\n  Feedback summary:`);
console.log(`    Violations: ${feedback.summary.violation_count}`);
console.log(`    Blocking: ${feedback.summary.blocking_count}`);
console.log(`    Reverse issue required: ${feedback.summary.reverse_issue_required_count}`);
console.log(`    Requires human: ${feedback.summary.requires_human_count}`);
console.log(`    Retry allowed: ${feedback.retry_guidance.retry_allowed}`);
console.log(`    Retry mode: ${feedback.retry_guidance.retry_mode}`);

if (feedback.violations.length > 0) {
  console.log(`\n  Violations:`);
  for (const v of feedback.violations) {
    console.log(`    [${v.severity}] ${v.kind}: ${v.location.file_path}`);
    console.log(`      fix_hint: ${v.fix_hint}`);
    console.log(`      allowed_actions: ${v.allowed_agent_actions.join(", ")}`);
  }
}

if (feedback.repair_plan.length > 0) {
  console.log(`\n  Repair plan:`);
  for (const r of feedback.repair_plan) {
    console.log(`    ${r.action}: ${r.target?.file_path ?? "N/A"} — ${r.reason}`);
  }
}

console.log(`\n=== Attempt ${attemptNum} verified ===`);
