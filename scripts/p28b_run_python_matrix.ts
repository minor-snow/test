#!/usr/bin/env tsx

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { spawn } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const RUNNER_VERSION = "p28b_python_matrix_runner@0.3.0";

const args = process.argv.slice(2);
let manifestPath = "data/dogfood/p28b_python_matrix/manifest_150.json";
let outDir = "data/dogfood/p28b_python_matrix/p28b_3_runs";
let concurrency = 4;
let shardSize = 25;
let resume = false;
let pilot = false;
let pilotCount = 20;
let pilotMode = "stratified";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--manifest") manifestPath = args[++i];
  if (args[i] === "--out") outDir = args[++i];
  if (args[i] === "--concurrency") concurrency = parseInt(args[++i], 10);
  if (args[i] === "--shard-size") shardSize = parseInt(args[++i], 10);
  if (args[i] === "--resume") resume = true;
  if (args[i] === "--pilot") {
    pilot = true;
    if (args[i+1] && !args[i+1].startsWith("--")) pilotCount = parseInt(args[++i], 10);
  }
  if (args[i] === "--pilot-mode") pilotMode = args[++i];
}

const absManifest = path.resolve(REPO_ROOT, manifestPath);
const absOutDir = path.resolve(REPO_ROOT, outDir);

if (!fs.existsSync(absManifest)) {
  console.error(`Manifest not found: ${absManifest}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(absManifest, "utf-8"));
const repos = manifest.repos || [];

fs.mkdirSync(absOutDir, { recursive: true });
fs.mkdirSync(path.join(absOutDir, "shards"), { recursive: true });
fs.mkdirSync(path.join(absOutDir, "repos"), { recursive: true });

function computeHash(obj: any): string {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

let activeRepos = repos;

// PILOT SELECTION
if (pilot && pilotMode === "stratified") {
  const categories: Record<string, any[]> = {};
  for (const r of repos) {
    if (!categories[r.category]) categories[r.category] = [];
    categories[r.category].push(r);
  }
  
  const quotas: Record<string, number> = {
    "django_commerce": 2,
    "fastapi_service": 2,
    "flask_framework": 2,
    "python_sdk_library": 3,
    "python_cli_tool": 2,
    "data_pipeline": 2,
    "ml_scientific": 2,
    "packaging": 2,
    "python_monorepo": 2
  };
  
  const pilotRepos: any[] = [];
  for (const [cat, count] of Object.entries(quotas)) {
    pilotRepos.push(...(categories[cat] || []).slice(0, count));
  }
  // Fill remaining
  let i = 0;
  while (pilotRepos.length < pilotCount && i < repos.length) {
    if (!pilotRepos.find(r => r.repo_id === repos[i].repo_id)) {
      pilotRepos.push(repos[i]);
    }
    i++;
  }
  activeRepos = pilotRepos.slice(0, pilotCount);
} else if (pilot) {
  activeRepos = repos.slice(0, pilotCount);
}

// RESUME CHECK
if (resume) {
  activeRepos = activeRepos.filter((repo: any) => {
    const runOutDir = path.join(absOutDir, "repos", repo.repo_id.replace(/\//g, "__"));
    const statusFile = path.join(runOutDir, "run_status.json");
    if (!fs.existsSync(statusFile)) return true;
    
    try {
      const status = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
      if (status.status !== "completed" && status.status !== "observed_only" && status.status !== "smoke" && status.status !== "unsupported") return true;
      if (status.runner_version !== RUNNER_VERSION) return true;
      if (status.pinned_commit !== repo.pinned_commit) return true;
      if (status.manifest_entry_hash !== computeHash(repo)) return true;
      console.log(`[RESUME] Skipping ${repo.repo_id}`);
      return false;
    } catch {
      return true;
    }
  });
}

async function runWorker(repo: any): Promise<any> {
  const entryHash = computeHash(repo);
  const safeName = repo.repo_id.replace(/\//g, "__");
  const runOutDir = path.join(absOutDir, "repos", safeName);
  
  let timeoutMs = 90000;
  if (repo.category === "python_monorepo") timeoutMs = 180000;
  
  const args = [
    path.join(__dirname, "p28b_worker_runner.ts"),
    "--repo-id", repo.repo_id,
    "--repo-path", repo.local_path,
    "--out-dir", runOutDir,
    "--category-expected", repo.category,
    "--manifest-entry-hash", entryHash,
    "--pinned-commit", repo.pinned_commit || "unknown",
    "--timeout-ms", timeoutMs.toString()
  ];
  
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", ...args], { stdio: "inherit", shell: true });
    
    let isFinished = false;
    
    const watchdog = setTimeout(() => {
      if (!isFinished) {
        console.log(`[TIMEOUT] Killing worker for ${repo.repo_id} (${timeoutMs}ms)`);
        child.kill("SIGKILL");
        resolve({
          status: "unsupported",
          reason: "repo_scan_timeout",
          stage: "unknown_killed",
          duration_ms: timeoutMs,
          repo_id: repo.repo_id,
          category_expected: repo.category
        });
      }
    }, timeoutMs + 2000); // Give the child's own watchdog a 2s grace period
    
    child.on("close", () => {
      isFinished = true;
      clearTimeout(watchdog);
      // Read output
      const statusFile = path.join(runOutDir, "run_status.json");
      if (fs.existsSync(statusFile)) {
        try {
          resolve(JSON.parse(fs.readFileSync(statusFile, "utf-8")));
          return;
        } catch {}
      }
      resolve({ status: "crash", reason: "Worker exited without writing status", repo_id: repo.repo_id });
    });
  });
}

async function main() {
  console.log(`Starting P28b-3 Validation Runner (${RUNNER_VERSION})`);
  console.log(`Target: ${activeRepos.length} repos (Concurrency: ${concurrency})`);

  let index = 0;
  const results: any[] = [];
  const rawGaps: any[] = [];
  
  let totalCompleted = 0;
  let totalFailed = 0;
  let totalTimeouts = 0;

  while (index < activeRepos.length) {
    const chunk = activeRepos.slice(index, index + concurrency);
    const chunkPromises = chunk.map(repo => runWorker(repo));
    const chunkResults = await Promise.all(chunkPromises);
    
    results.push(...chunkResults);
    totalCompleted += chunkResults.length;
    totalFailed += chunkResults.filter(r => r.status === "crash").length;
    totalTimeouts += chunkResults.filter(r => r.reason?.includes("timeout")).length;
    
    for (const res of chunkResults) {
      if (res.gaps) rawGaps.push(...res.gaps);
    }
    
    index += concurrency;
    
    // Shard check
    if (results.length % shardSize === 0 || index >= activeRepos.length) {
      const shardTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const shardId = `shard_${Math.ceil(results.length / shardSize).toString().padStart(2, "0")}_${shardTimestamp}`;
      const shardPath = path.join(absOutDir, "shards", `${shardId}_summary.json`);
      fs.writeFileSync(shardPath, JSON.stringify({
        id: shardId,
        repo_count: results.length,
        results
      }, null, 2));
      console.log(`[SHARD] Written ${shardId}`);
      // Clear results to avoid duplicating in next shard
      results.length = 0;
    }
  }

  // Write gap taxonomy
  fs.writeFileSync(path.join(absOutDir, "gap_taxonomy_150_raw.json"), JSON.stringify(rawGaps, null, 2));
  
  // Update Global Index
  const indexFile = path.join(absOutDir, "index.json");
  const indexData = {
    manifest: manifestPath,
    total_repos: repos.length,
    completed: fs.readdirSync(path.join(absOutDir, "repos")).length, // Or use totalCompleted + pilot existing
    failed: totalFailed,
    timeouts: totalTimeouts,
    shards: fs.readdirSync(path.join(absOutDir, "shards"))
      .filter(f => f.endsWith("_summary.json"))
      .map(f => ({
        id: f.replace("_summary.json", ""),
        status: "completed",
        summary_path: `shards/${f}`
      }))
  };
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
  console.log("Validation complete! Check index.json and gap_taxonomy_150_raw.json.");
}

main().catch(console.error);
