#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(REPO_ROOT, "data", "dogfood", "p28b_python_matrix", "manifest_150.json");

const args = process.argv.slice(2);
const isPilot = args.includes("--pilot");
const isFull = args.includes("--full");
const isResume = args.includes("--resume");

function runCommand(command: string, args: string[]) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", cwd: REPO_ROOT, shell: true });
  if (result.status !== 0) {
    console.error(`\n[FATAL] Command failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

function checkManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("[FATAL] manifest_150.json not found! Run expansion script first.");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  console.log(`[OK] Found manifest with ${manifest.repos.length} repositories.`);
}

console.log("=== P28b-3 Orchestrator ===\n");

if (isPilot) {
  console.log("Stage B: Running 20-Repo Stratified Pilot");
  checkManifest();
  runCommand("npx", [
    "tsx", "scripts/p28b_run_python_matrix.ts",
    "--manifest", "data/dogfood/p28b_python_matrix/manifest_150.json",
    "--out", "data/dogfood/p28b_python_matrix/p28b_3_runs",
    "--concurrency", "4",
    "--shard-size", "25",
    "--pilot", "20",
    "--pilot-mode", "stratified",
    ...(isResume ? ["--resume"] : [])
  ]);
  console.log("\n[SUCCESS] Pilot completed. Inspect results before running --full.");
} else if (isFull) {
  console.log("Stage C: Running Full 150-Repo Validation");
  checkManifest();
  runCommand("npx", [
    "tsx", "scripts/p28b_run_python_matrix.ts",
    "--manifest", "data/dogfood/p28b_python_matrix/manifest_150.json",
    "--out", "data/dogfood/p28b_python_matrix/p28b_3_runs",
    "--concurrency", "4",
    "--shard-size", "25",
    ...(isResume ? ["--resume"] : [])
  ]);
  console.log("\n[SUCCESS] Full validation completed. Check index.json and gap_taxonomy_150_raw.json.");
} else {
  console.log("Usage:");
  console.log("  npx tsx scripts/p28b_3_orchestrator.ts --pilot");
  console.log("  npx tsx scripts/p28b_3_orchestrator.ts --full --resume");
}
