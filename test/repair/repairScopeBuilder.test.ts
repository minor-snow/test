import { describe, expect, it } from "vitest";
import { buildRepairScope } from "../../src/repair/repairScopeBuilder.js";
import type { RepairImpactSurface, RepairSuspectSurface } from "../../src/repair/types.js";
import type { RepoObservations } from "../../src/repoObservation/types.js";
import type { PythonObservationSidecar } from "../../src/repoObservation/python/types.js";
import type { TypeScriptObservationSidecar } from "../../src/repoObservation/typescript/types.js";

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
      test_mappings: [],
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

describe("repairScopeBuilder", () => {
  it("places suspect files into allowed", () => {
    const suspectSurface: RepairSuspectSurface = {
      files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Suspect", evidence: ["explicit"] }],
      reason: "test",
    };
    const impactSurface: RepairImpactSurface = {
      evidence_level: "bootstrap_conservative",
      direct_files: [],
      related_files: [],
      related_tests: [],
      risk_areas: [],
      unknowns: [],
    };

    const result = buildRepairScope({
      suspectSurface,
      impactSurface,
      observations: makeObservations(["src/utils/format.ts"]),
      pythonSidecar: null,
      protectedPatterns: [],
    });

    expect(result.allowed.some(e => e.pattern === "src/utils/format.ts")).toBe(true);
  });

  it("places risk areas into forbidden when bucket is forbidden", () => {
    const suspectSurface: RepairSuspectSurface = { files: [], reason: "test" };
    const impactSurface: RepairImpactSurface = {
      evidence_level: "bootstrap_conservative",
      direct_files: [],
      related_files: [],
      related_tests: [],
      risk_areas: [{
        label: "secrets",
        pattern: "src/config/secrets.ts",
        bucket: "forbidden",
        severity: "critical",
        source: "repo_sensitive_path",
        reason: "Secret file detected",
        evidence: ["sensitive:secrets"],
        matched_paths: ["src/config/secrets.ts"],
      }],
      unknowns: [],
    };

    const result = buildRepairScope({
      suspectSurface,
      impactSurface,
      observations: makeObservations(["src/config/secrets.ts", "src/utils/format.ts"]),
      pythonSidecar: null,
      protectedPatterns: [],
    });

    expect(result.forbidden.some(e => e.pattern === "src/config/secrets.ts")).toBe(true);
    expect(result.forbidden.find(e => e.pattern === "src/config/secrets.ts")!.audit_weight).toBe("critical");
  });

  it("prevents same pattern from being both allowed and review_required (precedence)", () => {
    const suspectSurface: RepairSuspectSurface = {
      files: [{ path: "src/auth/login.ts", confidence: "high", reason: "Suspect", evidence: ["explicit"] }],
      reason: "test",
    };
    const impactSurface: RepairImpactSurface = {
      evidence_level: "bootstrap_conservative",
      direct_files: [],
      related_files: [{ path: "src/auth/login.ts", confidence: "medium", reason: "Auth-related", evidence: ["test"] }],
      related_tests: [],
      risk_areas: [],
      unknowns: [],
    };

    const result = buildRepairScope({
      suspectSurface,
      impactSurface,
      observations: makeObservations(["src/auth/login.ts", "src/utils/format.ts"]),
      pythonSidecar: null,
      protectedPatterns: [],
    });

    // auth files go to review_required via classifyRelatedFileEntry, not allowed
    expect(result.allowed.some(e => e.pattern === "src/auth/login.ts")).toBe(false);
    expect(result.review_required.some(e => e.pattern === "src/auth/login.ts")).toBe(true);
  });

  it("includes default protected patterns in forbidden", () => {
    const suspectSurface: RepairSuspectSurface = { files: [], reason: "test" };
    const impactSurface: RepairImpactSurface = {
      evidence_level: "bootstrap_conservative",
      direct_files: [],
      related_files: [],
      related_tests: [],
      risk_areas: [],
      unknowns: [],
    };

    const result = buildRepairScope({
      suspectSurface,
      impactSurface,
      observations: makeObservations(["src/utils/format.ts"]),
      pythonSidecar: null,
      protectedPatterns: ["src/config/**"],
    });

    expect(result.forbidden.some(e => e.pattern === ".pantheon/**")).toBe(true);
    expect(result.forbidden.some(e => e.pattern === "src/config/**")).toBe(true);
  });

  it("ensures all forbidden entries have critical audit_weight", () => {
    const suspectSurface: RepairSuspectSurface = { files: [], reason: "test" };
    const impactSurface: RepairImpactSurface = {
      evidence_level: "bootstrap_conservative",
      direct_files: [],
      related_files: [],
      related_tests: [],
      risk_areas: [{
        label: "migration",
        pattern: "src/db/migrations/**",
        bucket: "forbidden",
        severity: "critical",
        source: "repo_sensitive_path",
        reason: "Migration files",
        evidence: ["sensitive:migration"],
        matched_paths: ["src/db/migrations/001.sql"],
      }],
      unknowns: [],
    };

    const result = buildRepairScope({
      suspectSurface,
      impactSurface,
      observations: makeObservations(["src/db/migrations/001.sql"]),
      pythonSidecar: null,
      protectedPatterns: [],
    });

    for (const entry of result.forbidden) {
      expect(entry.audit_weight).toBe("critical");
    }
  });

  describe("Sidecar Integrations", () => {
    it("merges python sidecar suggestions", () => {
      const suspectSurface: RepairSuspectSurface = { files: [], reason: "test" };
      const impactSurface: RepairImpactSurface = {
        evidence_level: "bootstrap_conservative",
        direct_files: [],
        related_files: [],
        related_tests: [],
        risk_areas: [],
        unknowns: [],
      };
      
      const pythonSidecar = {
        risk_preset_validation: {
          confidence: "high" as const,
          suggested_review: [{ pattern: "pyproject.toml", severity: "high", reason: "config", matched_path_count: 1, evidence: [] }],
          suggested_forbidden: [{ pattern: "alembic/**", severity: "critical", reason: "migration", matched_path_count: 1, evidence: [] }]
        }
      } as PythonObservationSidecar;

      const result = buildRepairScope({
        suspectSurface,
        impactSurface,
        observations: makeObservations(["pyproject.toml", "alembic/env.py"]),
        pythonSidecar,
        protectedPatterns: [],
      });

      expect(result.review_required.some(e => e.pattern === "pyproject.toml")).toBe(true);
      expect(result.forbidden.some(e => e.pattern === "alembic/**")).toBe(true);
    });

    it("merges typescript sidecar suggestions", () => {
      const suspectSurface: RepairSuspectSurface = { files: [], reason: "test" };
      const impactSurface: RepairImpactSurface = {
        evidence_level: "bootstrap_conservative",
        direct_files: [],
        related_files: [],
        related_tests: [],
        risk_areas: [],
        unknowns: [],
      };
      
      const typescriptSidecar = {
        risk_preset_validation: {
          confidence: "high" as const,
          suggested_review: [{ pattern: "package.json", severity: "high", reason: "config", matched_path_count: 1, evidence: [] }],
          suggested_forbidden: [{ pattern: "dist/**", severity: "critical", reason: "generated", matched_path_count: 1, evidence: [] }]
        }
      } as TypeScriptObservationSidecar;

      const result = buildRepairScope({
        suspectSurface,
        impactSurface,
        observations: makeObservations(["package.json", "dist/index.js"]),
        pythonSidecar: null,
        typescriptSidecar,
        protectedPatterns: [],
      });

      expect(result.review_required.some(e => e.pattern === "package.json")).toBe(true);
      expect(result.forbidden.some(e => e.pattern === "dist/**")).toBe(true);
    });

    it("coexists deterministically when both sidecars are present", () => {
      const suspectSurface: RepairSuspectSurface = { files: [], reason: "test" };
      const impactSurface: RepairImpactSurface = {
        evidence_level: "bootstrap_conservative",
        direct_files: [],
        related_files: [],
        related_tests: [],
        risk_areas: [],
        unknowns: [],
      };
      
      const pythonSidecar = {
        risk_preset_validation: {
          confidence: "high" as const,
          suggested_review: [{ pattern: "pyproject.toml", severity: "high", reason: "config", matched_path_count: 1, evidence: [] }],
          suggested_forbidden: []
        }
      } as PythonObservationSidecar;

      const typescriptSidecar = {
        risk_preset_validation: {
          confidence: "high" as const,
          suggested_review: [{ pattern: "package.json", severity: "high", reason: "config", matched_path_count: 1, evidence: [] }],
          suggested_forbidden: []
        }
      } as TypeScriptObservationSidecar;

      const result = buildRepairScope({
        suspectSurface,
        impactSurface,
        observations: makeObservations(["package.json", "pyproject.toml"]),
        pythonSidecar,
        typescriptSidecar,
        protectedPatterns: [],
      });

      expect(result.review_required.some(e => e.pattern === "package.json")).toBe(true);
      expect(result.review_required.some(e => e.pattern === "pyproject.toml")).toBe(true);
    });
  });
});
