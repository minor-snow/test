/**
 * P20a CLI: runPhase20aRepoObservations
 *
 * Usage:
 *   npx tsx scripts/runPhase20aRepoObservations.ts \
 *     --repo . \
 *     --intent "Add retry logic to sync worker" \
 *     --changed src/sync/worker.ts,src/sync/queue.ts
 *
 *   npx tsx scripts/runPhase20aRepoObservations.ts \
 *     --repo . \
 *     --diff                          # infer changed files from git diff HEAD
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { scanRepo } from "../src/repoObservation/repoScanner.js";
import { validateRepoObservations } from "../src/repoObservation/repoObservationValidator.js";
import { buildChangeContractLite } from "../src/changeContract/lite/changeContractLiteBuilder.js";
import { validateChangeContractLite } from "../src/changeContract/lite/changeContractLiteValidator.js";
import { renderChangeContractLiteMarkdown } from "../src/changeContract/lite/changeContractLiteRenderer.js";
import { renderBootstrapReport } from "../src/repoObservation/bootstrapReportRenderer.js";
import { loadRepoObservationConfig } from "../src/repoObservation/repoObservationConfigLoader.js";
import { generateObservationRecommendations } from "../src/repoObservation/observationQuality.js";

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

function parseArgs(): { repo: string; intent?: string; changed: string[] } {
  const args = process.argv.slice(2);
  let repo = ".";
  let intent: string | undefined;
  let changed: string[] = [];
  let useDiff = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--repo":
        repo = args[++i];
        break;
      case "--intent":
        intent = args[++i];
        break;
      case "--changed":
        changed = args[++i].split(",").map(s => s.trim()).filter(Boolean);
        break;
      case "--diff":
        useDiff = true;
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  const resolvedRepo = resolve(repo);

  if (useDiff && changed.length > 0) {
    console.error("Error: --diff and --changed are mutually exclusive.");
    process.exit(1);
  }

  if (useDiff) {
    changed = inferChangedFilesFromGit(resolvedRepo);
    if (changed.length === 0) {
      console.error("Error: --diff found no changed files. Ensure you have uncommitted or staged changes.");
      process.exit(1);
    }
    console.log(`[P20a] Inferred ${changed.length} changed file(s) from git diff.`);
  }

  if (changed.length === 0) {
    console.error("Error: --changed or --diff is required. Specify changed files or use --diff to infer from git.");
    process.exit(1);
  }

  return { repo: resolvedRepo, intent, changed };
}

function inferChangedFilesFromGit(repoRoot: string): string[] {
  try {
    // Staged + unstaged changes relative to HEAD
    const output = execSync("git diff HEAD --name-only", { cwd: repoRoot, encoding: "utf-8" }).trim();
    if (!output) {
      // Also check for untracked files
      const untracked = execSync("git ls-files --others --exclude-standard", { cwd: repoRoot, encoding: "utf-8" }).trim();
      if (untracked) {
        return untracked.split("\n").map(s => s.trim()).filter(Boolean);
      }
      return [];
    }
    return output.split("\n").map(s => s.trim()).filter(Boolean);
  } catch (e) {
    console.error("Error: --diff requires a git repository. Could not run git diff.");
    console.error(`  ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const { repo, intent, changed } = parseArgs();

  console.log(`[P20a] Scanning repo: ${repo}`);
  console.log(`[P20a] Changed files: ${changed.join(", ")}`);
  if (intent) console.log(`[P20a] Intent: ${intent}`);

  // Step 1: Load config
  console.log("[P20a] Step 1/8: Loading pantheon.json config...");
  const configResult = loadRepoObservationConfig(repo);
  if (configResult.loaded_from) {
    console.log(`[P20a]   Config loaded from: ${configResult.loaded_from}`);
    if (configResult.config.excluded_dirs) console.log(`[P20a]   excluded_dirs: ${configResult.config.excluded_dirs.join(", ")}`);
    if (configResult.config.path_roles) console.log(`[P20a]   path_roles: ${Object.keys(configResult.config.path_roles).join(", ")}`);
    if (configResult.config.test_mapping_overrides) console.log(`[P20a]   test_mapping_overrides: ${Object.keys(configResult.config.test_mapping_overrides).join(", ")}`);
  } else {
    console.log("[P20a]   No pantheon.json found (using defaults)");
  }
  for (const w of configResult.warnings) {
    console.warn(`[P20a]   WARNING: ${w}`);
  }

  // Step 2: Scan
  console.log("[P20a] Step 2/8: Scanning repo...");
  const observations = scanRepo({ repoRoot: repo, config: configResult.config });
  console.log(`[P20a]   Files: ${observations.meta.file_count}, Unknowns: ${observations.meta.unknown_count}, Excluded: ${observations.meta.excluded_count}`);

  // Step 3: Validate observations
  console.log("[P20a] Step 3/8: Validating observations...");
  const obsValidation = validateRepoObservations(observations);
  if (obsValidation.status !== "valid") {
    console.error("[P20a] Observation validation FAILED:");
    for (const e of obsValidation.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("[P20a]   Observations valid ✓");

  // Step 4: Build ChangeContract Lite
  console.log("[P20a] Step 4/8: Building ChangeContract Lite...");
  const contract = buildChangeContractLite({ observations, changedFiles: changed, intent });
  console.log(`[P20a]   Verdict: ${contract.decision.verdict}`);

  // Step 5: Validate Lite contract
  console.log("[P20a] Step 5/8: Validating ChangeContract Lite...");
  const liteValidation = validateChangeContractLite(contract);
  if (liteValidation.status !== "valid") {
    console.error("[P20a] Lite contract validation FAILED:");
    for (const e of liteValidation.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("[P20a]   Contract valid ✓");

  // Step 6: Render markdown
  console.log("[P20a] Step 6/8: Rendering ChangeContract Lite markdown...");
  const contractMd = renderChangeContractLiteMarkdown(contract);

  // Step 7: Render bootstrap report
  console.log("[P20a] Step 7/8: Rendering bootstrap report...");
  const report = renderBootstrapReport({ observations, contract });

  // Step 8: Write outputs
  console.log("[P20a] Step 8/8: Writing outputs...");
  const outDir = join(repo, ".pantheon");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, "repo_observations.json"), JSON.stringify(observations, null, 2));
  writeFileSync(join(outDir, "change_contract_lite.json"), JSON.stringify(contract, null, 2));
  writeFileSync(join(outDir, "change_contract_lite.md"), contractMd);
  writeFileSync(join(outDir, "bootstrap_report.md"), report);

  console.log("[P20a] Done ✓");
  console.log(`[P20a] Outputs written to: ${outDir}`);
  console.log(`[P20a]   - repo_observations.json`);
  console.log(`[P20a]   - change_contract_lite.json`);
  console.log(`[P20a]   - change_contract_lite.md`);
  console.log(`[P20a]   - bootstrap_report.md`);

  // Quality summary
  const q = observations.quality;
  console.log("");
  console.log("[P20a] Observation Quality:");
  console.log(`[P20a]   Raw unknown ratio: ${(q.raw_unknown_ratio * 100).toFixed(1)}%`);
  console.log(`[P20a]   Actionable: ${q.actionable_count} (${(q.actionable_ratio * 100).toFixed(1)}%)`);
  console.log(`[P20a]   Out-of-scope: ${q.out_of_scope_count}`);
  console.log(`[P20a]   Intrinsic: ${q.intrinsic_count}`);
  console.log(`[P20a]   Unknown bucket files: ${q.unknown_bucket_file_count}`);
  console.log(`[P20a]   Undeclared packages: ${q.undeclared_package_count}`);

  const recs = generateObservationRecommendations({ quality: q });
  if (recs.length > 0) {
    console.log("");
    console.log(`[P20a] Recommended actions (${recs.length}):`);
    for (let i = 0; i < recs.length; i++) {
      console.log(`[P20a]   ${i + 1}. ${recs[i]}`);
    }
  }
}

main();
