import { join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, rmSync, appendFileSync, cpSync, writeFileSync } from "node:fs";
import { spawnSync, execSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const SALEOR_REPO = "H:\\Boom\\salary";
const ARTIFACT_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p25-saleor", "p25d_synthetic_pr_check");
const WORKTREE_DIR = join(ARTIFACT_DIR, "saleor_worktree");

const MARKER = "\n# PANTHEON_P25D_SYNTHETIC_CHANGE: boundary verification fixture\n";

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

function log(msg: string) {
  console.log(`[P25d] ${msg}`);
}

function die(msg: string): never {
  console.error(`[P25d FATAL] ${msg}`);
  process.exit(1);
}

function runGit(args: string[], cwd: string): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.error) die(`Git command failed: ${result.error.message}`);
  if (result.status !== 0) die(`Git command 'git ${args.join(" ")}' failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function runPantheon(args: string[], cwd: string): string {
  const pantheonPath = join(PANTHEON_ROOT, "src", "cli", "pantheon.ts");
  const result = spawnSync("npx", ["tsx", pantheonPath, ...args], { cwd, encoding: "utf-8", shell: true });
  if (result.error) die(`Pantheon failed: ${result.error.message}`);
  if (result.status !== 0) die(`Pantheon 'pantheon ${args.join(" ")}' failed:\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}

function selectCandidate(candidates: string[], worktree: string): string {
  for (const c of candidates) {
    if (existsSync(join(worktree, c))) return c;
  }
  die(`Could not find any candidate file. Looked for: ${candidates.join(", ")}`);
}

