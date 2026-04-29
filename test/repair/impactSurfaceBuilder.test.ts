import { describe, expect, it } from "vitest";
import { buildImpactSurface } from "../../src/repair/impactSurfaceBuilder.js";
import type { BugFinding, RepairRelationEdge, RepairSourceReport, RepairSuspectSurface } from "../../src/repair/types.js";
import type { RepoObservations } from "../../src/repoObservation/types.js";

function makeObservations(paths: string[]): RepoObservations {
  return {
    schema_version: "repo_observations.v1",
    repo: { repo_root_label: "test", repo_state: "git_clean", head_commit_hash: "abc", has_uncommitted_changes: false, uncommitted_file_count: 0, scanned_at: new Date().toISOString() },
    scanner: { scanner_version: "test", mode: "deterministic", language_targets: ["typescript"], llm_used: false },
    limits: { max_file_bytes: 1000000, max_total_files: 10000, max_import_edges: 5000, scan_timeout_ms: 60000, excluded_dirs: [] },
    observations: {
      files: paths.map(p => ({ path: p, bucket: "src" as const, language: "typescript" as const, size_bytes: 100, analysis_status: "analyzed" as const, evidence: [] })),
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
    meta: { observation_hash: "obs", partial_scan: false, file_count: paths.length, unknown_count: 0, excluded_count: 0 },
  };
}

function makeFinding(): BugFinding {
  return {
    schema_version: "bug_finding@0.1.0",
    finding_id: "f_test",
    source_report_id: "r_test",
    status: "accepted",
    limitation: "test",
    confirmed_facts: ["src/utils/format.ts exists"],
    unverified_claims: [],
    invalid_references: [],
    evidence_quality: "medium",
    next_action: "repair_analysis",
  };
}

describe("impactSurfaceBuilder", () => {
  it("includes direct files from suspect surface", () => {
    const report: RepairSourceReport = {
      schema_version: "user_bug_report@0.1.0",
      report_id: "r1",
      reported_by: { operator_id: "user" },
      summary: "Fix formatting",
      observed_behavior: "bug",
      expected_behavior: "correct",
      evidence: [],
      suspected_files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Format module" }],
      requested_action: "repair_analysis",
      must_preserve: [],
    };
    const suspectSurface: RepairSuspectSurface = {
      files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Suspect", evidence: ["explicit"] }],
      reason: "test",
    };
    const relationGraph: RepairRelationEdge[] = [];

    const result = buildImpactSurface({
      report,
      finding: makeFinding(),
      suspectSurface,
      relationGraph,
      observations: makeObservations(["src/utils/format.ts", "tests/utils/format.test.ts"]),
      pythonSidecar: null,
    });

    expect(result.evidence_level).toBe("bootstrap_conservative");
    expect(result.direct_files.some(f => f.path === "src/utils/format.ts")).toBe(true);
  });

  it("emits unknowns when no related files are found", () => {
    const report: RepairSourceReport = {
      schema_version: "user_bug_report@0.1.0",
      report_id: "r2",
      reported_by: { operator_id: "user" },
      summary: "Fix isolated bug",
      observed_behavior: "bug",
      expected_behavior: "correct",
      evidence: [],
      suspected_files: [],
      requested_action: "repair_analysis",
      must_preserve: [],
    };
    const suspectSurface: RepairSuspectSurface = {
      files: [],
      reason: "test",
    };
    const relationGraph: RepairRelationEdge[] = [];

    const result = buildImpactSurface({
      report,
      finding: makeFinding(),
      suspectSurface,
      relationGraph,
      observations: makeObservations(["src/utils/format.ts"]),
      pythonSidecar: null,
    });

    expect(result.unknowns.some(u => u.kind === "missing_test_mapping")).toBe(true);
    expect(result.unknowns.some(u => u.kind === "unknown_related_surface")).toBe(true);
  });

  it("includes related_tests from relation graph edges", () => {
    const report: RepairSourceReport = {
      schema_version: "user_bug_report@0.1.0",
      report_id: "r3",
      reported_by: { operator_id: "user" },
      summary: "Fix bug",
      observed_behavior: "bug",
      expected_behavior: "correct",
      evidence: [],
      suspected_files: [],
      requested_action: "repair_analysis",
      must_preserve: [],
    };
    const suspectSurface: RepairSuspectSurface = {
      files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Suspect", evidence: ["explicit"] }],
      reason: "test",
    };
    const relationGraph: RepairRelationEdge[] = [
      {
        from: "src/utils/format.ts",
        to: "tests/utils/format.test.ts",
        relation: "test_mapping",
        confidence: "high",
        reason: "Test mapping",
        evidence: ["test_mapping:high"],
      },
    ];

    const result = buildImpactSurface({
      report,
      finding: makeFinding(),
      suspectSurface,
      relationGraph,
      observations: makeObservations(["src/utils/format.ts", "tests/utils/format.test.ts"]),
      pythonSidecar: null,
    });

    expect(result.related_tests.some(t => t.path === "tests/utils/format.test.ts")).toBe(true);
  });
});
