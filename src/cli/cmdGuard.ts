/**
 * P24: pantheon guard "<intent>" --scope <path-or-glob>
 *
 * Scans the repo, builds contract + scope from user-specified authorized paths,
 * writes task.md / scope.md / check.json.
 *
 * --scope is REQUIRED in v1. Pantheon does not auto-infer scope from intent.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { globToRegex } from "../globMatch.js";
import { scanRepo } from "../repoObservation/repoScanner.js";
import { loadRepoObservationConfig } from "../repoObservation/repoObservationConfigLoader.js";
import { buildChangeContractLite } from "../changeContract/lite/changeContractLiteBuilder.js";
import { buildAgentScopeLite } from "../diffWorkflow/agentScopeLiteBuilder.js";
import { ensurePantheonDirs, publicPaths, internalPaths } from "./artifactLayout.js";
import { loadPantheonConfig } from "./pantheonConfig.js";
import { buildPublicGuardBaseline } from "./publicCheckProjection.js";
import { renderPublicTaskMarkdown, renderPublicScopeMarkdown } from "./markdownRenderers.js";
import type { PantheonRepoInfo } from "./types.js";
import type { FileBucket } from "../repoObservation/types.js";
import { hasPythonSignals } from "../repoObservation/python/pythonEcosystemPatterns.js";
import { enhanceWithPythonObservations } from "../repoObservation/python/pythonObservationEnhancer.js";
import type { PythonObservationConfig, PythonObservationSidecar } from "../repoObservation/python/types.js";
import {
  renderPythonGovernanceReport,
  computePythonTaskEnhancement,
  renderPythonTaskSensitiveWarnings,
  renderPythonTaskTestSuggestions,
  renderPythonScopeSections,
} from "../repoObservation/python/pythonGovernanceRenderer.js";

export function cmdGuard(input: {
  repoRoot: string;
  intent: string;
  scopePatterns: string[];
  reviewPatterns?: string[];
  forbiddenPatterns?: string[];
  configPath?: string;
}): void {
  const repoRoot = resolve(input.repoRoot);
  const reviewPatterns = input.reviewPatterns ?? [];
  const forbiddenPatterns = input.forbiddenPatterns ?? [];

  // --scope is required
  if (input.scopePatterns.length === 0) {
    console.error("Error: --scope is required.");
    console.error("");
    console.error("Pantheon needs an authorized scope before the agent edits code.");
    console.error("");
    console.error("Try:");
    console.error('  pantheon guard "Fix sync bug" --scope src/sync/** --scope tests/sync/**');
    console.error('  pantheon guard "Add mutation" --scope saleor/checkout/actions.py --scope saleor/graphql/checkout/schema.py');
    process.exit(1);
  }

  console.log("Pantheon Guard\n");

  // 1. Load configs
  const pantheonConfig = loadPantheonConfig(repoRoot, input.configPath ?? "pantheon.json");
  if (pantheonConfig.warnings.length > 0) {
    for (const w of pantheonConfig.warnings) console.log("  Warning:", w);
  }
  const repoObsConfig = loadRepoObservationConfig(repoRoot);
  const pantheonPathRoles = Object.entries(pantheonConfig.config.path_roles).reduce<Record<string, FileBucket>>(
    (acc, [pattern, bucket]) => {
      if (isFileBucket(bucket)) {
        acc[pattern] = bucket;
      }
      return acc;
    },
    {},
  );

  // 2. Scan repo
  const observations = scanRepo({
    repoRoot,
    config: {
      ...repoObsConfig.config,
      path_roles: {
        ...(repoObsConfig.config.path_roles ?? {}),
        ...pantheonPathRoles,
      },
    },
  });
  console.log(`  Scanned ${observations.meta.file_count} files`);

  // 3. Resolve scope patterns → concrete file list
  const observedPaths = observations.observations.files.map(f => f.path);
  const resolvedScopeFiles = resolveScope(input.scopePatterns, observedPaths);
  const resolvedReviewFiles = resolveScope(
    [...pantheonConfig.config.review_required, ...reviewPatterns],
    observedPaths,
  );

  if (resolvedScopeFiles.length === 0) {
    console.log("");
    console.log("  Warning: no files matched the scope patterns:");
    for (const p of input.scopePatterns) console.log(`    ${p}`);
    console.log("");
    console.log("  Tip: check file paths in the repo and try again.");
    return;
  }

  const authorizedFiles = uniqueSorted([...resolvedScopeFiles, ...resolvedReviewFiles]);

  console.log(`  Scope: ${resolvedScopeFiles.length} allowed files matched`);
  if (resolvedReviewFiles.length > 0) {
    console.log(`  Review-required: ${resolvedReviewFiles.length} files matched`);
  }

  // 4. Build contract
  const contract = buildChangeContractLite({ observations, changedFiles: authorizedFiles, intent: input.intent });

  // 5. Build scope
  const baseScope = buildAgentScopeLite({ contract, observations });
  const explicitReviewSet = new Set(resolvedReviewFiles);

  // Add pantheon.json protected patterns and explicit forbidden patterns.
  const existingForbidden = new Set(baseScope.forbidden_patterns.map(p => p.pattern));
  const additionalForbidden = [
    ...pantheonConfig.config.protected.map(pattern => ({
      pattern,
      reason: "Protected by pantheon.json",
    })),
    ...forbiddenPatterns.map(pattern => ({
      pattern,
      reason: "Forbidden by explicit boundary proposal.",
    })),
  ].filter(({ pattern }) => {
    if (existingForbidden.has(pattern)) return false;
    existingForbidden.add(pattern);
    return true;
  });
  const forbiddenPatternSet = additionalForbidden.length > 0
    ? [...baseScope.forbidden_patterns, ...additionalForbidden]
    : [...baseScope.forbidden_patterns];
  const allowedFiles = baseScope.allowed_files.filter(path =>
    !explicitReviewSet.has(path) && !matchesForbiddenPattern(path, forbiddenPatternSet),
  );
  const mergedReviewFiles = mergeReviewRequiredFiles(
    baseScope.review_required_files,
    explicitReviewSet,
    "Explicit review-required boundary.",
  ).filter(file => !matchesForbiddenPattern(file.path, forbiddenPatternSet));
  const scope = {
    ...baseScope,
    allowed_files: allowedFiles,
    review_required_files: mergedReviewFiles,
    forbidden_patterns: forbiddenPatternSet,
  };
  const effectiveScopeFiles = uniqueSorted([
    ...scope.allowed_files,
    ...scope.review_required_files.map(file => file.path),
  ]);

  // 6. Write artifacts
  ensurePantheonDirs(repoRoot);
  const pub = publicPaths(repoRoot);
  const int = internalPaths(repoRoot);

  const repoInfo: PantheonRepoInfo = {
    label: observations.repo.repo_root_label,
    head_commit: observations.repo.head_commit_hash,
    state: observations.repo.repo_state,
  };

  // Python sidecar: auto-generate if repo has Python signals
  let pythonObs: PythonObservationSidecar | null = null;
  const allObservedPaths = observations.observations.files.map(f => f.path);
  if (hasPythonSignals(allObservedPaths)) {
    const pyConfig: PythonObservationConfig | undefined = pantheonConfig.config.python
      ? {
          project_packages: pantheonConfig.config.python.project_packages,
          sensitive_overrides: pantheonConfig.config.python.sensitive_overrides,
        }
      : undefined;
    pythonObs = enhanceWithPythonObservations(observations, repoRoot, pyConfig);
    writeFileSync(
      int.dir + "/python_observations.json",
      JSON.stringify(pythonObs, null, 2),
    );
    console.log(`  Python observations: ${pythonObs.quality.python_file_count} files, ${pythonObs.quality.sensitive_zone_count} sensitive zones`);
  }

  // Build Python enhancement sections (empty strings if no Python)
  let pythonTaskWarnings = "";
  let pythonTaskTests = "";
  let pythonScopeSections = "";
  if (pythonObs) {
    const enhancement = computePythonTaskEnhancement({
      sidecar: pythonObs,
      scopeFiles: effectiveScopeFiles,
    });
    pythonTaskWarnings = renderPythonTaskSensitiveWarnings(enhancement);
    pythonTaskTests = renderPythonTaskTestSuggestions(enhancement);
    pythonScopeSections = renderPythonScopeSections({
      sidecar: pythonObs,
      scopeFiles: effectiveScopeFiles,
    });
  }

  // Public (user-facing renderers)
  const taskMd = renderPublicTaskMarkdown({
    intent: input.intent,
    allowedFiles: scope.allowed_files,
    requiredTests: scope.required_tests,
    forbiddenPatterns: scope.forbidden_patterns,
    reviewRequiredFiles: scope.review_required_files.map(f => f.path),
    sensitiveWarnings: pythonTaskWarnings || undefined,
    suggestedTests: pythonTaskTests || undefined,
  });
  writeFileSync(pub.task, taskMd);

  const scopeMd = renderPublicScopeMarkdown({
    intent: input.intent,
    allowedFiles: scope.allowed_files,
    requiredTests: scope.required_tests,
    forbiddenPatterns: scope.forbidden_patterns,
    reviewRequiredFiles: scope.review_required_files.map(f => f.path),
    repoLabel: repoInfo.label,
    headCommit: repoInfo.head_commit,
  });
  writeFileSync(pub.scope, pythonScopeSections
    ? scopeMd + "\n" + pythonScopeSections
    : scopeMd
  );

  const guardBaseline = buildPublicGuardBaseline({
    intent: input.intent,
    allowedCount: scope.allowed_files.length,
    reviewRequiredCount: scope.review_required_files.length,
    forbiddenCount: scope.forbidden_patterns.length,
    repo: repoInfo,
  });
  writeFileSync(pub.check, JSON.stringify(guardBaseline, null, 2));

  // Python governance report
  if (pythonObs) {
    const pyReport = renderPythonGovernanceReport({
      sidecar: pythonObs,
      intent: input.intent,
      scopeFiles: effectiveScopeFiles,
      repoLabel: repoInfo.label,
    });
    writeFileSync(pub.dir + "/python_report.md", pyReport);
  }

  // Internal
  writeFileSync(int.contract, JSON.stringify(contract, null, 2));
  writeFileSync(int.scope, JSON.stringify(scope, null, 2));
  writeFileSync(int.observations, JSON.stringify(observations, null, 2));

  // 7. Print summary
  console.log("");
  console.log("  Intent:");
  console.log(`    ${input.intent}`);
  console.log("");
  console.log(`  Allowed files: ${scope.allowed_files.length}`);
  if (scope.review_required_files.length > 0) {
    console.log(`  Review required: ${scope.review_required_files.length}`);
  }
  console.log(`  Forbidden patterns: ${scope.forbidden_patterns.length}`);
  console.log("");
  console.log("  Artifacts:");
  console.log("    .pantheon/task.md           ← give this to your AI agent");
  console.log("    .pantheon/scope.md          ← human-readable scope");
  console.log("    .pantheon/check.json        ← machine-readable baseline");
  if (pythonObs) {
    console.log("    .pantheon/python_report.md  ← Python governance signals");
  }
  console.log("");
  console.log("Next: after the agent edits code, run: pantheon check");
}

// ---------------------------------------------------------------------------
// Scope pattern resolver
// ---------------------------------------------------------------------------

/**
 * Resolve scope patterns (file paths or globs) against observed file list.
 * Supports:
 *   - Exact file paths: "src/a.ts"
 *   - Directory prefix globs: "src/sync/**"
 *   - Simple globs: "*.py"
 */
