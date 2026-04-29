import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const DIST_ACTION_ENTRY = join(PANTHEON_ROOT, "dist", "src", "github", "githubActionEntry.js");
const SALEOR_REPO = "H:\\Boom\\salary";
const OUTPUT_ROOT = join(PANTHEON_ROOT, "data", "dogfood", "p26-github-action");

const INTENT = "Add an eco-packaging fee during checkout for selected product types.";
const SCOPE_PATTERNS = [
  "saleor/checkout/**",
  "saleor/graphql/checkout/**",
];
const REVIEW_PATTERNS = [
  "saleor/tax/**",
  "saleor/order/**",
];
const FORBID_PATTERNS = [
  "saleor/payment/**",
  "saleor/account/**",
  "saleor/discount/**",
  "saleor/plugins/**",
  "**/migrations/**",
];

const ALLOWED_CANDIDATES = [
  "saleor/checkout/models.py",
  "saleor/checkout/calculations.py",
  "saleor/checkout/actions.py",
];

const REVIEW_CANDIDATES = [
  "saleor/order/models.py",
  "saleor/tax/models.py",
  "saleor/order/events.py",
];

const FORBIDDEN_CANDIDATES = [
  "saleor/discount/models.py",
  "saleor/payment/gateway.py",
  "saleor/payment/models.py",
];

const REVIEW_MARKER = "\n# PANTHEON_P26_REQUIRES_REVIEW_FIXTURE\n";
const BLOCKING_MARKER = "\n# PANTHEON_P26_BLOCKING_FIXTURE\n";

type CaseResult = {
  case_id: string;
  action_exit_code: number;
  verdict: string;
  base_sha: string;
  head_sha: string;
  changed_files: string[];
  notes: string[];
};

