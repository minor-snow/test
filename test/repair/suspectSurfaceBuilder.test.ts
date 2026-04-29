import { describe, expect, it } from "vitest";
import { buildSuspectSurface } from "../../src/repair/suspectSurfaceBuilder.js";
import type { BugFinding, UserBugReport } from "../../src/repair/types.js";
import type { RepoObservations, ObservedFile, FileBucket } from "../../src/repoObservation/types.js";

function makeObservedFile(path: string, bucket: FileBucket = "src"): ObservedFile {
  return {
    path,
    bucket,
    language: "typescript",
    size_bytes: 100,
    analysis_status: "analyzed",
    evidence: [],
  };
}

function makeObservations(filePaths: string[]): RepoObservations {
  return {
    schema_version: "repo_observations.v1",
    repo: { repo_root_label: "test", repo_state: "git_clean", head_commit_hash: "abc", has_uncommitted_changes: false, uncommitted_file_count: 0, scanned_at: new Date().toISOString() },
    scanner: { scanner_version: "test", mode: "deterministic", language_targets: ["typescript"], llm_used: false },
    limits: { max_file_bytes: 1000000, max_total_files: 10000, max_import_edges: 5000, scan_timeout_ms: 60000, excluded_dirs: [] },
    observations: {
      files: filePaths.map(p => makeObservedFile(p)),
      path_buckets: [],
      import_edges: [],
      test_mappings: [
        { source_path: "src/utils/format.ts", test_path: "tests/utils/format.test.ts", mapping_kind: "same_basename", confidence: "high", evidence: [] },
      ],
      sensitive_paths: [],
      owner_hints: [],
      config_hints: [],
      package_manifests: [],
    },
    unknowns: { skipped_large_files: [], unsupported_files: [], dynamic_imports: [], unresolved_imports: [], unmapped_sources: [], unmapped_tests: [], ambiguous_test_mappings: [], scan_limit_exceeded: [], owner_patterns_unresolved: [], changed_files_not_observed: [] },
    excluded: [],
    quality: { raw_unknown_count: 0, raw_unknown_ratio: 0, out_of_scope_count: 0, out_of_scope_ratio: 0, actionable_count: 0, actionable_ratio: 0, intrinsic_count: 0, intrinsic_ratio: 0, unknown_bucket_file_count: 0, undeclared_package_count: 0, taxonomy: { out_of_scope: { unsupported_files: [] }, actionable: { unmapped_sources: [], unmapped_tests: [], undeclared_packages: [], unresolved_aliases: [], unknown_packages: [], owner_patterns_unresolved: [] }, intrinsic: { dynamic_imports: [], skipped_large_files: [], scan_limit_exceeded: [] } } },
    meta: { observation_hash: "obs", partial_scan: false, file_count: filePaths.length, unknown_count: 0, excluded_count: 0 },
  };
}

function makeFinding(overrides?: Partial<BugFinding>): BugFinding {
  return {
    schema_version: "bug_finding@0.1.0",
    finding_id: "finding_test",
    source_report_id: "report_test",
    status: "accepted",
    limitation: "test",
    confirmed_facts: ["src/utils/format.ts exists"],
    unverified_claims: [],
    invalid_references: [],
    evidence_quality: "medium",
    next_action: "repair_analysis",
    ...overrides,
  };
}

describe("suspectSurfaceBuilder", () => {
  it("includes explicit suspect files as direct surface", () => {
    const report: UserBugReport = {
      schema_version: "user_bug_report@0.1.0",
      report_id: "r1",
      reported_by: { operator_id: "user" },
      summary: "Fix formatting",
      evidence: [],
      suspected_files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Formatting module" }],
      requested_action: "repair_analysis",
      must_preserve: [],
    };

    const result = buildSuspectSurface({
      report,
      finding: makeFinding(),
      observations: makeObservations(["src/utils/format.ts", "src/auth/login.ts"]),
    });

    expect(result.files.some(f => f.path === "src/utils/format.ts")).toBe(true);
    expect(result.files.find(f => f.path === "src/utils/format.ts")!.confidence).toBe("high");
  });

  it("maps failing tests to source files via test_mapping", () => {
    const report: UserBugReport = {
      schema_version: "user_bug_report@0.1.0",
      report_id: "r2",
      reported_by: { operator_id: "user" },
      summary: "Fix formatting bug",
      evidence: [{ kind: "failing_test", path: "tests/utils/format.test.ts" }],
      suspected_files: [],
      requested_action: "repair_analysis",
      must_preserve: [],
    };

    const result = buildSuspectSurface({
      report,
      finding: makeFinding({ confirmed_facts: ["tests/utils/format.test.ts exists"] }),
      observations: makeObservations(["src/utils/format.ts", "tests/utils/format.test.ts"]),
    });

    expect(result.files.some(f => f.path === "src/utils/format.ts")).toBe(true);
    expect(result.files.find(f => f.path === "src/utils/format.ts")!.evidence).toContain("test_mapping");
  });

  it("does not include paths not present in observations", () => {
    const report: UserBugReport = {
      schema_version: "user_bug_report@0.1.0",
      report_id: "r3",
      reported_by: { operator_id: "user" },
      summary: "Fix missing module",
      evidence: [],
      suspected_files: [{ path: "src/does/not/exist.ts", confidence: "high", reason: "Unknown module" }],
      requested_action: "repair_analysis",
      must_preserve: [],
    };

    const result = buildSuspectSurface({
      report,
      finding: makeFinding({ confirmed_facts: [] }),
      observations: makeObservations(["src/utils/format.ts"]),
    });

    expect(result.files).toHaveLength(0);
  });

  it("falls back to confirmed_facts paths when no suspect files match", () => {
    const report: UserBugReport = {
      schema_version: "user_bug_report@0.1.0",
      report_id: "r4",
      reported_by: { operator_id: "user" },
      summary: "Fix something",
      evidence: [],
      suspected_files: [],
      requested_action: "repair_analysis",
      must_preserve: [],
    };

    const result = buildSuspectSurface({
      report,
      finding: makeFinding({ confirmed_facts: ["src/utils/format.ts exists"] }),
      observations: makeObservations(["src/utils/format.ts"]),
    });

    expect(result.files.some(f => f.path === "src/utils/format.ts")).toBe(true);
    expect(result.files.find(f => f.path === "src/utils/format.ts")!.confidence).toBe("low");
  });
});