function resolveScope(patterns: string[], observedPaths: string[]): string[] {
  const result = new Set<string>();

  for (const pattern of patterns) {
    if (pattern.includes("*")) {
      // Glob match
      const regex = globToRegex(pattern);
      for (const path of observedPaths) {
        if (regex.test(path)) result.add(path);
      }
    } else {
      // Exact match or directory prefix
      for (const path of observedPaths) {
        if (path === pattern || path.startsWith(pattern + "/")) {
          result.add(path);
        }
      }
    }
  }

  return [...result].sort();
}

function uniqueSorted(paths: string[]): string[] {
  return [...new Set(paths)].sort();
}

function mergeReviewRequiredFiles(
  existing: readonly { readonly path: string; readonly reasons: readonly string[] }[],
  explicitReviewSet: ReadonlySet<string>,
  explicitReason: string,
): Array<{ path: string; reasons: string[] }> {
  const merged = new Map<string, string[]>();

  for (const file of existing) {
    merged.set(file.path, [...file.reasons]);
  }

  for (const path of explicitReviewSet) {
    const reasons = merged.get(path) ?? [];
    if (!reasons.includes(explicitReason)) reasons.push(explicitReason);
    merged.set(path, reasons);
  }

  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, reasons]) => ({ path, reasons }));
}

function matchesForbiddenPattern(
  path: string,
  patterns: readonly { readonly pattern: string; readonly reason: string }[],
): boolean {
  return patterns.some(pattern => globToRegex(pattern.pattern).test(path));
}

function isFileBucket(value: string): value is FileBucket {
  return [
    "src",
    "test",
    "config",
    "generated",
    "docs",
    "script",
    "asset",
    "unknown",
  ].includes(value);
}
