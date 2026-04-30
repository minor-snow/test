#!/usr/bin/env tsx
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { scanRepo } from "../src/repoObservation/repoScanner.js";
import { enhanceWithPythonObservations } from "../src/repoObservation/python/pythonObservationEnhancer.js";

const args = process.argv.slice(2);
let repoId = "";
let repoPath = "";
let outDir = "";
let expectedCategory = "";
let manifestEntryHash = "";
let pinnedCommit = "";
let timeoutMs = 180000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--repo-id") repoId = args[++i];
  if (args[i] === "--repo-path") repoPath = args[++i];
  if (args[i] === "--out-dir") outDir = args[++i];
  if (args[i] === "--category-expected") expectedCategory = args[++i];
  if (args[i] === "--manifest-entry-hash") manifestEntryHash = args[++i];
  if (args[i] === "--pinned-commit") pinnedCommit = args[++i];
  if (args[i] === "--timeout-ms") timeoutMs = parseInt(args[++i], 10);
}

if (!repoId || !repoPath || !outDir) {
  console.error("Missing required arguments.");
  process.exit(1);
}

// 1. Isolation assert
const absOutDir = path.resolve(outDir);
const absRepoPath = path.resolve(repoPath);

if (absOutDir.startsWith(absRepoPath)) {
  console.error("FATAL: Isolation violation. Output directory cannot be inside the repo working tree.");
  process.exit(1);
}

fs.mkdirSync(absOutDir, { recursive: true });

interface WorkerResult {
  status: "completed" | "unsupported" | "observed_only" | "smoke" | "crash";
  reason?: string;
  stage?: string;
  duration_ms: number;
  repo_id: string;
  category_expected: string;
  category_observed?: string;
  support_level?: string;
  python_files?: number;
  test_files?: number;
  manifest_files?: string[];
  framework_signals?: string[];
  project_role_signals?: string[];
  test_mapping_count?: number;
  risk_preset?: string;
  sanitizer_violations?: number;
  gaps?: any[];
  unknowns?: any[];
}