function main(): void {
  try {
    log("Starting P26 GitHub Action dogfood");
    ensurePrerequisites();

    rmSync(OUTPUT_ROOT, { recursive: true, force: true });
    mkdirSync(OUTPUT_ROOT, { recursive: true });

    const reviewCase = runRequiresReviewCase();
    const blockingCase = runBlockingCase();

    writeFileSync(join(OUTPUT_ROOT, "p26_summary.json"), JSON.stringify({
      phase: "P26",
      generated_at: new Date().toISOString(),
      cases: [reviewCase, blockingCase],
    }, null, 2));
    writeFileSync(join(OUTPUT_ROOT, "p26_summary.md"), renderSummary([reviewCase, blockingCase]));

    log("P26 dogfood complete");
  } catch (error) {
    console.error(`[P26 FATAL] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function ensurePrerequisites(): void {
  if (!existsSync(SALEOR_REPO) || !existsSync(join(SALEOR_REPO, ".git"))) {
    die(`Saleor repository not found at ${SALEOR_REPO}`);
  }
  if (!existsSync(DIST_ACTION_ENTRY)) {
    die(`Compiled GitHub Action entry not found at ${DIST_ACTION_ENTRY}. Run 'npm run build' first.`);
  }
}

function runRequiresReviewCase(): CaseResult {
  const caseId = "requires_review_case";
  const caseDir = join(OUTPUT_ROOT, caseId);
  const worktreeDir = join(caseDir, "worktree");
  mkdirSync(caseDir, { recursive: true });

  createFreshWorktree(worktreeDir);
  try {
    const baseSha = runGit(["rev-parse", "HEAD"], worktreeDir);
    const headSha = baseSha;
    const allowedFileA = selectCandidate(ALLOWED_CANDIDATES, worktreeDir);
    const allowedFileB = selectCandidate(ALLOWED_CANDIDATES.filter(path => path !== allowedFileA), worktreeDir);
    const reviewFile = selectCandidate(REVIEW_CANDIDATES, worktreeDir);

    appendFileSync(join(worktreeDir, allowedFileA), REVIEW_MARKER);
    appendFileSync(join(worktreeDir, allowedFileB), REVIEW_MARKER);
    appendFileSync(join(worktreeDir, reviewFile), REVIEW_MARKER);

    writeDiffArtifacts(worktreeDir, caseDir);
    const eventPath = writePullRequestEvent(caseDir, 2601, INTENT, baseSha, headSha);
    const actionResult = runAction(caseDir, worktreeDir, eventPath);
    copyPantheonReport(worktreeDir, caseDir);

    if (actionResult.status !== 0) {
      die(`${caseId}: expected exit code 0, got ${actionResult.status}`);
    }

    const check = readJson(join(caseDir, "check.json")) as {
      verdict: string;
      summary: { review_required: number; forbidden: number; outside_scope: number };
    };
    if (check.verdict !== "requires_review") {
      die(`${caseId}: expected verdict requires_review, got ${check.verdict}`);
    }
    if (check.summary.review_required < 1 || check.summary.forbidden !== 0 || check.summary.outside_scope !== 0) {
      die(`${caseId}: unexpected summary ${JSON.stringify(check.summary)}`);
    }

    const comment = readText(join(caseDir, "pr_comment.md"));
    if (!comment.includes(reviewFile)) {
      die(`${caseId}: PR comment missing review file ${reviewFile}`);
    }

    const summary = readText(join(caseDir, "step_summary.md"));
    if (!summary.includes("requires_review")) {
      die(`${caseId}: step summary missing requires_review verdict`);
    }

    const result: CaseResult = {
      case_id: caseId,
      action_exit_code: actionResult.status ?? 0,
      verdict: check.verdict,
      base_sha: baseSha,
      head_sha: headSha,
      changed_files: [allowedFileA, allowedFileB, reviewFile],
      notes: [
        "Expected non-blocking review escalation.",
        `Review file surfaced in PR comment: ${reviewFile}`,
      ],
    };
    writeFileSync(join(caseDir, "result_summary.json"), JSON.stringify(result, null, 2));
    return result;
  } finally {
    cleanupWorktree(worktreeDir);
  }
}

function runBlockingCase(): CaseResult {
  const caseId = "blocking_case";
  const caseDir = join(OUTPUT_ROOT, caseId);
  const worktreeDir = join(caseDir, "worktree");
  mkdirSync(caseDir, { recursive: true });

  createFreshWorktree(worktreeDir);
  try {
    const baseSha = runGit(["rev-parse", "HEAD"], worktreeDir);
    const headSha = baseSha;
    const forbiddenFile = selectCandidate(FORBIDDEN_CANDIDATES, worktreeDir);
    const migrationFile = "saleor/checkout/migrations/9999_auto_eco_fee.py";
    const migrationFullPath = join(worktreeDir, migrationFile);
    mkdirSync(dirname(migrationFullPath), { recursive: true });

    appendFileSync(join(worktreeDir, forbiddenFile), BLOCKING_MARKER);
    writeFileSync(migrationFullPath, `# ${BLOCKING_MARKER.trim()}\n`);
    runGit(["add", "-N", migrationFile], worktreeDir);

    writeDiffArtifacts(worktreeDir, caseDir);
    const eventPath = writePullRequestEvent(caseDir, 2602, INTENT, baseSha, headSha);
    const actionResult = runAction(caseDir, worktreeDir, eventPath);
    copyPantheonReport(worktreeDir, caseDir);

    if (actionResult.status !== 1) {
      die(`${caseId}: expected exit code 1, got ${actionResult.status}`);
    }

    const check = readJson(join(caseDir, "check.json")) as {
      verdict: string;
      summary: { forbidden: number; outside_scope: number };
      findings: Array<{ file: string; kind: string; allowed_actions: string[] }>;
    };
    if (check.verdict !== "requires_reverse_issue") {
      die(`${caseId}: expected verdict requires_reverse_issue, got ${check.verdict}`);
    }
    if (check.summary.forbidden < 1 && check.summary.outside_scope < 1) {
      die(`${caseId}: expected at least one blocking finding`);
    }

    const comment = readText(join(caseDir, "pr_comment.md"));
    if (!comment.includes(forbiddenFile) && !comment.includes(migrationFile)) {
      die(`${caseId}: PR comment missing blocking file`);
    }

    const feedback = readText(join(caseDir, "feedback.md"));
    if (
      !feedback.includes("revert_file") &&
      !feedback.includes("request_reverse_issue") &&
      !feedback.includes("Request scope expansion")
    ) {
      die(`${caseId}: feedback missing recovery action`);
    }

    const result: CaseResult = {
      case_id: caseId,
      action_exit_code: actionResult.status ?? 1,
      verdict: check.verdict,
      base_sha: baseSha,
      head_sha: headSha,
      changed_files: [forbiddenFile, migrationFile],
      notes: [
        "Expected blocking violation.",
        `Blocking comment references ${comment.includes(migrationFile) ? migrationFile : forbiddenFile}.`,
      ],
    };
    writeFileSync(join(caseDir, "result_summary.json"), JSON.stringify(result, null, 2));
    return result;
  } finally {
    cleanupWorktree(worktreeDir);
  }
}

function writePullRequestEvent(caseDir: string, prNumber: number, title: string, baseSha: string, headSha: string): string {
  const eventPath = join(caseDir, "github_event.json");
  writeFileSync(eventPath, JSON.stringify({
    number: prNumber,
    repository: {
      name: "saleor",
      owner: { login: "saleor" },
    },
    pull_request: {
      title,
      base: { sha: baseSha },
      head: { sha: headSha },
    },
  }, null, 2));
  return eventPath;
}

function runAction(caseDir: string, worktreeDir: string, eventPath: string) {
  const summaryPath = join(caseDir, "step_summary_output.md");
  const env = {
    ...process.env,
    GITHUB_WORKSPACE: worktreeDir,
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_STEP_SUMMARY: summaryPath,
    INPUT_INTENT: INTENT,
    INPUT_SCOPE: SCOPE_PATTERNS.join("\n"),
    INPUT_REVIEW: REVIEW_PATTERNS.join("\n"),
    INPUT_FORBID: FORBID_PATTERNS.join("\n"),
    INPUT_FAIL_ON: "forbidden,outside_scope",
    INPUT_POST_COMMENT: "false",
    INPUT_UPLOAD_ARTIFACTS: "true",
    INPUT_ARTIFACT_MODE: "public",
    INPUT_COMMENT_MODE: "update",
  };

  const result = spawnSync(process.execPath, [DIST_ACTION_ENTRY], {
    cwd: worktreeDir,
    env,
    encoding: "utf-8",
    stdio: "pipe",
  });
  writeFileSync(join(caseDir, "action_stdout.log"), result.stdout ?? "");
  writeFileSync(join(caseDir, "action_stderr.log"), result.stderr ?? "");
  if (result.error) {
    die(`GitHub Action runtime failed: ${result.error.message}`);
  }
  return result;
}

function writeDiffArtifacts(worktreeDir: string, caseDir: string): void {
  const diffPatch = runGit(["diff", "HEAD"], worktreeDir, true);
  const diffNameStatus = runGit(["diff", "--name-status", "HEAD"], worktreeDir, true);
  writeFileSync(join(caseDir, "diff.patch"), diffPatch);
  writeFileSync(join(caseDir, "diff_name_status.txt"), diffNameStatus);
}

function copyPantheonReport(worktreeDir: string, caseDir: string): void {
  const reportDir = join(worktreeDir, "pantheon-report");
  if (!existsSync(reportDir)) {
    die(`pantheon-report was not generated in ${worktreeDir}`);
  }

  for (const name of [
    "task.md",
    "scope.md",
    "check.json",
    "report.md",
    "feedback.md",
    "python_report.md",
    "pr_comment.md",
    "step_summary.md",
    "action_context.json",
  ]) {
    const source = join(reportDir, name);
    if (existsSync(source)) {
      cpSync(source, join(caseDir, name));
    }
  }
}

function createFreshWorktree(worktreeDir: string): void {
  runGit(["worktree", "prune"], SALEOR_REPO, true);
  if (existsSync(worktreeDir)) {
    spawnSync("git", ["worktree", "remove", "--force", worktreeDir], { cwd: SALEOR_REPO, encoding: "utf-8" });
    rmSync(worktreeDir, { recursive: true, force: true });
  }
  mkdirSync(dirname(worktreeDir), { recursive: true });
  runGit(["worktree", "add", "--force", worktreeDir, "HEAD"], SALEOR_REPO);
}

function cleanupWorktree(worktreeDir: string): void {
  spawnSync("git", ["worktree", "remove", "--force", worktreeDir], {
    cwd: SALEOR_REPO,
    encoding: "utf-8",
  });
  rmSync(worktreeDir, { recursive: true, force: true });
}

function selectCandidate(candidates: string[], repoRoot: string): string {
  for (const candidate of candidates) {
    if (existsSync(join(repoRoot, candidate))) {
      return candidate;
    }
  }
  die(`No candidate found from: ${candidates.join(", ")}`);
}

function runGit(args: string[], cwd: string, allowNonZero = false): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.error) {
    die(`git ${args.join(" ")} failed: ${result.error.message}`);
  }
  if (!allowNonZero && result.status !== 0) {
    die(`git ${args.join(" ")} failed:\n${result.stderr}`);
  }
  return (result.stdout ?? "").trim();
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path));
}

function readText(path: string): string {
  if (!existsSync(path)) die(`Expected file not found: ${path}`);
  return readFileSync(path, "utf-8");
}

function renderSummary(results: readonly CaseResult[]): string {
  const lines: string[] = [];
  lines.push("# P26 GitHub Action Dogfood");
  lines.push("");
  lines.push("| Case | Exit code | Verdict |");
  lines.push("|---|---:|---|");
  for (const result of results) {
    lines.push(`| ${result.case_id} | ${result.action_exit_code} | \`${result.verdict}\` |`);
  }
  lines.push("");
  for (const result of results) {
    lines.push(`## ${result.case_id}`);
    lines.push("");
    lines.push(`- Base SHA: \`${result.base_sha.slice(0, 12)}\``);
    lines.push(`- Head SHA: \`${result.head_sha.slice(0, 12)}\``);
    lines.push(`- Changed files: ${result.changed_files.join(", ")}`);
    for (const note of result.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("_Auto-generated by P26 dogfood._");
  lines.push("");
  return lines.join("\n");
}

function log(message: string): void {
  console.log(`[P26] ${message}`);
}

function die(message: string): never {
  throw new Error(message);
}

main();
