/**
 * P28c: TypeScript/JavaScript Base Adapter — Orchestrator
 *
 * Takes RepoObservations from the existing repoScanner.ts (which already
 * handles TS/JS file enumeration, import extraction, etc.) and produces
 * a TypeScriptObservationSidecar with TS/JS-specific enrichment.
 *
 * Pipeline:
 *   1. Project classification (layout, file bucketing)
 *   2. Framework & role detection
 *   3. Test mapping (unit/integration/e2e split)
 *   4. Risk preset validation
 *   5. Workspace detection
 *   6. Sensitive zone detection
 *   7. Support level assessment
 *   8. Quality metrics
 *
 * Does NOT use TypeScript compiler API. Heuristic-only.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { classifyTypeScriptProject } from "./typescriptProjectClassifier.js";
import { detectTypeScriptFrameworkProfile } from "./typescriptFrameworkDetector.js";
import { mapTypeScriptTests } from "./typescriptTestMapper.js";
import { validateTypeScriptRiskPreset } from "./typescriptRiskPreset.js";
import { assessTypeScriptSupportLevel } from "./typescriptSupportAssessor.js";
export function produceTypeScriptObservations(input) {
    const { repoRoot, observations } = input;
    const allPaths = observations.observations.files.map(f => f.path);
    const hasPackageJson = allPaths.some(p => p.endsWith("package.json"));
    // 1. Read package.json fields
    const packageJsonFields = readPackageJsonFields(repoRoot);
    // 2. Project classification + file bucketing
    const { layout, tsFiles } = classifyTypeScriptProject({
        files: observations.observations.files,
        manifests: observations.observations.package_manifests,
        configHints: observations.observations.config_hints,
        allPaths,
        packageJsonBin: packageJsonFields.bin,
        packageJsonWorkspaces: packageJsonFields.workspaces,
    });
    // 3. Framework & role detection
    const frameworkProfile = detectTypeScriptFrameworkProfile({
        files: observations.observations.files,
        manifests: observations.observations.package_manifests,
        imports: observations.observations.import_edges,
        configHints: observations.observations.config_hints,
        layout,
        allPaths,
        packageJsonFields,
    });
    // 4. Test mapping
    const testResult = mapTypeScriptTests({ tsFiles, allPaths });
    // 5. Risk preset validation
    const riskPreset = validateTypeScriptRiskPreset({
        layout,
        frameworkProfile,
        tsFiles,
        allPaths,
        packageJsonFields,
    });
    // 6. Workspace detection
    const workspace = detectWorkspace(repoRoot, allPaths);
    // 7. Sensitive zones
    const sensitiveZones = detectSensitiveZones(allPaths);
    // 8. Unknowns
    const unknowns = buildUnknowns(tsFiles, testResult, frameworkProfile);
    // 9. Quality metrics
    const quality = computeQuality(tsFiles, testResult, frameworkProfile, sensitiveZones, workspace);
    const support = assessTypeScriptSupportLevel({
        layout,
        frameworkProfile,
        riskPreset,
        tsFiles,
        testMappings: testResult.test_mappings,
        hasPackageJson,
        allPaths,
        workspace,
    });
    // 11. Limitations
    const limitations = [
        "No TypeScript compiler API analysis — heuristic-only observation",
        "Cross-package import graph not resolved for monorepos",
        "Vue/Svelte/Angular frameworks out of scope",
        "Dynamic imports and runtime-conditional modules not tracked",
    ];
    const tsFileCount = tsFiles.filter(f => f.extension === ".ts" || f.extension === ".tsx" || f.extension === ".mts" || f.extension === ".cts").length;
    const jsFileCount = tsFiles.filter(f => f.extension === ".js" || f.extension === ".jsx" || f.extension === ".mjs" || f.extension === ".cjs").length;
    const sidecar = {
        schema_version: "typescript_observations.v1",
        repo: {
            root_label: observations.repo.repo_root_label,
            observed_file_count: observations.meta.file_count,
            typescript_file_count: tsFileCount,
            javascript_file_count: jsFileCount,
        },
        layout,
        framework_profile: frameworkProfile,
        risk_preset_validation: riskPreset,
        workspace,
        files: tsFiles,
        test_mappings: testResult.test_mappings,
        sensitive_zones: sensitiveZones,
        unknowns,
        quality,
        limitations,
    };
    return { sidecar, support };
}
// ---------------------------------------------------------------------------
// Package.json field reader
// ---------------------------------------------------------------------------
function readPackageJsonFields(repoRoot) {
    const pkgPath = join(repoRoot, "package.json");
    if (!existsSync(pkgPath))
        return {};
    try {
        const content = JSON.parse(readFileSync(pkgPath, "utf-8"));
        return {
            scripts: content.scripts,
            bin: content.bin,
            exports: content.exports,
            main: content.main,
            module: content.module,
            types: content.types,
            workspaces: content.workspaces,
            packageManager: content.packageManager,
            engines: content.engines,
        };
    }
    catch {
        return {};
    }
}
// ---------------------------------------------------------------------------
// Workspace detection
// ---------------------------------------------------------------------------
function detectWorkspace(repoRoot, allPaths) {
    const pathSet = new Set(allPaths);
    // Check workspace indicators
    let manager = "unknown";
    let configPath = "";
    const evidence = [];
    if (pathSet.has("pnpm-workspace.yaml")) {
        manager = "pnpm";
        configPath = "pnpm-workspace.yaml";
        evidence.push("pnpm-workspace.yaml detected");
    }
    else if (pathSet.has("turbo.json")) {
        manager = "turbo";
        configPath = "turbo.json";
        evidence.push("turbo.json detected");
    }
    else if (pathSet.has("nx.json")) {
        manager = "nx";
        configPath = "nx.json";
        evidence.push("nx.json detected");
    }
    else if (pathSet.has("lerna.json")) {
        manager = "lerna";
        configPath = "lerna.json";
        evidence.push("lerna.json detected");
    }
    else if (pathSet.has("rush.json")) {
        manager = "rush";
        configPath = "rush.json";
        evidence.push("rush.json detected");
    }
    // Check package.json workspaces field
    const pkgJsonPath = join(repoRoot, "package.json");
    let pkgWorkspaces = false;
    if (existsSync(pkgJsonPath)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
            if (pkg.workspaces) {
                pkgWorkspaces = true;
                evidence.push("package.json workspaces field present");
                if (manager === "unknown") {
                    // Determine manager from lockfile
                    if (pathSet.has("yarn.lock")) {
                        manager = "yarn";
                        configPath = "package.json";
                    }
                    else if (pathSet.has("package-lock.json")) {
                        manager = "npm";
                        configPath = "package.json";
                    }
                    else {
                        manager = "unknown";
                        configPath = "package.json";
                    }
                }
            }
        }
        catch { /* ignore */ }
    }
    // Check structural patterns
    const hasPackagesDir = allPaths.some(p => p.startsWith("packages/") && p.includes("package.json"));
    const hasAppsDir = allPaths.some(p => p.startsWith("apps/") && p.includes("package.json"));
    if (hasPackagesDir)
        evidence.push("packages/ directory with package.json sub-packages");
    if (hasAppsDir)
        evidence.push("apps/ directory with package.json sub-packages");
    if (evidence.length === 0)
        return null;
    // Discover workspace packages
    const packages = [];
    const subPkgJsons = allPaths.filter(p => p !== "package.json" && p.endsWith("/package.json") &&
        (p.startsWith("packages/") || p.startsWith("apps/") || p.startsWith("libs/") || p.startsWith("modules/")));
    for (const pkgJson of subPkgJsons) {
        const relPath = pkgJson.replace("/package.json", "");
        try {
            const content = JSON.parse(readFileSync(join(repoRoot, pkgJson), "utf-8"));
            packages.push({ name: content.name || relPath, relative_path: relPath, has_package_json: true });
        }
        catch {
            packages.push({ name: relPath, relative_path: relPath, has_package_json: true });
        }
    }
    return { manager, config_path: configPath, packages, evidence };
}
// ---------------------------------------------------------------------------
// Sensitive zone detection
// ---------------------------------------------------------------------------
function detectSensitiveZones(allPaths) {
    const zones = [];
    const patterns = [
        { pattern: /\bauth\b/i, category: "authentication", severity: "high" },
        { pattern: /\bpayment\b/i, category: "payment", severity: "critical" },
        { pattern: /\bbilling\b/i, category: "billing", severity: "critical" },
        { pattern: /\bsecret\b/i, category: "secrets", severity: "critical" },
        { pattern: /\badmin\b/i, category: "admin", severity: "high" },
        { pattern: /\bmiddleware\b/i, category: "middleware", severity: "medium" },
        { pattern: /\bmigration\b/i, category: "migration", severity: "high" },
        { pattern: /\.env(\.|$)/, category: "environment_config", severity: "critical" },
    ];
    for (const { pattern, category, severity } of patterns) {
        const matched = allPaths.filter(p => pattern.test(p));
        if (matched.length > 0) {
            zones.push({
                path_pattern: pattern.source,
                matched_paths: matched.slice(0, 20),
                category,
                severity,
                source: "keyword",
                evidence: [`${matched.length} paths matched`],
            });
        }
    }
    return zones;
}
// ---------------------------------------------------------------------------
// Unknown taxonomy
// ---------------------------------------------------------------------------
function buildUnknowns(tsFiles, testResult, frameworkProfile) {
    const unknowns = [];
    const unknownBucket = tsFiles.filter(f => f.bucket === "unknown");
    if (unknownBucket.length > 0) {
        unknowns.push({
            category: "unclassified_file",
            classification: "actionable",
            paths: unknownBucket.map(f => f.path).slice(0, 50),
            count: unknownBucket.length,
            note: "Files that could not be classified into a known bucket",
        });
    }
    if (testResult.unmapped_sources.length > 0) {
        unknowns.push({
            category: "test_mapping_unknown",
            classification: "actionable",
            paths: testResult.unmapped_sources.slice(0, 50),
            count: testResult.unmapped_sources.length,
            note: "Source files without corresponding test files",
        });
    }
    if (frameworkProfile.unknowns.length > 0) {
        unknowns.push({
            category: "unknown_framework_or_role",
            classification: "intrinsic",
            paths: [],
            count: frameworkProfile.unknowns.length,
            note: frameworkProfile.unknowns.map(u => u.reason).join("; "),
        });
    }
    // Scope granularity limit (always present)
    unknowns.push({
        category: "scope_granularity_limit",
        classification: "intrinsic",
        paths: [],
        count: 0,
        note: "Scope granularity in P28c is file/path-level. Function-level and semantic delta constraints are future work.",
    });
    return unknowns;
}
// ---------------------------------------------------------------------------
// Quality metrics
// ---------------------------------------------------------------------------
function computeQuality(tsFiles, testResult, frameworkProfile, sensitiveZones, workspace) {
    const tsCount = tsFiles.filter(f => [".ts", ".tsx", ".mts", ".cts"].includes(f.extension)).length;
    const jsCount = tsFiles.filter(f => [".js", ".jsx", ".mjs", ".cjs"].includes(f.extension)).length;
    const classified = tsFiles.filter(f => f.bucket !== "unknown").length;
    const unknown = tsFiles.filter(f => f.bucket === "unknown").length;
    const total = tsFiles.length || 1;
    const highConfTests = testResult.test_mappings.filter(m => m.confidence === "high").length;
    const medConfTests = testResult.test_mappings.filter(m => m.confidence === "medium").length;
    const sensitiveFileCount = sensitiveZones.reduce((sum, z) => sum + z.matched_paths.length, 0);
    return {
        typescript_file_count: tsCount,
        javascript_file_count: jsCount,
        classified_count: classified,
        classified_ratio: Math.round(classified / total * 1000) / 1000,
        unknown_count: unknown,
        unknown_ratio: Math.round(unknown / total * 1000) / 1000,
        test_mapping_count: testResult.test_mappings.length,
        high_confidence_test_count: highConfTests,
        medium_confidence_test_count: medConfTests,
        sensitive_zone_count: sensitiveZones.length,
        sensitive_file_count: sensitiveFileCount,
        framework_signal_count: frameworkProfile.framework_signals.length,
        role_signal_count: frameworkProfile.project_role_signals.length,
        workspace_package_count: workspace?.packages.length ?? 0,
    };
}
//# sourceMappingURL=typescriptBaseAdapter.js.map