function checkSanitizer(pythonObsText: string, repoRootPath: string): number {
  const violations: string[] = [];
  const absPathPattern = new RegExp(repoRootPath.replace(/\\/g, "\\\\").replace(/\//g, "[\\\\/]"), "g");
  const matches = pythonObsText.match(absPathPattern);
  if (matches && matches.length > 0) {
    violations.push(`absolute_path_leak: ${matches.length} occurrences`);
  }
  return violations.length;
}

async function run() {
  const startTime = Date.now();
  let currentStage = "repo_observation";

  // Watchdog timeout to exit process
  const watchdog = setTimeout(() => {
    const duration = Date.now() - startTime;
    let support_level = "unsupported";
    let reason = "repo_scan_timeout";
    
    if (currentStage === "python_enhancement") {
      support_level = "observed_only";
      reason = "python_observation_timeout";
    } else if (currentStage === "support_assessment") {
      support_level = "smoke";
      reason = "support_assessment_timeout";
    }

    const result: WorkerResult = {
      status: support_level as any,
      reason,
      stage: currentStage,
      duration_ms: duration,
      repo_id: repoId,
      category_expected: expectedCategory
    };

    fs.writeFileSync(path.join(outDir, "run_status.json"), JSON.stringify(result, null, 2));
    process.exit(0); // Exit cleanly so parent reads run_status.json
  }, timeoutMs);

  try {
    currentStage = "repo_observation";
    const repoObs = await scanRepo({ repoRoot: repoPath });
    fs.writeFileSync(path.join(outDir, "repo_observation.json"), JSON.stringify(repoObs, null, 2));

    currentStage = "python_enhancement";
    const pythonObs = await enhanceWithPythonObservations(repoObs, repoPath);
    fs.writeFileSync(path.join(outDir, "python_observations.json"), JSON.stringify(pythonObs, null, 2));

    currentStage = "support_assessment";
    const sanitizerViolations = checkSanitizer(JSON.stringify(pythonObs), repoPath);

    // Assess Gaps
    const gaps: any[] = [];
    const unknowns = pythonObs?.unknowns || [];
    
    let layoutConfidence = pythonObs?.layout?.confidence || "none";
    if (layoutConfidence === "none" || layoutConfidence === "low") {
      gaps.push({ repo_id: repoId, gap_kind: "layout_low_confidence", severity: "medium", blocking: false, evidence: "Primary layout missing or low confidence", recommended_phase: "P28b-later" });
    }
    
    const pyCount = pythonObs?.repo?.python_file_count || 0;
    const testMappings = pythonObs?.test_mappings || [];
    if (pyCount > 0 && testMappings.length === 0) {
      gaps.push({ repo_id: repoId, gap_kind: "test_mapping_gap", severity: "high", blocking: false, evidence: "No test mappings found", recommended_phase: "P28b-later" });
    }

    let hasFramework = false;
    let observedCat = expectedCategory;
    const frameworkSignals = pythonObs?.framework_profile?.framework_signals || [];
    if (frameworkSignals.length > 0) hasFramework = true;
    else if (pyCount > 0) {
      gaps.push({ repo_id: repoId, gap_kind: "framework_detection_gap", severity: "medium", blocking: false, evidence: "No frameworks detected", recommended_phase: "P28b-later" });
    }

    let hasProjectRole = false;
    const roleSignals = pythonObs?.framework_profile?.project_role_signals || [];
    if (roleSignals.length > 0) hasProjectRole = true;

    let hasRiskPreset = false;
    if (pythonObs?.risk_preset_validation?.preset && pythonObs?.risk_preset_validation?.preset !== "unknown") {
      hasRiskPreset = true;
      observedCat = pythonObs.risk_preset_validation.preset;
    } else if (pyCount > 0) {
      gaps.push({ repo_id: repoId, gap_kind: "risk_preset_missing", severity: "medium", blocking: false, evidence: "Unknown risk preset", recommended_phase: "P28b-later" });
    }
    
    // Category mismatch checking
    if (hasFramework) {
      const fnames = frameworkSignals.map((f:any)=>f.name);
      if (fnames.includes("django")) observedCat = "django_commerce";
      else if (fnames.includes("fastapi") || fnames.includes("starlette")) observedCat = "fastapi_service";
      else if (fnames.includes("flask")) observedCat = "flask_framework";
    }

    if (observedCat !== expectedCategory) {
      gaps.push({ repo_id: repoId, gap_kind: "category_quota_mismatch", severity: "medium", blocking: false, evidence: `Expected ${expectedCategory}, got ${observedCat}`, recommended_phase: "P28b-later" });
    }

    // Monorepo hallucination gap
    if (pythonObs?.layout?.primary_layout === "monorepo" && expectedCategory !== "python_monorepo") {
      gaps.push({ repo_id: repoId, gap_kind: "monorepo_hallucinated", severity: "high", blocking: true, evidence: "Monorepo detected but not intended", recommended_phase: "P28b-later" });
    }

    // Determine Support Level
    let support_level = "observed_only";
    if (sanitizerViolations > 0) {
      support_level = "unsupported";
      gaps.push({ repo_id: repoId, gap_kind: "sanitizer_leak", severity: "critical", blocking: true, evidence: `${sanitizerViolations} leaks detected`, recommended_phase: "P28b-3" });
    } else {
      const strongCount = [layoutConfidence !== "none", hasFramework, hasProjectRole, testMappings.length > 0, hasRiskPreset].filter(Boolean).length;
      if (strongCount === 5 && pyCount > 0) support_level = "validated";
      else if (strongCount >= 3 && hasProjectRole) support_level = "supported";
      else if (pyCount > 0) support_level = "smoke";
    }

    const testFilesCount = repoObs?.files?.filter((f: any) => f.bucket === "test").length || 0;
    const manifestFiles = repoObs?.files?.filter((f: any) => f.bucket === "config").map((f:any)=>f.path) || [];

    const duration = Date.now() - startTime;

    const result: WorkerResult = {
      repo_id: repoId,
      category_expected: expectedCategory,
      category_observed: observedCat,
      support_level,
      status: "completed",
      duration_ms: duration,
      python_files: pyCount,
      test_files: testFilesCount,
      manifest_files: manifestFiles,
      framework_signals: frameworkSignals.map((f:any)=> `${f.name}/${f.confidence}`),
      project_role_signals: roleSignals.map((f:any)=> `${f.role}/${f.confidence}`),
      test_mapping_count: testMappings.length,
      risk_preset: pythonObs?.risk_preset_validation?.preset || "unknown",
      sanitizer_violations: sanitizerViolations,
      gaps,
      unknowns: pythonObs?.unknowns || []
    };

    fs.writeFileSync(path.join(outDir, "artifact_sanitizer_report.json"), JSON.stringify({ violations: sanitizerViolations }, null, 2));
    fs.writeFileSync(path.join(outDir, "gap_notes.json"), JSON.stringify(gaps, null, 2));

    const finalResult = {
      runner_version: "p28b_python_matrix_runner@0.3.0",
      manifest_entry_hash: manifestEntryHash,
      pinned_commit: pinnedCommit,
      completed_at: new Date().toISOString(),
      ...result
    };
    
    fs.writeFileSync(path.join(outDir, "run_status.json"), JSON.stringify(finalResult, null, 2));

    clearTimeout(watchdog);
    process.exit(0);

  } catch (err: any) {
    clearTimeout(watchdog);
    const duration = Date.now() - startTime;
    const result: WorkerResult = {
      status: "crash",
      reason: String(err?.message || err),
      stage: currentStage,
      duration_ms: duration,
      repo_id: repoId,
      category_expected: expectedCategory
    };
    fs.writeFileSync(path.join(outDir, "run_status.json"), JSON.stringify(result, null, 2));
    process.exit(0);
  }
}

run();
