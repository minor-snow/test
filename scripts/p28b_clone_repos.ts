#!/usr/bin/env tsx
/**
 * P28b-1 Step 1: Clone 42 pending repos
 *
 * Reads manifest, finds all repos with preflight_status = "pending_clone",
 * runs git clone --depth 1 with a 2-minute hard timeout,
 * gets the pinned_commit (HEAD after clone),
 * updates the manifest with local_path, pinned_commit, preflight_status.
 *
 * Skip rules:
 *   - clone > 120s → skip, mark "preflight_skip_timeout"
 *   - git error      → skip, mark "preflight_skip_error"
 *
 * Usage:
 *   npx tsx scripts/p28b_clone_repos.ts
 *   npx tsx scripts/p28b_clone_repos.ts --dry-run
 *   npx tsx scripts/p28b_clone_repos.ts --id requests
 */

import { join, resolve, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix", "manifest.json");
const CLONE_BASE = "H:/Boom/benchmarks";
const CLONE_TIMEOUT_MS = 120_000;
const DRY_RUN = process.argv.includes("--dry-run");
const ID_FILTER = process.argv.includes("--id")
  ? process.argv[process.argv.indexOf("--id") + 1]
  : null;

function log(msg: string) { console.log(`[P28b-clone] ${msg}`); }

interface ManifestRepo {
  repo_id: string;
  source: string;
  category: string;
  local_path: string | null;
  github_url: string | null;
  pinned_commit: string | null;
  expected_min_support: string;
  notes: string;
  preflight_status: string;
  clone_duration_ms?: number;
  skip_reason?: string;
}

function cloneDir(repoId: string): string {
  return join(CLONE_BASE, repoId).replace(/\//g, "\\");
}

function cloneRepo(repo: ManifestRepo): {
  success: boolean;
  local_path: string | null;
  pinned_commit: string | null;
  duration_ms: number;
  skip_reason?: string;
} {
  const dir = cloneDir(repo.repo_id);
  const githubUrl = repo.github_url;

  if (!githubUrl) {
    return { success: false, local_path: null, pinned_commit: null, duration_ms: 0, skip_reason: "no_github_url" };
  }

  // Already cloned
  if (existsSync(dir) && existsSync(join(dir, ".git"))) {
    log(`  [EXISTS] ${repo.repo_id}: already cloned at ${dir}`);
    const headResult = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf-8" });
    const commit = headResult.stdout?.trim() ?? null;
    return { success: true, local_path: dir, pinned_commit: commit, duration_ms: 0 };
  }

  if (DRY_RUN) {
    log(`  [DRY-RUN] Would clone: ${githubUrl} → ${dir}`);
    return { success: false, local_path: null, pinned_commit: null, duration_ms: 0, skip_reason: "dry_run" };
  }

  log(`  [CLONE] ${repo.repo_id}: ${githubUrl} → ${dir}`);
  const start = Date.now();

  const result = spawnSync(
    "git",
    ["clone", "--depth", "1", "--single-branch", githubUrl, dir],
    {
      encoding: "utf-8",
      timeout: CLONE_TIMEOUT_MS,
      shell: false,
    }
  );
  const duration_ms = Date.now() - start;

  if (result.signal === "SIGTERM" || duration_ms >= CLONE_TIMEOUT_MS - 500) {
    log(`  [TIMEOUT] ${repo.repo_id}: clone took ${duration_ms}ms, exceeded 2min budget`);
    return { success: false, local_path: null, pinned_commit: null, duration_ms, skip_reason: "preflight_skip_timeout" };
  }

  if (result.status !== 0) {
    const err = (result.stderr ?? "").slice(0, 200);
    log(`  [ERROR] ${repo.repo_id}: clone failed (exit ${result.status}): ${err}`);
    return { success: false, local_path: null, pinned_commit: null, duration_ms, skip_reason: `preflight_skip_error: ${err.slice(0, 80)}` };
  }

  // Get HEAD commit
  const headResult = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf-8" });
  const commit = headResult.stdout?.trim() ?? null;

  log(`  ✅ ${repo.repo_id}: cloned in ${duration_ms}ms | commit ${commit?.slice(0, 12) ?? "unknown"}`);
  return { success: true, local_path: dir, pinned_commit: commit, duration_ms };
}

function main() {
  log("P28b-1 Step 1: Clone pending repos");
  log(`Manifest: ${MANIFEST_PATH}`);
  if (DRY_RUN) log("DRY RUN mode — no actual clones");

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const repos: ManifestRepo[] = manifest.repos;

  const pending = repos.filter(r =>
    r.preflight_status === "pending_clone" &&
    (!ID_FILTER || r.repo_id === ID_FILTER)
  );

  log(`Found ${pending.length} repos to clone\n`);

  let cloned = 0;
  let skipped = 0;
  let existing = 0;

  for (const repo of pending) {
    const result = cloneRepo(repo);

    if (result.skip_reason === "dry_run") {
      skipped++;
      continue;
    }

    // Update repo in manifest
    const idx = manifest.repos.findIndex((r: ManifestRepo) => r.repo_id === repo.repo_id);
    if (idx === -1) continue;

    if (result.duration_ms === 0 && result.success) {
      // Was already there
      existing++;
      manifest.repos[idx].local_path = result.local_path;
      manifest.repos[idx].pinned_commit = result.pinned_commit;
      manifest.repos[idx].preflight_status = "ready";
    } else if (result.success) {
      cloned++;
      manifest.repos[idx].local_path = result.local_path;
      manifest.repos[idx].pinned_commit = result.pinned_commit;
      manifest.repos[idx].preflight_status = "ready";
      manifest.repos[idx].clone_duration_ms = result.duration_ms;
    } else {
      skipped++;
      manifest.repos[idx].preflight_status = result.skip_reason ?? "preflight_skip_unknown";
      manifest.repos[idx].skip_reason = result.skip_reason;
      manifest.repos[idx].clone_duration_ms = result.duration_ms || undefined;
    }

    // Save after each repo in case of interruption
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  }

  log(`\n=== Step 1 Complete ===`);
  log(`Cloned:   ${cloned}`);
  log(`Existing: ${existing}`);
  log(`Skipped:  ${skipped}`);
  log(`\nManifest updated: ${MANIFEST_PATH}`);

  const readyCount = manifest.repos.filter((r: ManifestRepo) => r.preflight_status === "ready").length;
  log(`Total ready repos: ${readyCount}`);
}

main();
