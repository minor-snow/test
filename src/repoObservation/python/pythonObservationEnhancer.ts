/**
 * P25a: Python Observation Enhancer (Orchestrator)
 *
 * Sidecar enhancer that runs all Python observation sub-modules
 * on top of existing RepoObservations, producing python_observations.json.
 *
 * Does NOT modify scanner. Does NOT add to RepoObservations.
 * The sidecar is a standalone artifact.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { RepoObservations } from "../types.js";
import type { PythonObservationSidecar, PythonObservationConfig, PythonObservationQuality, PythonObservedFile, PythonImportObservation, PythonDependencyManifest } from "./types.js";
import { classifyPythonFile, isPythonFile } from "./pythonFileClassifier.js";
import { isPythonEcosystemFile, isPythonManifestFile } from "./pythonEcosystemPatterns.js";
import { observePythonImports, detectProjectPackages } from "./pythonImportObserver.js";
import { extractPythonDependencies, buildDeclaredPackageSet } from "./pythonDependencyExtractor.js";
import { mapPythonTests } from "./pythonTestMapper.js";
import { detectPythonSensitiveZones } from "./pythonSensitiveZoneDetector.js";
import { buildPythonUnknownTaxonomy } from "./pythonUnknownTaxonomy.js";
import { classifyPythonLayout } from "./pythonLayoutClassifier.js";
import { detectPythonFrameworkProfile } from "./pythonFrameworkDetector.js";
import { validatePythonRiskPreset } from "./pythonRiskPresetValidator.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function enhanceWithPythonObservations(
  observations: RepoObservations,
  repoRoot: string,
  config?: PythonObservationConfig,
): PythonObservationSidecar {
  const allPaths = observations.observations.files.map(f => f.path);
  const observedPathSet = new Set(allPaths);

  // 1. Identify and classify Python files
  const pythonFiles: PythonObservedFile[] = [];
  const pythonSourcePaths: string[] = [];

  for (const file of observations.observations.files) {
    if (isPythonFile(file.path)) {
      const classified = classifyPythonFile(file.path, file.size_bytes);
      pythonFiles.push(classified);
      if (classified.bucket === "source") {
        pythonSourcePaths.push(file.path);
      }
    }
    // Also classify Python ecosystem config files (pyproject.toml, etc.)
    else if (isPythonEcosystemFile(file.path)) {
      const classified = classifyPythonFile(file.path, file.size_bytes);
      pythonFiles.push(classified);
    }
  }

  // 2. Extract dependency manifests
  const manifests = extractManifests(repoRoot, allPaths);

  // 2b. Classify layout (P27-1b)
  const layout = classifyPythonLayout({
    files: pythonFiles,
    manifests,
    allPaths,
  });

  // 3. Build declared package set
  const declaredPackages = buildDeclaredPackageSet(manifests);

  // 4. Detect project packages
  const projectPackages = config?.project_packages
    ? [...config.project_packages]
    : detectProjectPackages(allPaths);

  // 5. Observe imports from Python source files
  const imports: PythonImportObservation[] = [];
  for (const sourcePath of pythonSourcePaths) {
    try {
      const fullPath = join(repoRoot, sourcePath);
      if (!existsSync(fullPath)) continue;
      const content = readFileSync(fullPath, "utf-8");
      const fileImports = observePythonImports({
        filePath: sourcePath,
        content,
        projectPackages,
        declaredPackages,
      });
      imports.push(...fileImports);
    } catch {
      // Skip files that can't be read
    }
  }

  // 6. Detect framework and project-role profile (P27-1c)
  //    Moved before test mapping so mapper can use framework context (P27-1d)
  const frameworkProfile = detectPythonFrameworkProfile({
    files: pythonFiles,
    manifests,
    imports,
    layout,
    allPaths,
  });

  // 7. Map tests (P27-1d: framework-aware)
  const testMappings = mapPythonTests({
    sourcePaths: pythonSourcePaths,
    observedPaths: observedPathSet,
    layout,
    frameworkProfile,
  });

  // 8. Detect sensitive zones
  const pythonPaths = pythonFiles
    .filter(f => f.bucket !== "generated" && f.bucket !== "unsupported")
    .map(f => f.path);
  const sensitiveZones = detectPythonSensitiveZones({
    pythonPaths,
    sensitiveOverrides: config?.sensitive_overrides,
  });

  // 8b. Validate risk preset (P27-1e)
  const riskPresetValidation = validatePythonRiskPreset({
    layout,
    frameworkProfile,
    sensitiveZones,
    allPaths,
  });

  // 8. Build unknown taxonomy
  const unknowns = buildPythonUnknownTaxonomy({
    files: pythonFiles,
    imports,
    manifests,
    testMappings,
  });

  // 9. Compute quality
  const quality = computePythonQuality(pythonFiles, imports, testMappings, sensitiveZones, manifests);

  // 10. Limitations
  const limitations = [
    "Python import observations are syntax-level observations, not full runtime import resolution.",
    "Multi-line Python import statements (from x import (\n  a,\n  b)) are parsed as a single observation on the module, not per-symbol.",
    "Scope granularity in P25 is file/path-level. Function-level scope is future work.",
    "pyproject.toml parsing uses regex-based extraction, not a full TOML parser.",
    "Dynamic imports (__import__, importlib) cannot be statically analyzed.",
    "Namespace packages without __init__.py are not detected as project packages.",
  ];

  return {
    schema_version: "python_observations.v1",
    repo: {
      root_label: observations.repo.repo_root_label,
      observed_file_count: observations.meta.file_count,
      python_file_count: pythonFiles.length,
    },
    layout,
    framework_profile: frameworkProfile,
    risk_preset_validation: riskPresetValidation,
    files: pythonFiles,
    import_observations: imports,
    dependency_manifests: manifests,
    test_mappings: testMappings,
    sensitive_zones: sensitiveZones,
    unknowns,
    quality,
    limitations,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractManifests(repoRoot: string, allPaths: string[]): PythonDependencyManifest[] {
  const results: PythonDependencyManifest[] = [];

  for (const path of allPaths) {
    if (!isPythonManifestFile(path)) continue;

    try {
      const fullPath = join(repoRoot, path);
      if (!existsSync(fullPath)) continue;
      const content = readFileSync(fullPath, "utf-8");
      results.push(extractPythonDependencies({ filePath: path, content }));
    } catch {
      // Skip unreadable files
    }
  }

  return results;
}

function computePythonQuality(
  files: readonly PythonObservedFile[],
  imports: readonly PythonImportObservation[],
  testMappings: readonly { confidence: string }[],
  sensitiveZones: readonly { matched_paths: readonly string[] }[],
  manifests: readonly PythonDependencyManifest[],
): PythonObservationQuality {
  const pyFiles = files.filter(f => f.extension === ".py" || f.extension === ".pyi");
  const classified = pyFiles.filter(f => f.bucket !== "unknown");
  const unknown = pyFiles.filter(f => f.bucket === "unknown");

  const projectImports = imports.filter(i => i.status === "project_import");
  const declaredImports = imports.filter(i => i.status === "declared_package");
  const undeclaredImports = imports.filter(i => i.status === "undeclared_package");
  const dynamicImports = imports.filter(i => i.status === "dynamic_or_unresolved");

  const highTests = testMappings.filter(m => m.confidence === "high");
  const medTests = testMappings.filter(m => m.confidence === "medium");

  const sensitiveFileCount = new Set(sensitiveZones.flatMap(z => z.matched_paths)).size;
  const lowConfManifests = manifests.filter(m => m.confidence === "low");

  return {
    python_file_count: pyFiles.length,
    classified_count: classified.length,
    classified_ratio: pyFiles.length > 0 ? classified.length / pyFiles.length : 0,
    unknown_count: unknown.length,
    unknown_ratio: pyFiles.length > 0 ? unknown.length / pyFiles.length : 0,

    import_observation_count: imports.length,
    project_import_count: projectImports.length,
    declared_package_count: declaredImports.length,
    undeclared_package_count: undeclaredImports.length,
    dynamic_import_count: dynamicImports.length,

    test_mapping_count: testMappings.length,
    high_confidence_test_count: highTests.length,
    medium_confidence_test_count: medTests.length,

    sensitive_zone_count: sensitiveZones.length,
    sensitive_file_count: sensitiveFileCount,

    manifest_count: manifests.length,
    low_confidence_manifest_count: lowConfManifests.length,
  };
}
