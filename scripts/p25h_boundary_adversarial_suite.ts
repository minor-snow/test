/**
 * P25h: Boundary Adversarial Suite (Saleor)
 *
 * Deterministic test suite to verify Pantheon's boundary enforcement capabilities against dangerous edge cases.
 *
 * Case 1: Forbidden file creation / migration
 * Case 2: Review vs Forbidden simultaneous modifications
 */

import { join, resolve, dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, cpSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const SALEOR_REPO = "H:\\Boom\\salary";
const ARTIFACT_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p25-saleor", "p25h_boundary_adversarial");
const CASES_DIR = join(ARTIFACT_DIR, "cases");

const MARKER = "\n# PANTHEON_P25H_SYNTHETIC_CHANGE: boundary adversarial fixture\n";
const MARKER_NEEDLE = "PANTHEON_P25H_SYNTHETIC_CHANGE";

const GUARD_ARGS = [
  "guard",
  "Add eco-packaging fee",
  "--scope", "saleor/checkout/**",
  "--scope", "saleor/graphql/checkout/**",
  "--review", "saleor/tax/**",
  "--review", "saleor/order/**",
  "--forbid", "saleor/payment/**",
  "--forbid", "saleor/account/**",
  "--forbid", "saleor/discount/**",
  "--forbid", "saleor/plugins/**",
  "--forbid", "saleor/core/settings.py",
  "--forbid", "**/migrations/**",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) { console.log(`[P25h] ${msg}`); }
function die(msg: string): never { console.error(`[P25h FATAL] ${msg}`); process.exit(1); }

function runGit(args: string[], cwd: string): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (r.error) die(`git ${args.join(" ")} error: ${r.error.message}`);
  if (r.status !== 0) die(`git ${args.join(" ")} failed:\n${r.stderr}`);
  return r.stdout.trim();
}

function runPantheon(args: string[], cwd: string, allowNonZero = false): { stdout: string; status: number } {
  const pantheonPath = join(PANTHEON_ROOT, "src", "cli", "pantheon.ts");
  const r = spawnSync("npx", ["tsx", pantheonPath, ...args], { cwd, encoding: "utf-8", shell: true });
  if (r.error) die(`pantheon ${args[0]} error: ${r.error.message}`);
  if (!allowNonZero && r.status !== 0) die(`pantheon ${args.join(" ")} failed:\n${r.stderr}\n${r.stdout}`);
  return { stdout: r.stdout.trim(), status: r.status ?? 0 };
}

function selectCandidate(candidates: string[], root: string): string {
  for (const c of candidates) {
    if (existsSync(join(root, c))) return c;
  }
  die(`No candidate found: ${candidates.join(", ")}`);
}

function hasMarker(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  return readFileSync(filePath, "utf-8").includes(MARKER_NEEDLE);
}

type Finding = {
  kind: string;
  severity: string;
  file: string;
  message: string;
  allowed_actions: string[];
  requires_human: boolean;
};

type CheckJson = {
  verdict: string;
  summary: Record<string, number>;
  findings: Finding[];
  attempt?: number;
  history?: Array<{ attempt: number; verdict: string; violation_count: number }>;
};

// ---------------------------------------------------------------------------
// Setup / Cleanup / Recovery Helpers
// ---------------------------------------------------------------------------

function createWorktree(worktreeDir: string) {
  if (existsSync(worktreeDir)) {
    log(`Removing existing worktree at ${worktreeDir}...`);
    spawnSync("git", ["worktree", "remove", "--force", worktreeDir], { cwd: SALEOR_REPO });
    if (existsSync(worktreeDir)) rmSync(worktreeDir, { recursive: true, force: true });
  }
  log(`Creating fresh worktree at ${worktreeDir}...`);
  runGit(["worktree", "add", worktreeDir, "HEAD"], SALEOR_REPO);
}

function cleanupWorktree(worktreeDir: string) {
  log(`Cleaning up worktree at ${worktreeDir}...`);
  const cleanup = spawnSync("git", ["worktree", "remove", "--force", worktreeDir], { cwd: SALEOR_REPO });
  if (cleanup.status === 0) {
    log("✅ Worktree cleanup succeeded");
  } else {
    console.error(`⚠️ Worktree cleanup failed: ${cleanup.stderr}`);
  }
}

function revertFile(filePath: string, worktreeDir: string) {
  const status = runGit(["status", "--porcelain", filePath], worktreeDir);
  if (status.startsWith("??") || status.startsWith("A ")) {
    // Untracked or newly added file
    log(`File is new/untracked. Removing: ${filePath}`);
    const fullPath = join(worktreeDir, filePath);
    if (existsSync(fullPath)) rmSync(fullPath, { force: true });
    // If it was added to index, we must also clear it from index
    if (status.startsWith("A ")) {
      runGit(["rm", "--cached", "-f", filePath], worktreeDir);
    }
  } else {
    // Tracked modified file
    log(`File is tracked. Checking out HEAD: ${filePath}`);
    runGit(["checkout", "HEAD", "--", filePath], worktreeDir);
  }
}

