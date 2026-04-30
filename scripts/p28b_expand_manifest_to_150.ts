#!/usr/bin/env tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SEED_FILE = process.argv.includes("--seed") 
  ? process.argv[process.argv.indexOf("--seed") + 1] 
  : path.join(REPO_ROOT, "data", "dogfood", "p28b_python_matrix", "p28b_3_seed_repos.json");

const OLD_MANIFEST = path.join(REPO_ROOT, "data", "dogfood", "p28b_python_matrix", "manifest.json");
const PREFLIGHT_FILE = path.join(REPO_ROOT, "data", "dogfood", "p28b_python_matrix", "preflight_150.json");
const DRAFT_FILE = path.join(REPO_ROOT, "data", "dogfood", "p28b_python_matrix", "manifest_150_draft.json");
const NEW_MANIFEST = path.join(REPO_ROOT, "data", "dogfood", "p28b_python_matrix", "manifest_150.json");
const WORKTREE_BASE = path.join(REPO_ROOT, ".worktrees", "p28b_150");

const QUOTAS: Record<string, number> = {
  "django_commerce": 12,
  "fastapi_service": 12,
  "flask_framework": 12,
  "python_sdk_library": 16,
  "python_cli_tool": 12,
  "data_pipeline": 10,
  "ml_scientific": 12,
  "packaging": 8,
  "python_monorepo": 6
};

// State
let originalManifest: any;
let preflightState: Record<string, any> = {};

function init() {
  if (fs.existsSync(OLD_MANIFEST)) {
    originalManifest = JSON.parse(fs.readFileSync(OLD_MANIFEST, "utf-8"));
  } else {
    throw new Error("Cannot find original 50-repo manifest.json");
  }

  if (fs.existsSync(PREFLIGHT_FILE)) {
    preflightState = JSON.parse(fs.readFileSync(PREFLIGHT_FILE, "utf-8"));
  }
}

function determineObservedCategory(pythonObs: any, repoObs: any, intended: string): string {
  if (pythonObs?.layout?.primary_layout === "monorepo") return "python_monorepo";
  
  const frameworks = pythonObs?.framework_profile?.framework_signals?.map((f: any) => f.name) || [];
  if (frameworks.includes("django")) return "django_commerce";
  if (frameworks.includes("fastapi") || frameworks.includes("starlette")) return "fastapi_service";
  if (frameworks.includes("flask")) return "flask_framework";
  
  const roles = pythonObs?.framework_profile?.project_role_signals?.map((r: any) => r.role) || [];
  if (roles.includes("workflow_orchestration")) return "data_pipeline";
  if (roles.includes("cli_application")) return "python_cli_tool";

  // If it's a library or generic service, allow it to be categorized by its intended domain to preserve category width
  if (intended === "ml_scientific") return "ml_scientific";
  if (intended === "packaging") return "packaging";
  if (intended === "python_cli_tool") return "python_cli_tool";
  if (intended === "data_pipeline") return "data_pipeline";
  
  if (pythonObs?.layout?.primary_layout === "library" || repoObs?.files?.some((f:any) => f.path.includes("setup.py") || f.path.includes("pyproject.toml"))) {
    return "python_sdk_library";
  }

  return "python_sdk_library"; // fallback
}

async function cloneRepo(repoName: string): Promise<{ ms: number; path: string; error?: string }> {
  const safeName = repoName.replace("/", "__");
  const clonePath = path.join(WORKTREE_BASE, safeName);
  
  if (fs.existsSync(clonePath)) {
    console.log(`  [CACHE] ${repoName} already cloned.`);
    return { ms: 0, path: clonePath };
  }

  console.log(`  [CLONE] git clone --depth 1 https://github.com/${repoName}.git`);
  const start = Date.now();
  
  try {
    const res = spawnSync("git", ["clone", "--depth", "1", `https://github.com/${repoName}.git`, clonePath], { encoding: "utf-8", timeout: 120_000, killSignal: "SIGKILL" });
    const ms = Date.now() - start;
    
    if (res.error && (res.error as any).code === "ETIMEDOUT") {
      fs.rmSync(clonePath, { recursive: true, force: true });
      return { ms, path: clonePath, error: "Clone timeout (> 2min)" };
    }
    
    if (res.status !== 0) {
      return { ms, path: clonePath, error: res.stderr || "Git clone failed" };
    }
    
    if (ms > 120_000) {
      fs.rmSync(clonePath, { recursive: true, force: true });
      return { ms, path: clonePath, error: "Clone timeout (> 2min)" };
    }
    
    return { ms, path: clonePath };
  } catch (err: any) {
    return { ms: Date.now() - start, path: clonePath, error: err.message };
  }
}

async function runObservation(repoPath: string, repoLabel: string) {
  const { scanRepo } = await import("../src/repoObservation/repoScanner.js");
  const { enhanceWithPythonObservations } = await import("../src/repoObservation/python/pythonObservationEnhancer.js");
  
  const repoObs = await scanRepo({ repoRoot: repoPath });
  const pythonObs = await enhanceWithPythonObservations(repoObs, repoPath);
  return { repoObs, pythonObs };
}

