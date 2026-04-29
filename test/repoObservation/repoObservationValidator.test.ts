import { describe, it, expect } from "vitest";
import { validateRepoObservations } from "../../src/repoObservation/repoObservationValidator.js";
import type { RepoObservations } from "../../src/repoObservation/types.js";
import { computeObservationHash } from "../../src/repoObservation/observationHasher.js";

function makeValidObservations(): RepoObservations {
  const base: RepoObservations = {
    schema_version: "repo_observations.v1",
    repo: {
      repo_root_label: "test",
      repo_state: "git_clean",
      head_commit_hash: "abc",
      has_uncommitted_changes: false,
      uncommitted_file_count: 0,
      scanned_at: "2026-01-01T00:00:00Z",
    },
    scanner: { scanner_version: "0.1.0", mode: "deterministic", language_targets: ["typescript", "javascript"], llm_used: false },
    limits: { max_file_bytes: 524288, max_total_files: 10000, max_import_edges: 50000, scan_timeout_ms: 60000, excluded_dirs: [] },
    observations: {
      files: [{ path: "src/foo.ts", bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] }],
      path_buckets: [{ bucket: "src", paths: ["src/foo.ts"], count: 1 }],
      import_edges: [],
      test_mappings: [],
      sensitive_paths: [],
      owner_hints: [],
      config_hints: [],
      package_manifests: [],
    },
    unknowns: {
      skipped_large_files: [], unsupported_files: [], dynamic_imports: [], unresolved_imports: [],
      unmapped_sources: [], unmapped_tests: [], ambiguous_test_mappings: [],
      scan_limit_exceeded: [], owner_patterns_unresolved: [], changed_files_not_observed: [],
    },
    excluded: [],
    quality: {
      raw_unknown_count: 0, raw_unknown_ratio: 0,
      out_of_scope_count: 0, out_of_scope_ratio: 0,
      actionable_count: 0, actionable_ratio: 0,
      intrinsic_count: 0, intrinsic_ratio: 0,
      unknown_bucket_file_count: 0, undeclared_package_count: 0,
      taxonomy: {
        out_of_scope: { unsupported_files: [] },
        actionable: { unmapped_sources: [], unmapped_tests: [], undeclared_packages: [], unresolved_aliases: [], unknown_packages: [], owner_patterns_unresolved: [] },
        intrinsic: { dynamic_imports: [], skipped_large_files: [], scan_limit_exceeded: [] },
      },
    },
    meta: { observation_hash: "", partial_scan: false, file_count: 1, unknown_count: 0, excluded_count: 0 },
  };
  const hash = computeObservationHash(base);
  return { ...base, meta: { ...base.meta, observation_hash: hash } };
}

describe("validateRepoObservations", () => {
  it("valid observations pass", () => {
    const result = validateRepoObservations(makeValidObservations());
    expect(result.status).toBe("valid");
    expect(result.errors).toHaveLength(0);
  });

  it("rejects invalid schema_version", () => {
    const obs = { ...makeValidObservations(), schema_version: "wrong" as any };
    const result = validateRepoObservations(obs);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("schema_version"))).toBe(true);
  });

  it("rejects llm_used true", () => {
    const obs = makeValidObservations();
    const patched = { ...obs, scanner: { ...obs.scanner, llm_used: true as any } };
    const result = validateRepoObservations(patched);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("llm_used"))).toBe(true);
  });

  it("rejects absolute file path", () => {
    const obs = makeValidObservations();
    const patched = {
      ...obs,
      observations: {
        ...obs.observations,
        files: [{ ...obs.observations.files[0], path: "/absolute/path.ts" }],
      },
    };
    const result = validateRepoObservations(patched);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("not repo-relative"))).toBe(true);
  });

  it("rejects escaping file path", () => {
    const obs = makeValidObservations();
    const patched = {
      ...obs,
      observations: {
        ...obs.observations,
        files: [{ ...obs.observations.files[0], path: "../escape.ts" }],
      },
    };
    const result = validateRepoObservations(patched);
    expect(result.status).toBe("invalid");
  });

  it("rejects missing observation_hash", () => {
    const obs = makeValidObservations();
    const patched = { ...obs, meta: { ...obs.meta, observation_hash: "" } };
    const result = validateRepoObservations(patched);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("observation_hash"))).toBe(true);
  });

  it("rejects hash mismatch", () => {
    const obs = makeValidObservations();
    const patched = { ...obs, meta: { ...obs.meta, observation_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" } };
    const result = validateRepoObservations(patched);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("mismatch"))).toBe(true);
  });

  it("rejects empty files when not partial_scan", () => {
    const obs = makeValidObservations();
    const hash = computeObservationHash({
      ...obs,
      observations: { ...obs.observations, files: [] },
      meta: { ...obs.meta, file_count: 0 },
    });
    const patched = {
      ...obs,
      observations: { ...obs.observations, files: [] },
      meta: { ...obs.meta, file_count: 0, observation_hash: hash },
    };
    const result = validateRepoObservations(patched);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("empty"))).toBe(true);
  });

  it("rejects sensitive path without evidence", () => {
    const obs = makeValidObservations();
    const patched = {
      ...obs,
      observations: {
        ...obs.observations,
        sensitive_paths: [{ path: "src/auth/x.ts", reason: "auth_keyword" as const, review_required: true, evidence: [] }],
      },
    };
    // Need to recompute hash
    const hash = computeObservationHash(patched);
    const final = { ...patched, meta: { ...patched.meta, observation_hash: hash } };
    const result = validateRepoObservations(final);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("evidence"))).toBe(true);
  });

  it("rejects invalid repo_state", () => {
    const obs = makeValidObservations();
    const patched = { ...obs, repo: { ...obs.repo, repo_state: "invalid" as any } };
    const result = validateRepoObservations(patched);
    expect(result.status).toBe("invalid");
  });
});