// ---------------------------------------------------------------------------
// Case 1: Forbidden file creation / migration
// ---------------------------------------------------------------------------

function runCase1(): any {
  const caseName = "forbidden_migration_creation";
  log(`\n=== Running Case 1: ${caseName} ===`);
  
  const caseDir = join(CASES_DIR, caseName);
  const worktreeDir = join(ARTIFACT_DIR, "wt1");
  mkdirSync(caseDir, { recursive: true });

  createWorktree(worktreeDir);
  log("Running pantheon guard...");
  runPantheon(GUARD_ARGS, worktreeDir);

  const newFilePath = "saleor/checkout/migrations/9999_auto_eco_fee.py";
  const newFileFullPath = join(worktreeDir, newFilePath);
  
  log(`Creating forbidden file: ${newFilePath}`);
  mkdirSync(dirname(newFileFullPath), { recursive: true });
  writeFileSync(newFileFullPath, MARKER);

  log("Running pantheon check (attempt 1)...");
  runPantheon(["check"], worktreeDir, true);

  const check1Path = join(worktreeDir, ".pantheon", "check.json");
  if (!existsSync(check1Path)) die("check.json not produced for attempt 1");
  const check1: CheckJson = JSON.parse(readFileSync(check1Path, "utf-8"));

  log(`attempt_1 verdict: ${check1.verdict}`);

  if (check1.verdict !== "requires_reverse_issue" && check1.verdict !== "fail") {
    die(`Expected blocking verdict for attempt 1, got: ${check1.verdict}`);
  }

  const BLOCKING_SEVERITIES = new Set(["blocking", "reverse_issue_required", "revert_required"]);

  // Look for the blocking finding for the new file
  const blockingFinding = check1.findings.find(f => 
    f.file === newFilePath && 
    BLOCKING_SEVERITIES.has(f.severity)
  );

  if (!blockingFinding) {
    die(`Did not find blocking finding for newly created forbidden file ${newFilePath}`);
  }

  log(`✅ Found blocking finding for new file: ${blockingFinding.kind} (${blockingFinding.severity})`);

  if (!blockingFinding.allowed_actions.includes("revert_file")) {
    die(`Expected revert_file in allowed actions, got: ${blockingFinding.allowed_actions.join(", ")}`);
  }

  // Recovery
  log("Executing recovery (reverting new file)...");
  revertFile(newFilePath, worktreeDir);

  log("Running pantheon check (attempt 2)...");
  const check2Out = runPantheon(["check"], worktreeDir, true);

  let check2: CheckJson;
  if (check2Out.stdout.includes("no changed files detected")) {
    check2 = { verdict: "pass", summary: {}, findings: [] };
  } else {
    check2 = JSON.parse(readFileSync(check1Path, "utf-8"));
  }
  log(`attempt_2 verdict: ${check2.verdict}`);

  if (check2.verdict === "requires_reverse_issue" || check2.verdict === "fail") {
    die(`Expected non-blocking verdict after recovery, got: ${check2.verdict}`);
  }

  const findingInAttempt2 = check2.findings.find(f => f.file === newFilePath);
  if (findingInAttempt2) {
    die(`Expected finding for new file to be gone, but found: ${JSON.stringify(findingInAttempt2)}`);
  }

  log(`✅ Recovery successful, verdict improved to ${check2.verdict} and finding is gone`);

  // Generate diff patches manually since cmdCheck doesn't save full diff patches
  const diff1 = runGit(["diff", "HEAD"], worktreeDir);
  writeFileSync(join(caseDir, "diff_attempt_1.patch"), diff1);

  // Save artifacts
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "diff_name_status.txt"), join(caseDir, "diff_name_status_attempt_1.txt"));
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "check.json"), join(caseDir, "check_attempt_1.json"));
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "report.md"), join(caseDir, "report_attempt_1.md"));
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "feedback.md"), join(caseDir, "feedback_attempt_1.md"));
  
  if (existsSync(join(worktreeDir, ".pantheon", "attempts", "attempt_2"))) {
    const diff2 = runGit(["diff", "HEAD"], worktreeDir);
    writeFileSync(join(caseDir, "diff_attempt_2.patch"), diff2);
    cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_2", "diff_name_status.txt"), join(caseDir, "diff_name_status_attempt_2.txt"));
    cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_2", "check.json"), join(caseDir, "check_attempt_2.json"));
  }

  const recoverySummary = {
    case: caseName,
    purpose: "Covers new forbidden file creation, not covered by P25d existing-file modification.",
    expected_boundary_behavior: "blocking + revert_file",
    status: "success",
    attempt_1_verdict: check1.verdict,
    attempt_2_verdict: check2.verdict,
    file_reverted: newFilePath
  };
  writeFileSync(join(caseDir, "recovery_summary.json"), JSON.stringify(recoverySummary, null, 2));

  cleanupWorktree(worktreeDir);
  return recoverySummary;
}

