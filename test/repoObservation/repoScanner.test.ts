import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanRepo } from "../../src/repoObservation/repoScanner.js";
import { validateRepoObservations } from "../../src/repoObservation/repoObservationValidator.js";

const FIXTURE_ROOT = join(import.meta.dirname, "..", "fixtures", "repo_fixture");

describe("scanRepo", () => {
  it("scans fixture repo and produces valid observations", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.schema_version).toBe("repo_observations.v1");
    expect(obs.scanner.llm_used).toBe(false);
    expect(obs.scanner.mode).toBe("deterministic");
    expect(obs.observations.files.length).toBeGreaterThan(0);
  });

  it("all paths are repo-relative POSIX", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    for (const f of obs.observations.files) {
      expect(f.path).not.toMatch(/\\/);
      expect(f.path).not.toMatch(/^[A-Z]:/);
      expect(f.path).not.toMatch(/^\//);
    }
  });

  it("excludes node_modules if present", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    const nodeModFile = obs.observations.files.find(f => f.path.includes("node_modules"));
    expect(nodeModFile).toBeUndefined();
  });

  it("classifies src files correctly", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    const srcFiles = obs.observations.files.filter(f => f.bucket === "src");
    expect(srcFiles.length).toBeGreaterThan(0);
    expect(srcFiles.some(f => f.path.includes("auth/login.ts"))).toBe(true);
  });

  it("classifies test files correctly", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    const testFiles = obs.observations.files.filter(f => f.bucket === "test");
    expect(testFiles.length).toBeGreaterThan(0);
  });

  it("extracts import edges from TS files", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.observations.import_edges.length).toBeGreaterThan(0);
    const workerEdge = obs.observations.import_edges.find(
      e => e.from_file.includes("worker.ts") && e.raw_specifier === "./queue.js",
    );
    expect(workerEdge).toBeDefined();
  });

  it("detects dynamic imports as unknowns", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.unknowns.dynamic_imports.length).toBeGreaterThanOrEqual(1);
  });

  it("builds path buckets", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.observations.path_buckets.length).toBeGreaterThan(0);
    const srcBucket = obs.observations.path_buckets.find(b => b.bucket === "src");
    expect(srcBucket).toBeDefined();
    expect(srcBucket!.count).toBeGreaterThan(0);
  });

  it("produces test mappings", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.observations.test_mappings.length).toBeGreaterThan(0);
  });

  it("detects sensitive paths", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.observations.sensitive_paths.length).toBeGreaterThan(0);
    const authPath = obs.observations.sensitive_paths.find(s => s.path.includes("auth"));
    expect(authPath).toBeDefined();
  });

  it("parses CODEOWNERS hints", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.observations.owner_hints.length).toBeGreaterThan(0);
  });

  it("collects config hints with typed fields", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.observations.config_hints.length).toBeGreaterThan(0);
    const pkgHint = obs.observations.config_hints.find(c => c.kind === "package_json");
    expect(pkgHint).toBeDefined();
    expect(pkgHint!.detected_fields.length).toBeGreaterThan(0);
    // Verify no open Record — detected_fields is an array of ConfigDetectedField
    for (const f of pkgHint!.detected_fields) {
      expect(typeof f.field_name).toBe("string");
      expect(typeof f.field_value_preview).toBe("string");
    }
  });

  it("produces a deterministic observation_hash", () => {
    const obs1 = scanRepo({ repoRoot: FIXTURE_ROOT });
    const obs2 = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs1.meta.observation_hash).toBe(obs2.meta.observation_hash);
  });

  it("records repo_state for non-git fixture", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    // Fixture repo is not a git repo
    expect(obs.repo.repo_state).toBe("working_tree_only");
    expect(obs.repo.head_commit_hash).toBeNull();
    expect(obs.repo.has_uncommitted_changes).toBeNull();
  });

  it("records unmapped sources", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    // src/unmapped/noTest.ts has no corresponding test
    expect(obs.unknowns.unmapped_sources.length).toBeGreaterThan(0);
  });

  it("validates against its own validator", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    const result = validateRepoObservations(obs);
    expect(result.status).toBe("valid");
    expect(result.errors).toHaveLength(0);
  });

  it("respects custom limits", () => {
    const obs = scanRepo({
      repoRoot: FIXTURE_ROOT,
      config: { limits: { max_total_files: 3 } },
    });
    expect(obs.observations.files.length).toBeLessThanOrEqual(3);
  });

  // BUG-072: undeclared package imports classified correctly via package.json
  it("classifies undeclared packages via package dependency classifier (BUG-072)", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    // worker.ts has: const retry = require("retry-lib") → undeclared_package (not in fixture package.json)
    const retryEdge = obs.observations.import_edges.find(e => e.raw_specifier === "retry-lib");
    expect(retryEdge).toBeDefined();
    expect(retryEdge!.resolution_status).toBe("undeclared_package");
    // undeclared_package is tracked in quality.taxonomy.actionable, not in unknowns.unresolved_imports
    expect(obs.quality.taxonomy.actionable.undeclared_packages.length).toBeGreaterThan(0);
  });

  // BUG-072: unresolved_imports count is included in unknown_count
  it("unknown_count includes unresolved_imports (BUG-072)", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    // unknown_count must be >= unresolved_imports.length
    expect(obs.meta.unknown_count).toBeGreaterThanOrEqual(obs.unknowns.unresolved_imports.length);
  });

  // BUG-073: scan_limit_exceeded must populate when max_total_files is hit
  it("populates scan_limit_exceeded when max_total_files is hit (BUG-073)", () => {
    const obs = scanRepo({
      repoRoot: FIXTURE_ROOT,
      config: { limits: { max_total_files: 3 } },
    });
    expect(obs.meta.partial_scan).toBe(true);
    expect(obs.unknowns.scan_limit_exceeded.length).toBeGreaterThan(0);
  });

  // BUG-073: scan_limit_exceeded is empty for a full scan
  it("scan_limit_exceeded is empty when no limit is hit", () => {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    expect(obs.unknowns.scan_limit_exceeded).toHaveLength(0);
  });
});