async function main() {
  init();
  
  const seeds = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  console.log(`Loaded ${seeds.repos.length} candidates from seed list.`);

  const acceptedRepos: any[] = [];
  const rejectedRepos: any[] = [];
  
  // Track quotas
  const currentCounts: Record<string, number> = { ...QUOTAS };
  for (const k in currentCounts) currentCounts[k] = 0;

  for (const seed of seeds.repos) {
    const r = seed.repo;

    // Check if already in 50-manifest
    if (originalManifest.repos.find((o: any) => o.repo_id === r)) {
      console.log(`[SKIP] ${r} is already in the original 50 matrix.`);
      continue;
    }

    if (preflightState[r]?.selected) {
      const cat = preflightState[r].observed_category;
      if (currentCounts[cat] >= QUOTAS[cat]) {
        console.log(`[SKIP] ${r} was selected but ${cat} quota is full.`);
        continue;
      }
      acceptedRepos.push(preflightState[r]);
      currentCounts[cat]++;
      console.log(`[LOAD] ${r} -> ${cat} (${currentCounts[cat]}/${QUOTAS[cat]})`);
      continue;
    }
    
    if (preflightState[r]?.reject_reason) {
      console.log(`[REJECT CACHED] ${r}: ${preflightState[r].reject_reason}`);
      continue;
    }

    // Stop early if all quotas met?
    const allMet = Object.keys(QUOTAS).every(k => currentCounts[k] >= QUOTAS[k]);
    if (allMet) {
      console.log("All category quotas have been met!");
      break;
    }

    console.log(`\n▶ Processing ${r} (Intended: ${seed.intended_category})`);

    const cloneRes = await cloneRepo(r);
    if (cloneRes.error) {
      console.log(`  ❌ Rejected: ${cloneRes.error}`);
      preflightState[r] = { repo: r, selected: false, reject_reason: cloneRes.error };
      fs.writeFileSync(PREFLIGHT_FILE, JSON.stringify(preflightState, null, 2));
      continue;
    }

    // Pinned commit
    let pinnedCommit = "unknown";
    try {
      pinnedCommit = execSync("git rev-parse HEAD", { cwd: cloneRes.path, encoding: "utf-8" }).trim();
    } catch {}

    // Observation
    let obsRes;
    try {
      obsRes = await runObservation(cloneRes.path, r);
    } catch (e: any) {
      console.log(`  ❌ Rejected: Observation crashed - ${e.message}`);
      console.log(e.stack);
      preflightState[r] = { repo: r, selected: false, reject_reason: "Observation crash" };
      fs.writeFileSync(PREFLIGHT_FILE, JSON.stringify(preflightState, null, 2));
      continue;
    }

    const { repoObs, pythonObs } = obsRes;
    const pyCount = pythonObs?.repo?.python_file_count || 0;
    if (pyCount === 0) {
      console.log(`  ❌ Rejected: No python files.`);
      preflightState[r] = { repo: r, selected: false, reject_reason: "No Python source" };
      fs.writeFileSync(PREFLIGHT_FILE, JSON.stringify(preflightState, null, 2));
      continue;
    }

    const testFiles = repoObs?.files?.filter((f: any) => f.bucket === "test").length || 0;
    const manifestFiles = repoObs?.files?.filter((f: any) => f.bucket === "config").map((f:any)=>f.path) || [];
    const observedCategory = determineObservedCategory(pythonObs, repoObs, seed.intended_category);

    console.log(`  Observed Category: ${observedCategory}`);

    if (currentCounts[observedCategory] >= QUOTAS[observedCategory]) {
      console.log(`  ❌ Rejected: Quota full for ${observedCategory}`);
      preflightState[r] = { repo: r, selected: false, reject_reason: `Quota full for ${observedCategory}` };
      fs.writeFileSync(PREFLIGHT_FILE, JSON.stringify(preflightState, null, 2));
      continue;
    }

    // ACCEPT
    const entry = {
      repo_id: r,
      intended_category: seed.intended_category,
      observed_category: observedCategory,
      category: observedCategory, // canonical alias
      selected: true,
      clone_duration_ms: cloneRes.ms,
      pinned_commit: pinnedCommit,
      python_files: pyCount,
      test_files: testFiles,
      manifest_files: manifestFiles,
      reject_reason: null,
      source: "curated_seed",
      local_path: cloneRes.path,
      expected_min_support: "smoke"
    };

    preflightState[r] = entry;
    acceptedRepos.push(entry);
    currentCounts[observedCategory]++;
    
    console.log(`  ✅ Accepted: ${r} -> ${observedCategory} (${currentCounts[observedCategory]}/${QUOTAS[observedCategory]})`);
    fs.writeFileSync(PREFLIGHT_FILE, JSON.stringify(preflightState, null, 2));
  }

  // Generate 150 manifest
  const finalManifest = {
    schema_version: "p28b_3_manifest@0.1.0",
    generated_at: new Date().toISOString(),
    repos: [
      ...originalManifest.repos,
      ...acceptedRepos.map(r => ({
        repo_id: r.repo_id,
        source: r.source,
        category: r.category,
        local_path: r.local_path,
        github_url: `https://github.com/${r.repo_id}`,
        pinned_commit: r.pinned_commit,
        expected_min_support: r.expected_min_support,
        notes: `P28b-3 expansion. Intended: ${r.intended_category}`,
        preflight_status: "validated"
      }))
    ]
  };

  fs.writeFileSync(NEW_MANIFEST, JSON.stringify(finalManifest, null, 2));
  
  console.log(`\n=== Preflight Summary ===`);
  console.log(`Accepted New Repos: ${acceptedRepos.length} / 100 target`);
  console.log(`Total Matrix Size: ${finalManifest.repos.length}`);
  for (const cat in QUOTAS) {
    console.log(`  - ${cat.padEnd(25)} : ${currentCounts[cat]} / ${QUOTAS[cat]}`);
  }
  console.log(`Output written to ${NEW_MANIFEST}`);
}

main().catch(console.error);