// ---------------------------------------------------------------------------
// Case 2: Review vs Forbidden simultaneous modifications
// ---------------------------------------------------------------------------

function runCase2(): any {
  const caseName = "review_vs_forbidden";
  log(`\n=== Running Case 2: ${caseName} ===`);

  const caseDir = join(CASES_DIR, caseName);
  const worktreeDir = join(ARTIFACT_DIR, "wt2");
  mkdirSync(caseDir, { recursive: true });

  createWorktree(worktreeDir);
  
  const allowedFile = selectCandidate(["saleor/checkout/models.py"], worktreeDir);
  const reviewFile = selectCandidate(["saleor/tax/models.py", "saleor/order/models.py"], worktreeDir);
  const forbiddenFile = selectCandidate(["saleor/discount/models.py", "saleor/payment/models.py"], worktreeDir);

  log("Running pantheon guard...");
  runPantheon(GUARD_ARGS, worktreeDir);

  log(`Modifying files: allowed=${allowedFile}, review=${reviewFile}, forbidden=${forbiddenFile}`);
  appendFileSync(join(worktreeDir, allowedFile), MARKER);
  appendFileSync(join(worktreeDir, reviewFile), MARKER);
  appendFileSync(join(worktreeDir, forbiddenFile), MARKER);

  log("Running pantheon check (attempt 1)...");
  runPantheon(["check"], worktreeDir, true);

  const check1Path = join(worktreeDir, ".pantheon", "check.json");
  if (!existsSync(check1Path)) die("check.json not produced for attempt 1");
  const check1: CheckJson = JSON.parse(readFileSync(check1Path, "utf-8"));

  log(`attempt_1 verdict: ${check1.verdict}`);

  if (check1.verdict !== "requires_reverse_issue" && check1.verdict !== "fail") {
    die(`Expected blocking verdict for attempt 1, got: ${check1.verdict}`);
  }

  // Assert individual files
  const taxFinding = check1.findings.find(f => f.file === reviewFile);
  const discountFinding = check1.findings.find(f => f.file === forbiddenFile);
  const checkoutFinding = check1.findings.find(f => f.file === allowedFile);

  const BLOCKING_SEVERITIES = new Set(["blocking", "reverse_issue_required", "revert_required"]);

  if (!taxFinding || (taxFinding.severity !== "review_required" && taxFinding.kind !== "requires_human_review")) {
    die(`Expected review_required finding for tax file, got: ${JSON.stringify(taxFinding)}`);
  }
  log(`✅ Tax file flagged as review_required`);

  if (!discountFinding || !BLOCKING_SEVERITIES.has(discountFinding.severity)) {
    die(`Expected blocking finding for discount file, got: ${JSON.stringify(discountFinding)}`);
  }
  log(`✅ Discount file flagged as blocking (${discountFinding.kind} - ${discountFinding.severity})`);

  if (!discountFinding.allowed_actions.includes("revert_file")) {
    die(`Expected revert_file in allowed actions for discount file, got: ${discountFinding.allowed_actions.join(", ")}`);
  }

  if (checkoutFinding && checkoutFinding.severity !== "info") {
    die(`Did not expect alert for checkout file, got: ${JSON.stringify(checkoutFinding)}`);
  }
  log(`✅ Checkout file has no alert`);

  // Recovery - Revert ONLY forbidden file
  log("Executing recovery (reverting forbidden file)...");
  revertFile(forbiddenFile, worktreeDir);

  // Verify markers
  if (!hasMarker(join(worktreeDir, allowedFile))) die(`Allowed file ${allowedFile} lost its marker!`);
  log(`✅ Allowed file marker remains`);
  
  if (!hasMarker(join(worktreeDir, reviewFile))) die(`Review file ${reviewFile} lost its marker!`);
  log(`✅ Review file marker remains`);
  
  if (hasMarker(join(worktreeDir, forbiddenFile))) die(`Forbidden file ${forbiddenFile} still has marker!`);
  log(`✅ Forbidden file marker gone`);

  log("Running pantheon check (attempt 2)...");
  const check2Out = runPantheon(["check"], worktreeDir, true);

  let check2: CheckJson;
  if (check2Out.stdout.includes("no changed files detected")) {
    check2 = { verdict: "pass", summary: {}, findings: [] };
  } else {
    const check2Path = join(worktreeDir, ".pantheon", "check.json");
    check2 = JSON.parse(readFileSync(check2Path, "utf-8"));
  }
  log(`attempt_2 verdict: ${check2.verdict}`);

  if (check2.verdict !== "requires_review") {
    die(`Expected requires_review verdict after recovery, got: ${check2.verdict}`);
  }

  const blockingFindings2 = check2.findings.filter(f => BLOCKING_SEVERITIES.has(f.severity));
  if (blockingFindings2.length > 0) {
    die(`Expected 0 blocking findings in attempt 2, got ${blockingFindings2.length}`);
  }

  const discountFinding2 = check2.findings.find(f => f.file === forbiddenFile);
  if (discountFinding2) {
    die(`Forbidden finding should be gone, but found: ${JSON.stringify(discountFinding2)}`);
  }

  log(`✅ Recovery successful, verdict improved to ${check2.verdict} with allowed/review files preserved. Blocking count: 0`);

  // Generate diff patches manually
  const diff1 = runGit(["diff", "HEAD"], worktreeDir);
  writeFileSync(join(caseDir, "diff_attempt_1.patch"), diff1);

  // Save artifacts
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "diff_name_status.txt"), join(caseDir, "diff_name_status_attempt_1.txt"));
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "check.json"), join(caseDir, "check_attempt_1.json"));
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "report.md"), join(caseDir, "report_attempt_1.md"));
  cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_1", "feedback.md"), join(caseDir, "feedback_attempt_1.md"));
  
  if (existsSync(join(worktreeDir, ".pantheon", "attempts", "attempt_2"))) {
    const diff2 = runGit(["diff", "HEAD"], worktreeDir);
    writeFileSync(join(caseDir, "diff_attempt_2.patch"), diff2);
    cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_2", "diff_name_status.txt"), join(caseDir, "diff_name_status_attempt_2.txt"));
    cpSync(join(worktreeDir, ".pantheon", "attempts", "attempt_2", "check.json"), join(caseDir, "check_attempt_2.json"));
  }

  const recoverySummary = {
    case: caseName,
    purpose: "Covers simultaneous modifications to allowed, review-required, and forbidden zones, verifying correct severity stratification and targeted recovery.",
    expected_boundary_behavior: "tax=review_required, discount=blocking, checkout=pass -> overall blocking. Recovery drops to requires_review.",
    status: "success",
    attempt_1_verdict: check1.verdict,
    attempt_2_verdict: check2.verdict,
    file_reverted: forbiddenFile,
    files_preserved: [allowedFile, reviewFile]
  };
  writeFileSync(join(caseDir, "recovery_summary.json"), JSON.stringify(recoverySummary, null, 2));

  cleanupWorktree(worktreeDir);
  return recoverySummary;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  log("Starting P25h Boundary Adversarial Suite");

  if (!existsSync(SALEOR_REPO) || !existsSync(join(SALEOR_REPO, ".git"))) {
    die(`Saleor repo not found at ${SALEOR_REPO}`);
  }

  mkdirSync(ARTIFACT_DIR, { recursive: true });

  const summary1 = runCase1();
  const summary2 = runCase2();

  const suiteSummary = {
    timestamp: new Date().toISOString(),
    cases: [summary1, summary2]
  };

  writeFileSync(join(ARTIFACT_DIR, "suite_summary.json"), JSON.stringify(suiteSummary, null, 2));

  const reportMd = `# P25h Boundary Adversarial Suite Report

**Status**: ✅ All tests passed

## Case 1: Forbidden Migration Creation
- **Objective**: Verify that creating a new file in a forbidden path (\`**/migrations/**\`) triggers a blocking violation.
- **Attempt 1 Verdict**: \`${summary1.attempt_1_verdict}\` (Intercepted correctly)
- **Recovery**: Reverted the newly created file.
- **Attempt 2 Verdict**: \`${summary1.attempt_2_verdict}\` (Recovered successfully)

## Case 2: Review vs Forbidden Stratification
- **Objective**: Verify that simultaneous modifications to allowed, review-required, and forbidden files are correctly stratified, and that recovering only the forbidden file improves the verdict.
- **Attempt 1 Verdict**: \`${summary2.attempt_1_verdict}\` (Blocked due to forbidden file)
- **Recovery**: Reverted only \`${summary2.file_reverted}\`. Preserved \`${summary2.files_preserved.join(", ")}\`.
- **Attempt 2 Verdict**: \`${summary2.attempt_2_verdict}\` (Correctly downgraded to review_required)

---

_Auto-generated by P25h adversarial suite._
`;

  writeFileSync(join(ARTIFACT_DIR, "suite_report.md"), reportMd);

  log("🎉 P25h suite complete.");
}

main();
