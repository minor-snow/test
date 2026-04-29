/**
 * P20a.2: Repo Scanner Orchestrator
 *
 * Enumerates files, applies limits/exclusions, calls all sub-modules,
 * classifies package imports via manifests, computes quality metrics,
 * collects git status, computes observation hash.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";
import type {
  RepoObservations, ObservedFile, PathBucket, ExcludedPath,
  RepoObservationRepoMeta, RepoScannerMeta, RepoScanLimits,
  RepoUnknowns, FileBucket, ConfigHint, ConfigDetectedField,
  RepoObservationConfig, Evidence, PackageManifestObservation,
  ImportEdge,
} from "./types.js";
import { DEFAULT_SCAN_LIMITS } from "./types.js";
import { normalizeRepoRelativePath } from "./pathUtils.js";
import { classifyFile, detectLanguage } from "./fileClassifier.js";
import { extractImportsFromFile } from "./importExtractor.js";
import { inferTestMappings } from "./testMapper.js";
import { detectSensitivePaths } from "./sensitivePathDetector.js";
import { parseCodeowners } from "./codeownersParser.js";
import { computeObservationHash } from "./observationHasher.js";
import { classifyPackageImport } from "./packageDependencyClassifier.js";
import { computeObservationQuality } from "./observationQuality.js";

const SCANNER_VERSION = "0.2.0";
const ANALYZABLE_LANGUAGES = new Set(["typescript", "javascript"]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function scanRepo(input: {
  repoRoot: string;
  config?: RepoObservationConfig;
}): RepoObservations {
  const limits = resolveLimits(input.config?.limits);
  // Merge config excluded_dirs with default
  const configExcludedDirs = input.config?.excluded_dirs ?? [];
  const allExcludedDirs = [...limits.excluded_dirs, ...configExcludedDirs];
  const excludedDirSet = new Set(allExcludedDirs.map(d => d.toLowerCase()));

  // Config path roles (exact prefix match)
  const pathRoles = input.config?.path_roles ?? {};

  // 1. Enumerate files
  const { observedFiles, excludedPaths } = enumerateFiles(input.repoRoot, input.repoRoot, excludedDirSet, limits);

  // 2. Classify + detect language (with config path_roles override)
  const files: ObservedFile[] = observedFiles.map(f => classifyObservedFile(f, limits, pathRoles));

  // 3. Extract package manifests
  const packageManifests = collectPackageManifests(input.repoRoot, files);

  // 4. Extract imports from analyzable files
  const rawImportEdges: ImportEdge[] = [];
  const dynamicImports: string[] = [];

  for (const file of files) {
    if (file.analysis_status !== "analyzed" || !ANALYZABLE_LANGUAGES.has(file.language)) continue;

    try {
      const content = readFileSync(join(input.repoRoot, file.path), "utf-8");
      const extracted = extractImportsFromFile({ path: file.path, content });
      rawImportEdges.push(...extracted.import_edges);
      dynamicImports.push(...extracted.unknowns.dynamic_imports);
    } catch {
      // File read error — skip silently, still recorded in files
    }
  }

  // 5. Reclassify import edges through package dependency classifier
  const allImportEdges = reclassifyImportEdges(rawImportEdges, packageManifests);

  // Compute unresolved imports after reclassification
  const unresolvedImports = allImportEdges
    .filter(e => e.resolution_status === "unresolved_package" || e.resolution_status === "unresolved_alias")
    .map(e => `${e.from_file}:${e.raw_specifier}`);

  // 6. Test mappings (with config overrides)
  const testMappingOverrides = input.config?.test_mapping_overrides ?? {};
  const testResult = inferTestMappings({ files, overrides: testMappingOverrides });

  // 7. Sensitive paths
  const sensitivePaths = detectSensitivePaths(files);

  // 8. CODEOWNERS
  const codeownersResult = parseCodeowners(input.repoRoot);

  // 9. Config hints
  const configHints = collectConfigHints(input.repoRoot, files);

  // 10. Path buckets
  const pathBuckets = buildPathBuckets(files);

  // 11. Git status
  const repoMeta = detectGitStatus(input.repoRoot);

  // 12. Build unknowns
  const unknowns: RepoUnknowns = {
    skipped_large_files: files.filter(f => f.analysis_status === "skipped_large_file").map(f => f.path),
    unsupported_files: files.filter(f => f.analysis_status === "unsupported_language").map(f => f.path),
    dynamic_imports: dynamicImports,
    unresolved_imports: unresolvedImports,
    unmapped_sources: testResult.unmapped_sources,
    unmapped_tests: testResult.unmapped_tests,
    ambiguous_test_mappings: testResult.ambiguous_test_mappings,
    scan_limit_exceeded: excludedPaths
      .filter(e => e.reason === "max_file_limit" || e.reason === "scanner_timeout")
      .map(e => e.path),
    owner_patterns_unresolved: codeownersResult.unresolved_patterns,
    changed_files_not_observed: [],
  };

  const unknownCount =
    unknowns.skipped_large_files.length + unknowns.unsupported_files.length +
    unknowns.dynamic_imports.length + unknowns.unresolved_imports.length +
    unknowns.unmapped_sources.length + unknowns.unmapped_tests.length +
    unknowns.ambiguous_test_mappings.length + unknowns.scan_limit_exceeded.length +
    unknowns.owner_patterns_unresolved.length;

  const partialScan = excludedPaths.some(e => e.reason === "max_file_limit" || e.reason === "scanner_timeout");

  // 13. Build observations (without hash and quality)
  const preQualityObs = {
    schema_version: "repo_observations.v1" as const,
    repo: repoMeta,
    scanner: {
      scanner_version: SCANNER_VERSION,
      mode: "deterministic" as const,
      language_targets: ["typescript", "javascript"] as const,
      llm_used: false as const,
    },
    limits,
    observations: {
      files,
      path_buckets: pathBuckets,
      import_edges: allImportEdges,
      test_mappings: testResult.test_mappings,
      sensitive_paths: sensitivePaths,
      owner_hints: codeownersResult.owner_hints,
      config_hints: configHints,
      package_manifests: packageManifests,
    },
    unknowns,
    excluded: excludedPaths,
    quality: null as unknown as RepoObservations["quality"], // placeholder
    meta: {
      observation_hash: "", // computed below
      partial_scan: partialScan,
      file_count: files.length,
      unknown_count: unknownCount,
      excluded_count: excludedPaths.length,
    },
  };

  // 14. Compute quality
  const quality = computeObservationQuality(preQualityObs as RepoObservations);
  const withQuality = { ...preQualityObs, quality };

  // 15. Compute hash
  const hash = computeObservationHash(withQuality as RepoObservations);
  return { ...withQuality, meta: { ...withQuality.meta, observation_hash: hash } } as RepoObservations;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type RawFile = { path: string; size_bytes: number };

function enumerateFiles(
  dir: string,
  repoRoot: string,
  excludedDirs: Set<string>,
  limits: RepoScanLimits,
): { observedFiles: RawFile[]; excludedPaths: ExcludedPath[] } {
  const observed: RawFile[] = [];
  const excluded: ExcludedPath[] = [];

  function walk(current: string): void {
    if (observed.length >= limits.max_total_files) return;

    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (observed.length >= limits.max_total_files) {
        excluded.push({
          path: normalizeRepoRelativePath(relative(repoRoot, join(current, entry))),
          reason: "max_file_limit",
          evidence: [{ type: "scanner_limit", source_path: "", value: `max_total_files=${limits.max_total_files}` }],
        });
        break;
      }

      const fullPath = join(current, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (excludedDirs.has(entry.toLowerCase())) {
          excluded.push({
            path: normalizeRepoRelativePath(relative(repoRoot, fullPath)),
            reason: "excluded_dir",
            evidence: [{ type: "path", source_path: relative(repoRoot, fullPath).replace(/\\/g, "/"), value: `excluded dir: ${entry}` }],
          });
          continue;
        }
        walk(fullPath);
      } else if (stat.isFile()) {
        const relPath = normalizeRepoRelativePath(relative(repoRoot, fullPath));
        observed.push({ path: relPath, size_bytes: stat.size });
      }
    }
  }

  walk(repoRoot);
  return { observedFiles: observed, excludedPaths: excluded };
}

function classifyObservedFile(
  raw: RawFile,
  limits: RepoScanLimits,
  pathRoles: Readonly<Record<string, FileBucket>> = {},
): ObservedFile {
  // Config path_roles override: exact prefix match
  let bucket: FileBucket | undefined;
  let overridePrefix: string | undefined;
  for (const [prefix, role] of Object.entries(pathRoles)) {
    if (raw.path.startsWith(prefix + "/") || raw.path === prefix) {
      bucket = role;
      overridePrefix = prefix;
      break;
    }
  }
  if (!bucket) {
    bucket = classifyFile(raw.path);
  }

  const language = detectLanguage(raw.path);

  let analysisStatus: ObservedFile["analysis_status"];
  const evidence: Evidence[] = [{ type: "path", source_path: raw.path, value: `bucket=${bucket}` }];

  // Record config provenance when a path_roles override changed the bucket
  if (overridePrefix !== undefined) {
    evidence.push({ type: "config", source_path: "pantheon.json", value: `path_roles.${overridePrefix}=${bucket}` });
  }

  if (raw.size_bytes > limits.max_file_bytes) {
    analysisStatus = "skipped_large_file";
    evidence.push({ type: "scanner_limit", source_path: raw.path, value: `size=${raw.size_bytes} > max=${limits.max_file_bytes}` });
  } else if (!ANALYZABLE_LANGUAGES.has(language) && language !== "json" && language !== "yaml" && language !== "markdown") {
    analysisStatus = "unsupported_language";
  } else {
    analysisStatus = "analyzed";
  }

  return { path: raw.path, bucket, language, size_bytes: raw.size_bytes, analysis_status: analysisStatus, evidence };
}

function reclassifyImportEdges(
  edges: ImportEdge[],
  packageManifests: PackageManifestObservation[],
): ImportEdge[] {
  return edges.map(edge => {
    // Only reclassify unresolved_package edges — leave relative, builtin, dynamic, alias untouched
    if (edge.resolution_status !== "unresolved_package") {
      return edge;
    }

    const newStatus = classifyPackageImport({
      rawSpecifier: edge.raw_specifier,
      packageManifests,
    });

    return { ...edge, resolution_status: newStatus };
  });
}

function collectPackageManifests(
  repoRoot: string,
  _files: ObservedFile[],
): PackageManifestObservation[] {
  const manifests: PackageManifestObservation[] = [];

  // Root package.json
  const rootPkgPath = join(repoRoot, "package.json");
  if (existsSync(rootPkgPath)) {
    try {
      const content = JSON.parse(readFileSync(rootPkgPath, "utf-8"));
      manifests.push({
        package_json_path: "package.json",
        package_name: content.name ?? undefined,
        dependencies: Object.keys(content.dependencies ?? {}),
        dev_dependencies: Object.keys(content.devDependencies ?? {}),
        peer_dependencies: Object.keys(content.peerDependencies ?? {}),
        optional_dependencies: Object.keys(content.optionalDependencies ?? {}),
        evidence: [{ type: "config", source_path: "package.json", value: "root package manifest" }],
      });
    } catch {
      // JSON parse error — skip
    }
  }

  return manifests;
}

function buildPathBuckets(files: ObservedFile[]): PathBucket[] {
  const map = new Map<FileBucket, string[]>();
  for (const f of files) {
    if (!map.has(f.bucket)) map.set(f.bucket, []);
    map.get(f.bucket)!.push(f.path);
  }
  return Array.from(map.entries()).map(([bucket, paths]) => ({
    bucket,
    paths: paths.sort(),
    count: paths.length,
  }));
}

function detectGitStatus(repoRoot: string): RepoObservationRepoMeta {
  const gitDir = join(repoRoot, ".git");
  const isGit = existsSync(gitDir);

  if (!isGit) {
    return {
      repo_root_label: repoRoot.split(/[/\\]/).pop() ?? "repo",
      repo_state: "working_tree_only",
      head_commit_hash: null,
      has_uncommitted_changes: null,
      uncommitted_file_count: null,
      scanned_at: new Date().toISOString(),
    };
  }

  try {
    const headHash = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const statusOutput = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const dirtyFiles = statusOutput ? statusOutput.split("\n").length : 0;

    return {
      repo_root_label: repoRoot.split(/[/\\]/).pop() ?? "repo",
      repo_state: dirtyFiles > 0 ? "git_dirty" : "git_clean",
      head_commit_hash: headHash,
      has_uncommitted_changes: dirtyFiles > 0,
      uncommitted_file_count: dirtyFiles,
      scanned_at: new Date().toISOString(),
    };
  } catch {
    return {
      repo_root_label: repoRoot.split(/[/\\]/).pop() ?? "repo",
      repo_state: "working_tree_only",
      head_commit_hash: null,
      has_uncommitted_changes: null,
      uncommitted_file_count: null,
      scanned_at: new Date().toISOString(),
    };
  }
}

function collectConfigHints(repoRoot: string, files: ObservedFile[]): ConfigHint[] {
  const hints: ConfigHint[] = [];

  // JSON-based configs
  const JSON_CONFIGS: Array<{ path: string; kind: ConfigHint["kind"]; fields: string[] }> = [
    { path: "package.json", kind: "package_json", fields: ["name", "type", "main", "module"] },
    { path: "tsconfig.json", kind: "tsconfig", fields: ["compilerOptions.target", "compilerOptions.module", "compilerOptions.strict"] },
    { path: "jest.config.json", kind: "jest", fields: ["testEnvironment", "transform", "preset"] },
  ];

  for (const cfg of JSON_CONFIGS) {
    const fullPath = join(repoRoot, cfg.path);
    if (!existsSync(fullPath)) continue;

    try {
      const content = JSON.parse(readFileSync(fullPath, "utf-8"));
      const detectedFields = extractJsonFields(content, cfg.fields);
      hints.push({
        config_path: cfg.path,
        kind: cfg.kind,
        detected_fields: detectedFields,
        evidence: [{ type: "config", source_path: cfg.path, value: `config file: ${cfg.kind}` }],
      });
    } catch {
      // JSON parse error — skip
    }
  }

  // JS/TS-based configs (presence detection only, no content parsing)
  const SCRIPT_CONFIGS: Array<{ paths: string[]; kind: ConfigHint["kind"] }> = [
    { paths: ["vitest.config.ts", "vitest.config.js", "vitest.config.mts"], kind: "vitest" },
    { paths: ["jest.config.ts", "jest.config.js", "jest.config.mjs"], kind: "jest" },
    { paths: [".eslintrc.js", ".eslintrc.cjs", "eslint.config.js", "eslint.config.mjs", ".eslintrc.json", ".eslintrc.yml"], kind: "eslint" },
  ];

  for (const cfg of SCRIPT_CONFIGS) {
    for (const p of cfg.paths) {
      const fullPath = join(repoRoot, p);
      if (!existsSync(fullPath)) continue;

      // Already covered by JSON configs?
      if (hints.some(h => h.kind === cfg.kind)) break;

      hints.push({
        config_path: p,
        kind: cfg.kind,
        detected_fields: [{ field_name: "config_detected", field_value_preview: `${p} exists` }],
        evidence: [{ type: "config", source_path: p, value: `config file: ${cfg.kind}` }],
      });
      break; // only first match
    }
  }

  // GitHub Actions (directory-based)
  const ghActionsDir = join(repoRoot, ".github", "workflows");
  if (existsSync(ghActionsDir)) {
    try {
      const workflows = readdirSync(ghActionsDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
      if (workflows.length > 0) {
        hints.push({
          config_path: ".github/workflows",
          kind: "github_actions",
          detected_fields: workflows.slice(0, 10).map(w => ({
            field_name: "workflow",
            field_value_preview: w.slice(0, 200),
          })),
          evidence: [{ type: "config", source_path: ".github/workflows", value: `${workflows.length} workflow(s) detected` }],
        });
      }
    } catch {
      // directory read error — skip
    }
  }

  return hints;
}

function extractJsonFields(content: unknown, fields: string[]): ConfigDetectedField[] {
  const result: ConfigDetectedField[] = [];
  for (const field of fields) {
    const parts = field.split(".");
    let val: unknown = content;
    for (const p of parts) {
      if (val && typeof val === "object" && p in (val as Record<string, unknown>)) {
        val = (val as Record<string, unknown>)[p];
      } else {
        val = undefined;
        break;
      }
    }
    if (val !== undefined) {
      const preview = String(val).slice(0, 200);
      result.push({ field_name: field, field_value_preview: preview });
    }
  }
  return result;
}

function resolveLimits(overrides?: Partial<RepoScanLimits>): RepoScanLimits {
  if (!overrides) return { ...DEFAULT_SCAN_LIMITS };
  return {
    max_file_bytes: overrides.max_file_bytes ?? DEFAULT_SCAN_LIMITS.max_file_bytes,
    max_total_files: overrides.max_total_files ?? DEFAULT_SCAN_LIMITS.max_total_files,
    max_import_edges: overrides.max_import_edges ?? DEFAULT_SCAN_LIMITS.max_import_edges,
    scan_timeout_ms: overrides.scan_timeout_ms ?? DEFAULT_SCAN_LIMITS.scan_timeout_ms,
    excluded_dirs: overrides.excluded_dirs ?? [...DEFAULT_SCAN_LIMITS.excluded_dirs],
  };
}