function main() {
  log("Starting P25d Saleor Synthetic PR Check");

  // 1. Verify Saleor repo exists
  if (!existsSync(SALEOR_REPO)) {
    die(`Saleor repository not found at ${SALEOR_REPO}`);
  }
  if (!existsSync(join(SALEOR_REPO, ".git"))) {
    die(`Saleor directory is not a git repository: ${SALEOR_REPO}`);
  }

  // 2. Ensure source is somewhat clean (or just use HEAD directly, worktree add HEAD handles it)
  // We'll trust the user that HEAD is what they want.
  
  // 3. Prepare artifact directory and remove old worktree
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  if (existsSync(WORKTREE_DIR)) {
    log("Removing old worktree...");
    // Force remove worktree from git and then rm dir
    spawnSync("git", ["worktree", "remove", "--force", WORKTREE_DIR], { cwd: SALEOR_REPO });
    if (existsSync(WORKTREE_DIR)) {
      rmSync(WORKTREE_DIR, { recursive: true, force: true });
    }
  }

  // 4. Create worktree
  log(`Creating git worktree at ${WORKTREE_DIR}`);
  runGit(["worktree", "add", WORKTREE_DIR, "HEAD"], SALEOR_REPO);

  try {
    // 5. Run pantheon guard inside worktree
    log("Running pantheon guard...");
    const guardArgs = [
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
      "--forbid", "**/migrations/**"
    ];
    runPantheon(guardArgs, WORKTREE_DIR);

    // 6. Select files
    const allowedFile = selectCandidate(ALLOWED_CANDIDATES, WORKTREE_DIR);
    const reviewFile = selectCandidate(REVIEW_CANDIDATES, WORKTREE_DIR);
    const forbiddenFile = selectCandidate(FORBIDDEN_CANDIDATES, WORKTREE_DIR);

    log(`Selected allowed file: ${allowedFile}`);
    log(`Selected review-required file: ${reviewFile}`);
    log(`Selected forbidden file: ${forbiddenFile}`);

    // 7. Append synthetic marker comments
    appendFileSync(join(WORKTREE_DIR, allowedFile), MARKER);
    appendFileSync(join(WORKTREE_DIR, reviewFile), MARKER);
    appendFileSync(join(WORKTREE_DIR, forbiddenFile), MARKER);
    log("Modified files with synthetic markers");

    // 8. Save git diff
    log("Generating diff artifacts...");
    const diffPatch = runGit(["diff"], WORKTREE_DIR);
    const diffNameStatus = runGit(["diff", "--name-status"], WORKTREE_DIR);
    
    // We can save to ARTIFACT_DIR now
    writeFileSync(join(ARTIFACT_DIR, "diff.patch"), diffPatch);
    writeFileSync(join(ARTIFACT_DIR, "diff_name_status.txt"), diffNameStatus);

    // 9. Run pantheon check
    log("Running pantheon check...");
    // Check might fail (non-zero exit) because there is a blocking finding.
    // We must handle non-zero exit code ourselves instead of using runPantheon which dies on status !== 0.
    const pantheonPath = join(PANTHEON_ROOT, "src", "cli", "pantheon.ts");
    const checkResult = spawnSync("npx", ["tsx", pantheonPath, "check"], { cwd: WORKTREE_DIR, encoding: "utf-8", shell: true });
    log("Check completed (status: " + checkResult.status + ")");

    // 10. Copy .pantheon artifacts
    log("Copying .pantheon artifacts...");
    const targetPantheonDir = join(ARTIFACT_DIR, ".pantheon");
    if (existsSync(targetPantheonDir)) {
      rmSync(targetPantheonDir, { recursive: true, force: true });
    }
    cpSync(join(WORKTREE_DIR, ".pantheon"), targetPantheonDir, { recursive: true });

    // 11. Validate artifacts
    log("Validating check results...");
    const checkJsonStr = readFileSync(join(targetPantheonDir, "check.json"), "utf-8");
    const checkJson = JSON.parse(checkJsonStr);
    
    const reportMd = readFileSync(join(targetPantheonDir, "report.md"), "utf-8");
    const feedbackMd = readFileSync(join(targetPantheonDir, "feedback.md"), "utf-8");

    // Assert verdict
    if (checkJson.verdict !== "fail" && checkJson.verdict !== "requires_reverse_issue") {
      die(`Expected verdict to be blocking (fail or requires_reverse_issue), but got: ${checkJson.verdict}`);
    }
    log(`✅ Verdict is blocking: ${checkJson.verdict}`);

    // Assert findings
    let allowedFoundInViolation = false;
    let reviewFound = false;
    let forbiddenFound = false;

    for (const f of checkJson.findings) {
      if (f.file === allowedFile) allowedFoundInViolation = true;
      if (f.file === reviewFile && f.severity === "review_required") reviewFound = true;
      if (f.file === forbiddenFile && (f.severity === "blocking" || f.severity === "reverse_issue_required" || f.severity === "revert_required")) {
        forbiddenFound = true;
      }
    }

    if (allowedFoundInViolation) die(`Allowed file ${allowedFile} was incorrectly flagged in findings`);
    log(`✅ Allowed file correctly omitted from violations`);

    if (!reviewFound) die(`Review-required file ${reviewFile} was not flagged as review_required`);
    log(`✅ Review-required file correctly flagged`);

    if (!forbiddenFound) die(`Forbidden file ${forbiddenFile} was not flagged as blocking`);
    log(`✅ Forbidden file correctly flagged as blocking`);

    // Check report/feedback contents
    if (!reportMd.includes(forbiddenFile)) die("report.md missing forbidden file");
    if (!feedbackMd.includes(forbiddenFile)) die("feedback.md missing forbidden file");
    
    const hasRevert = feedbackMd.includes("revert_file") || feedbackMd.includes("Revert this file");
    const hasReverse = feedbackMd.includes("request_scope_expansion") || feedbackMd.includes("request_reverse_issue") || feedbackMd.includes("Request scope expansion");
    
    if (!hasRevert && !hasReverse) {
      die("feedback.md missing expected action keywords (revert or request expansion)");
    }
    log(`✅ Markdown artifacts contain expected paths and actions`);

    writeFileSync(join(ARTIFACT_DIR, "p25d_result_summary.json"), JSON.stringify({
      status: "success",
      verdict: checkJson.verdict,
      files: { allowedFile, reviewFile, forbiddenFile }
    }, null, 2));

    log("🎉 P25d validation complete.");
  } finally {
    // 12. Remove worktree
    log("Cleaning up worktree...");
    const cleanupResult = spawnSync("git", ["worktree", "remove", "--force", WORKTREE_DIR], { cwd: SALEOR_REPO });
    if (cleanupResult.status === 0) {
      log("✅ Worktree cleanup succeeded");
    } else {
      console.error(`⚠️ Worktree cleanup failed: ${cleanupResult.stderr}`);
    }
  }
}

main();
