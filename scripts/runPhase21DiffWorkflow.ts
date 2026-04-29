/**
 * P21: Diff-to-ChangeContract Workflow CLI
 *
 * Usage:
 *
 *   Plan mode (before AI changes code):
 *     npx tsx scripts/runPhase21DiffWorkflow.ts --repo . --intent "..." --base HEAD --plan
 *
 *   Verify mode (after AI changes code):
 *     npx tsx scripts/runPhase21DiffWorkflow.ts --repo . --base HEAD --verify \
 *       --contract .pantheon/change_contract_lite.json \
 *       --scope .pantheon/agent_scope.json
 *
 *   Options:
 *     --changed src/a.ts,src/b.ts   Override changed files (bypass git)
 *     --cursor                       Write .cursor/rules/pantheon-change-boundary.md
 *     --out <dir>                    Output directory (default: <repo>/.pantheon)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { scanRepo } from "../src/repoObservation/repoScanner.js";
import { buildChangeContractLite } from "../src/changeContract/lite/changeContractLiteBuilder.js";
import { renderChangeContractLiteMarkdown } from "../src/changeContract/lite/changeContractLiteRenderer.js";
import { readGitDiffSummary, extractChangedFilePaths } from "../src/diffWorkflow/gitDiffReader.js";
import { buildAgentScopeLite, renderAgentScopeLiteMarkdown, renderCursorRuleFromScope } from "../src/diffWorkflow/agentScopeLiteBuilder.js";
import { verifyDiffAgainstScope } from "../src/diffWorkflow/diffVerifier.js";
import { renderReviewerReport } from "../src/diffWorkflow/reviewerReportRenderer.js";
import { loadRepoObservationConfig } from "../src/repoObservation/repoObservationConfigLoader.js";
import { buildAgentFeedbackFromDiffVerification } from "../src/agentFeedback/diffFeedbackBuilder.js";
import { validateAgentFeedback } from "../src/agentFeedback/agentFeedbackValidator.js";
import { renderAgentFeedbackMarkdown } from "../src/agentFeedback/agentFeedbackRenderer.js";
import type { ChangeContractLite } from "../src/changeContract/lite/types.js";
import type { AgentScopeLite } from "../src/diffWorkflow/types.js";

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

type CliArgs = {
  repo: string;
  mode: "plan" | "verify";
  intent?: string;
  baseRef: string;
  changed?: string[];
  cursor: boolean;
  outDir?: string;
  contractPath?: string;
  scopePath?: string;
};

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let repo = ".";
  let mode: "plan" | "verify" = "plan";
  let intent: string | undefined;
  let baseRef = "HEAD";
  let changed: string[] | undefined;
  let cursor = false;
  let outDir: string | undefined;
  let contractPath: string | undefined;
  let scopePath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--repo": repo = args[++i]; break;
      case "--plan": mode = "plan"; break;
      case "--verify": mode = "verify"; break;
      case "--intent": intent = args[++i]; break;
      case "--base": baseRef = args[++i]; break;
      case "--changed": changed = args[++i].split(",").map(s => s.trim()).filter(Boolean); break;
      case "--cursor": cursor = true; break;
      case "--out": outDir = args[++i]; break;
      case "--contract": contractPath = args[++i]; break;
      case "--scope": scopePath = args[++i]; break;
      default:
        if (args[i] === "--help" || args[i] === "-h") {
          console.log("Usage:");
          console.log("  Plan:   npx tsx scripts/runPhase21DiffWorkflow.ts --repo . --intent \"...\" --base HEAD --plan");
          console.log("  Verify: npx tsx scripts/runPhase21DiffWorkflow.ts --repo . --base HEAD --verify --contract .pantheon/change_contract_lite.json --scope .pantheon/agent_scope.json");
          console.log("");
          console.log("Options:");
          console.log("  --changed src/a.ts,src/b.ts   Override changed files");
          console.log("  --cursor                       Write .cursor/rules/ Cursor rule");
          console.log("  --out <dir>                    Output directory (default: <repo>/.pantheon)");
          process.exit(0);
        }
    }
  }

  return { repo: resolve(repo), mode, intent, baseRef, changed, cursor, outDir, contractPath, scopePath };
}

// ---------------------------------------------------------------------------
// Plan mode
// ---------------------------------------------------------------------------

function runPlan(args: CliArgs): void {
  const outDir = args.outDir ?? join(args.repo, ".pantheon");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  console.log("[P21] Mode: PLAN");
  console.log(`[P21] Repo: ${args.repo}`);
  console.log(`[P21] Base: ${args.baseRef}`);
  if (args.intent) console.log(`[P21] Intent: ${args.intent}`);

  // Step 1: Read diff
  console.log("[P21] Step 1/6: Reading changed files...");
  const diff = readGitDiffSummary({
    repoRoot: args.repo,
    baseRef: args.baseRef,
    changedFilesOverride: args.changed,
  });
  const changedFiles = extractChangedFilePaths(diff);

  if (changedFiles.length === 0) {
    console.error("[P21] ERROR: No changed files found.");
    if (diff.warnings.length > 0) {
      for (const w of diff.warnings) console.warn(`[P21]   ${w}`);
    }
    console.error("[P21] Use --changed to specify files manually.");
    process.exit(1);
  }

  console.log(`[P21]   ${changedFiles.length} changed file(s)`);
  for (const w of diff.warnings) console.warn(`[P21]   WARNING: ${w}`);

  // Step 2: Scan repo
  console.log("[P21] Step 2/6: Scanning repo...");
  const configResult = loadRepoObservationConfig(args.repo);
  for (const w of configResult.warnings) console.warn(`[P21]   Config warning: ${w}`);

  const observations = scanRepo({
    repoRoot: args.repo,
    changedFiles,
    config: configResult.config ?? undefined,
  });

  console.log(`[P21]   ${observations.meta.file_count} files scanned`);

  // Step 3: Build ChangeContract Lite
  console.log("[P21] Step 3/6: Building ChangeContract Lite...");
  const contract = buildChangeContractLite({
    observations,
    changedFiles,
    intent: args.intent,
  });
  console.log(`[P21]   Verdict: ${contract.decision.verdict}`);

  // Step 4: Build AgentScopeLite
  console.log("[P21] Step 4/6: Building agent scope...");
  const scope = buildAgentScopeLite({ contract, observations });
  console.log(`[P21]   ${scope.allowed_files.length} allowed file(s)`);
  console.log(`[P21]   ${scope.review_required_files.length} review-required file(s)`);
  console.log(`[P21]   ${scope.required_tests.length} required test(s)`);

  // Step 5: Render reports
  console.log("[P21] Step 5/6: Rendering outputs...");
  const contractMd = renderChangeContractLiteMarkdown(contract);
  const scopeMd = renderAgentScopeLiteMarkdown(scope);
  const report = renderReviewerReport({
    intent: args.intent,
    diff,
    contract,
    scope,
    observations,
  });

  // Step 6: Write outputs
  console.log("[P21] Step 6/6: Writing outputs...");
  writeFileSync(join(outDir, "repo_observations.json"), JSON.stringify(observations, null, 2));
  writeFileSync(join(outDir, "change_contract_lite.json"), JSON.stringify(contract, null, 2));
  writeFileSync(join(outDir, "change_contract_lite.md"), contractMd);
  writeFileSync(join(outDir, "agent_scope.json"), JSON.stringify(scope, null, 2));
  writeFileSync(join(outDir, "agent_scope.md"), scopeMd);
  writeFileSync(join(outDir, "reviewer_report.md"), report);
  writeFileSync(join(outDir, "diff_workflow_plan.json"), JSON.stringify({
    schema_version: "diff_workflow_plan.v1",
    mode: "plan",
    generated_at: new Date().toISOString(),
    intent: args.intent,
    base_ref: args.baseRef,
    changed_files: changedFiles,
    contract_verdict: contract.decision.verdict,
    scope_id: scope.scope_id,
    outputs: {
      repo_observations: join(outDir, "repo_observations.json"),
      change_contract_lite: join(outDir, "change_contract_lite.json"),
      agent_scope: join(outDir, "agent_scope.json"),
      reviewer_report: join(outDir, "reviewer_report.md"),
    },
  }, null, 2));

  // Cursor rule (opt-in)
  if (args.cursor) {
    const cursorDir = join(args.repo, ".cursor", "rules");
    if (!existsSync(cursorDir)) mkdirSync(cursorDir, { recursive: true });
    const cursorRule = renderCursorRuleFromScope(scope);
    writeFileSync(join(cursorDir, "pantheon-change-boundary.md"), cursorRule);
    console.log(`[P21]   Cursor rule written to: ${cursorDir}/pantheon-change-boundary.md`);
  }

  console.log("");
  console.log("[P21] Plan complete ✓");
  console.log(`[P21] Outputs written to: ${outDir}`);
  console.log("[P21]   - repo_observations.json");
  console.log("[P21]   - change_contract_lite.json / .md");
  console.log("[P21]   - agent_scope.json / .md");
  console.log("[P21]   - reviewer_report.md");
  console.log("[P21]   - diff_workflow_plan.json");
  console.log("");
  console.log("[P21] Next: Give .pantheon/agent_scope.md to your AI agent, then run --verify.");
}

// ---------------------------------------------------------------------------
// Verify mode
// ---------------------------------------------------------------------------

function runVerify(args: CliArgs): void {
  const outDir = args.outDir ?? join(args.repo, ".pantheon");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  console.log("[P21] Mode: VERIFY");
  console.log(`[P21] Repo: ${args.repo}`);
  console.log(`[P21] Base: ${args.baseRef}`);

  // Step 1: Load contract
  const contractPath = args.contractPath ?? join(args.repo, ".pantheon", "change_contract_lite.json");
  if (!existsSync(contractPath)) {
    console.error(`[P21] ERROR: Contract file not found: ${contractPath}`);
    console.error("");
    console.error("[P21] Run plan mode first:");
    console.error(`  npx tsx scripts/runPhase21DiffWorkflow.ts --repo ${args.repo} --intent "..." --base ${args.baseRef} --plan`);
    process.exit(1);
  }

  let contract: ChangeContractLite;
  try {
    contract = JSON.parse(readFileSync(contractPath, "utf-8"));
  } catch {
    console.error(`[P21] ERROR: Invalid contract JSON: ${contractPath}`);
    console.error("[P21] Re-run plan mode to regenerate artifacts.");
    process.exit(1);
  }

  // Step 2: Load scope
  const scopePath = args.scopePath ?? join(args.repo, ".pantheon", "agent_scope.json");
  if (!existsSync(scopePath)) {
    console.error(`[P21] ERROR: Scope file not found: ${scopePath}`);
    console.error("");
    console.error("[P21] Run plan mode first or provide --scope.");
    process.exit(1);
  }

  let scope: AgentScopeLite;
  try {
    scope = JSON.parse(readFileSync(scopePath, "utf-8"));
  } catch {
    console.error(`[P21] ERROR: Invalid scope JSON: ${scopePath}`);
    console.error("[P21] Re-run plan mode to regenerate artifacts.");
    process.exit(1);
  }

  console.log(`[P21] Contract: ${contract.contract_id}`);
  console.log(`[P21] Scope: ${scope.scope_id}`);

  // Step 3: Read actual diff
  console.log("[P21] Reading actual diff...");
  const actualDiff = readGitDiffSummary({
    repoRoot: args.repo,
    baseRef: args.baseRef,
    changedFilesOverride: args.changed,
  });
  const actualFiles = extractChangedFilePaths(actualDiff);
  console.log(`[P21]   ${actualFiles.length} actual changed file(s)`);
  for (const w of actualDiff.warnings) console.warn(`[P21]   WARNING: ${w}`);

  // Step 4: Verify
  console.log("[P21] Verifying diff against scope...");
  const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
  console.log(`[P21]   Verdict: ${verification.verdict}`);

  for (const r of verification.reasons) {
    console.log(`[P21]   - ${r}`);
  }

  // Step 5: Scan repo for report context
  console.log("[P21] Scanning repo for report context...");
  const configResult = loadRepoObservationConfig(args.repo);
  const observations = scanRepo({
    repoRoot: args.repo,
    changedFiles: actualFiles,
    config: configResult.config ?? undefined,
  });

  // Step 6: Render reviewer report
  const report = renderReviewerReport({
    intent: contract.intent,
    diff: actualDiff,
    contract,
    scope,
    verification,
    observations,
  });

  // Write outputs
  writeFileSync(join(outDir, "diff_verification_result.json"), JSON.stringify(verification, null, 2));
  writeFileSync(join(outDir, "reviewer_report.md"), report);

  // P22: Generate agent feedback
  console.log("[P22] Generating agent feedback...");
  const agentFeedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
  const feedbackValidation = validateAgentFeedback(agentFeedback);
  if (feedbackValidation.status !== "valid") {
    console.warn("[P22] WARNING: Agent feedback validation issues:");
    for (const e of feedbackValidation.errors) console.warn(`[P22]   ${e}`);
  }

  writeFileSync(join(outDir, "agent_feedback.json"), JSON.stringify(agentFeedback, null, 2));
  writeFileSync(join(outDir, "agent_feedback.md"), renderAgentFeedbackMarkdown(agentFeedback));

  console.log("");
  console.log("[P21] Verification complete ✓");
  console.log(`[P21] Outputs written to: ${outDir}`);
  console.log("[P21]   - diff_verification_result.json");
  console.log("[P21]   - reviewer_report.md");
  console.log("[P22]   - agent_feedback.json");
  console.log("[P22]   - agent_feedback.md");

  if (verification.verdict !== "pass") {
    console.log("");
    console.log("[P21] Required actions:");
    for (const a of verification.required_actions) {
      console.log(`[P21]   - ${a}`);
    }
    console.log("");
    console.log(`[P22] Agent retry guidance: ${agentFeedback.retry_guidance.retry_mode}`);
    console.log(`[P22] Human review required: ${agentFeedback.human_review_required}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs();

  if (args.mode === "plan") {
    runPlan(args);
  } else {
    runVerify(args);
  }
}

main();
