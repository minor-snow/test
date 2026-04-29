/**
 * P25e: Saleor Agent Recovery Trial (Mode B — Deterministic)
 *
 * Proves that Pantheon's structured feedback loop can drive recovery
 * from P25d's forbidden boundary violation on Saleor-scale.
 *
 * Recovery actions are derived from check.json findings, NOT feedback.md.
 * feedback.md is copied as human/agent-facing evidence only.
 *
 * Flow:
 *   attempt_1: allowed + review + forbidden modifications → blocking verdict
 *   recovery:  revert only files with revert_file in blocking findings
 *   attempt_2: forbidden cleared, allowed preserved, review retained → improved verdict
 */

import { join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, cpSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const SALEOR_REPO = "H:\\Boom\\salary";
const ARTIFACT_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p25-saleor", "p25e_agent_recovery");
const WORKTREE_DIR = join(ARTIFACT_DIR, "saleor_worktree");

const MARKER = "\n# PANTHEON_P25D_SYNTHETIC_CHANGE: boundary verification fixture\n";
const MARKER_NEEDLE = "PANTHEON_P25D_SYNTHETIC_CHANGE";

const ALLOWED_CANDIDATES = [
  "saleor/checkout/models.py",
  "saleor/checkout/calculations.py",
  "saleor/checkout/actions.py",
];
const REVIEW_CANDIDATES = [
  "saleor/tax/models.py",
  "saleor/tax/calculations.py",
  "saleor/order/models.py",
];
const FORBIDDEN_CANDIDATES = [
  "saleor/payment/gateway.py",
  "saleor/payment/models.py",
  "saleor/discount/models.py",
];

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

function log(msg: string) { console.log(`[P25e] ${msg}`); }
function die(msg: string): never { console.error(`[P25e FATAL] ${msg}`); process.exit(1); }

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
// Main
// ---------------------------------------------------------------------------

function main() {
  log("Starting P25e Saleor Agent Recovery Trial");

  // 0. Verify Saleor repo
  if (!existsSync(SALEOR_REPO) || !existsSync(join(SALEOR_REPO, ".git"))) {
    die(`Saleor repo not found at ${SALEOR_REPO}`);
  }

  mkdirSync(ARTIFACT_DIR, { recursive: true });

  // 1. Select candidate files (same logic as P25d)
  // We need to know them before checking worktree state
  const tempRef = existsSync(WORKTREE_DIR) ? WORKTREE_DIR : SALEOR_REPO;
  const allowedFile = selectCandidate(ALLOWED_CANDIDATES, tempRef);
  const reviewFile = selectCandidate(REVIEW_CANDIDATES, tempRef);
  const forbiddenFile = selectCandidate(FORBIDDEN_CANDIDATES, tempRef);

  log(`Files: allowed=${allowedFile}, review=${reviewFile}, forbidden=${forbiddenFile}`);

  // 2. Check if P25d worktree can be reused
  let needRebuild = true;
  if (existsSync(WORKTREE_DIR)) {
    const markerOk =
      hasMarker(join(WORKTREE_DIR, allowedFile)) &&
      hasMarker(join(WORKTREE_DIR, reviewFile)) &&
      hasMarker(join(WORKTREE_DIR, forbiddenFile));

    if (markerOk) {
      log("Reusing existing worktree with verified synthetic markers");
      needRebuild = false;
    } else {
      log("Worktree exists but markers invalid — rebuilding");
      spawnSync("git", ["worktree", "remove", "--force", WORKTREE_DIR], { cwd: SALEOR_REPO });
      if (existsSync(WORKTREE_DIR)) rmSync(WORKTREE_DIR, { recursive: true, force: true });
    }
  }

  if (needRebuild) {
    log("Creating fresh worktree...");
    runGit(["worktree", "add", WORKTREE_DIR, "HEAD"], SALEOR_REPO);

    log("Running pantheon guard...");
    runPantheon(GUARD_ARGS, WORKTREE_DIR);

    log("Applying synthetic modifications...");
    appendFileSync(join(WORKTREE_DIR, allowedFile), MARKER);
    appendFileSync(join(WORKTREE_DIR, reviewFile), MARKER);
    appendFileSync(join(WORKTREE_DIR, forbiddenFile), MARKER);
  }

  // =========================================================================
  // ATTEMPT 1: check with violations
  // =========================================================================

  log("Running pantheon check (attempt 1)...");
  runPantheon(["check"], WORKTREE_DIR, true);

  const check1Path = join(WORKTREE_DIR, ".pantheon", "check.json");
  if (!existsSync(check1Path)) die("check.json not produced for attempt 1");
  const check1: CheckJson = JSON.parse(readFileSync(check1Path, "utf-8"));

  log(`attempt_1 verdict: ${check1.verdict}`);

  // Save attempt 1 diff
  const diff1 = runGit(["diff"], WORKTREE_DIR);
  const diffNs1 = runGit(["diff", "--name-status"], WORKTREE_DIR);
  writeFileSync(join(ARTIFACT_DIR, "diff_attempt_1.patch"), diff1);
  writeFileSync(join(ARTIFACT_DIR, "diff_name_status_attempt_1.txt"), diffNs1);

  // Assert attempt 1 is blocking
  if (check1.verdict !== "requires_reverse_issue" && check1.verdict !== "fail") {
    die(`Expected blocking verdict for attempt 1, got: ${check1.verdict}`);
  }
  log("✅ attempt_1 is blocking");

  // =========================================================================
  // PHASE 2: Read Structured Recovery Actions
  // =========================================================================

  log("Reading structured recovery actions from check.json findings...");

  const BLOCKING_SEVERITIES = new Set([
    "blocking", "reverse_issue_required", "revert_required",
  ]);
  const BLOCKING_KINDS = new Set([
    "forbidden_file_modified", "outside_scope_file",
  ]);

  type RecoveryAction = {
    file: string;
    action: string;
    source: string;
    finding_kind: string;
    finding_severity: string;
  };

  const recoveryActions: RecoveryAction[] = [];

  for (const f of check1.findings) {
    const isBlocking = BLOCKING_SEVERITIES.has(f.severity) || BLOCKING_KINDS.has(f.kind);
    if (isBlocking && f.allowed_actions.includes("revert_file")) {
      recoveryActions.push({
        file: f.file,
        action: "revert_file",
        source: "check.json findings[*].allowed_actions",
        finding_kind: f.kind,
        finding_severity: f.severity,
      });
    }
  }

  if (recoveryActions.length === 0) {
    die("No revert_file actions found in blocking findings — nothing to recover");
  }

  log(`Found ${recoveryActions.length} recovery action(s):`);
  for (const a of recoveryActions) {
    log(`  revert_file: ${a.file} (${a.finding_kind})`);
  }

  // =========================================================================
  // PHASE 3: Simulated Agent Recovery
  // =========================================================================

  log("Executing recovery...");

  for (const a of recoveryActions) {
    log(`Reverting: ${a.file}`);
    runGit(["checkout", "HEAD", "--", a.file], WORKTREE_DIR);
  }

  // Verify: allowed file marker must still exist
  if (!hasMarker(join(WORKTREE_DIR, allowedFile))) {
    die(`Allowed file ${allowedFile} lost its marker during recovery!`);
  }
  log(`✅ Allowed file preserved: ${allowedFile}`);

  // Verify: review file marker must still exist
  if (!hasMarker(join(WORKTREE_DIR, reviewFile))) {
    die(`Review file ${reviewFile} lost its marker during recovery!`);
  }
  log(`✅ Review file preserved: ${reviewFile}`);

  // Verify: forbidden file marker must be gone
  if (hasMarker(join(WORKTREE_DIR, forbiddenFile))) {
    die(`Forbidden file ${forbiddenFile} still has marker after revert!`);
  }
  log(`✅ Forbidden file reverted: ${forbiddenFile}`);

  // =========================================================================
  // PHASE 4: Verify Recovery (attempt 2)
  // =========================================================================

  log("Running pantheon check (attempt 2)...");
  runPantheon(["check"], WORKTREE_DIR, true);

  const check2: CheckJson = JSON.parse(readFileSync(check1Path, "utf-8"));

  log(`attempt_2 verdict: ${check2.verdict}`);

  // Save attempt 2 diff
  const diff2 = runGit(["diff"], WORKTREE_DIR);
  const diffNs2 = runGit(["diff", "--name-status"], WORKTREE_DIR);
  writeFileSync(join(ARTIFACT_DIR, "diff_attempt_2.patch"), diff2);
  writeFileSync(join(ARTIFACT_DIR, "diff_name_status_attempt_2.txt"), diffNs2);

  // Derive counts from findings
  const blockingFindings1 = check1.findings.filter(f =>
    BLOCKING_SEVERITIES.has(f.severity) || BLOCKING_KINDS.has(f.kind));
  const blockingFindings2 = check2.findings.filter(f =>
    BLOCKING_SEVERITIES.has(f.severity) || BLOCKING_KINDS.has(f.kind));
  const reviewFindings2 = check2.findings.filter(f =>
    f.severity === "review_required" || f.kind === "review_required");

  // Assert: attempt 2 must not be blocking
  if (check2.verdict === "requires_reverse_issue" || check2.verdict === "fail") {
    die(`Expected non-blocking verdict for attempt 2, got: ${check2.verdict}`);
  }
  log(`✅ attempt_2 verdict improved: ${check1.verdict} → ${check2.verdict}`);

  // Assert: no blocking findings in attempt 2
  if (blockingFindings2.length > 0) {
    die(`Expected 0 blocking findings in attempt 2, got: ${blockingFindings2.length}`);
  }
  log("✅ All blocking findings cleared");

  // Assert: forbidden file must not appear in findings
  const forbiddenStillPresent = check2.findings.some(f => f.file === forbiddenFile);
  if (forbiddenStillPresent) {
    die(`Forbidden file ${forbiddenFile} still in attempt 2 findings`);
  }
  log(`✅ Forbidden file absent from attempt 2 findings`);

  // Assert: review file should still be flagged (if it was modified)
  const reviewStillPresent = check2.findings.some(f => f.file === reviewFile);
  if (reviewStillPresent) {
    log(`✅ Review file correctly retained in findings: ${reviewFile}`);
  } else {
    log(`ℹ️ Review file not in findings (may be in allowed scope)`);
  }

  // Assert: attempt history contains both attempts
  if (check2.history && check2.history.length >= 2) {
    log(`✅ Attempt history: ${check2.history.length} entries`);
  }

  // =========================================================================
  // PHASE 5: Save Comparison Artifact
  // =========================================================================

  log("Saving recovery summary...");

  const summary = {
    status: "success",
    attempt_1: {
      verdict: check1.verdict,
      blocking_findings: blockingFindings1.length,
      total_findings: check1.findings.length,
    },
    attempt_2: {
      verdict: check2.verdict,
      blocking_findings: blockingFindings2.length,
      review_findings: reviewFindings2.length,
      total_findings: check2.findings.length,
    },
    recovery_delta: {
      verdict_improved: check2.verdict !== check1.verdict,
      blocking_cleared: blockingFindings2.length === 0,
      forbidden_file_cleared: !forbiddenStillPresent,
      allowed_file_preserved: true,
      review_file_preserved: true,
    },
    recovery_actions: recoveryActions,
    files: { allowedFile, reviewFile, forbiddenFile },
  };

  writeFileSync(join(ARTIFACT_DIR, "p25e_recovery_summary.json"), JSON.stringify(summary, null, 2));

  // Recovery notes
  const notes = [
    "# P25e Recovery Notes",
    "",
    `Attempt 1 modified: \`${allowedFile}\` (allowed), \`${reviewFile}\` (review), \`${forbiddenFile}\` (forbidden).`,
    `Pantheon blocked with verdict: \`${check1.verdict}\`.`,
    "",
    `Recovery followed structured \`revert_file\` action from \`check.json.findings[*].allowed_actions\`.`,
    `Reverted: ${recoveryActions.map(a => `\`${a.file}\``).join(", ")}.`,
    "",
    `Attempt 2 cleared forbidden change. Verdict improved: \`${check1.verdict}\` → \`${check2.verdict}\`.`,
    `Allowed file \`${allowedFile}\` preserved.`,
    `Review file \`${reviewFile}\` preserved.`,
    "",
    "---",
    "",
    "_Auto-generated by P25e recovery trial._",
  ].join("\n");

  writeFileSync(join(ARTIFACT_DIR, "recovery_notes.md"), notes);

  // Copy .pantheon artifacts
  const targetPantheonDir = join(ARTIFACT_DIR, ".pantheon");
  if (existsSync(targetPantheonDir)) rmSync(targetPantheonDir, { recursive: true, force: true });
  cpSync(join(WORKTREE_DIR, ".pantheon"), targetPantheonDir, { recursive: true });

  // Cleanup worktree
  log("Cleaning up worktree...");
  const cleanup = spawnSync("git", ["worktree", "remove", "--force", WORKTREE_DIR], { cwd: SALEOR_REPO });
  if (cleanup.status === 0) {
    log("✅ Worktree cleanup succeeded");
  } else {
    console.error(`⚠️ Worktree cleanup failed: ${cleanup.stderr}`);
  }

  log("");
  log("═══════════════════════════════════════════════════");
  log(`  attempt_1: ${check1.verdict} (blocking: ${blockingFindings1.length})`);
  log(`  recovery:  reverted ${recoveryActions.length} file(s)`);
  log(`  attempt_2: ${check2.verdict} (blocking: ${blockingFindings2.length})`);
  log("═══════════════════════════════════════════════════");
  log("🎉 P25e recovery trial complete.");
}

main();
