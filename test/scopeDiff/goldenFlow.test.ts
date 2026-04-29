/**
 * P18.1: P17→P18 Golden Flow Test
 *
 * Proves that P17 scope export feeds directly into P18 scope diff validator
 * at the API level — not "coincidentally compatible" but contractually bound.
 *
 * Uses real P10 dogfood data: boundary graph + blast radius report.
 *
 * ref: P18.1
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

// P17 (producer)
import { buildScopedImplementationBoundaryPackage } from "../../src/scopedHandoff/scopedHandoffExporter.js";
import type { ScopedImplementationBoundaryPackage, RequiredTestsFile } from "../../src/scopedHandoff/types.js";

// P18 (consumer)
import { validateScopeDiff } from "../../src/scopeDiff/scopeDiffValidator.js";

// Shared types
import type { BoundaryGraph } from "../../src/boundary/boundaryTypes.js";
import type { BlastRadiusReport } from "../../src/boundary/blastRadius.js";

// ---------------------------------------------------------------------------
// Fixtures: build P17 scope from real P10 data
// ---------------------------------------------------------------------------

const DATA_BASE = resolve(__dirname, "../../data/dogfood/p10");

let scope: ScopedImplementationBoundaryPackage;
let scopeHash: string;
let requiredTestsFile: RequiredTestsFile;
let requiredTestsHash: string;

beforeAll(() => {
  const graph: BoundaryGraph = JSON.parse(
    readFileSync(resolve(DATA_BASE, "boundary/boundary_graph.json"), "utf-8")
  );
  const report: BlastRadiusReport = JSON.parse(
    readFileSync(resolve(DATA_BASE, "boundary/blast_radius_report.json"), "utf-8")
  );

  // P17: build scope package
  scope = buildScopedImplementationBoundaryPackage({
    handoffPackageHash: "sha256:goldenflow",
    boundaryGraph: graph,
    blastRadiusReport: report,
    options: { locale: "en", scopeLabel: "golden_flow", extraForbiddenPatterns: ["ui/**"] },
  });

  // Compute scope hash (same as P17 CLI does)
  const scopeJson = JSON.stringify(scope);
  scopeHash = createHash("sha256").update(scopeJson).digest("hex").slice(0, 16);

  // Build required-tests file (same as P17 CLI does)
  requiredTestsFile = {
    scope_id: scope.scope_id,
    source_scope_hash: scopeHash,
    generated_at: scope.created_at,
    required_tests: scope.required_tests,
  };
  requiredTestsHash = createHash("sha256")
    .update(JSON.stringify(requiredTestsFile))
    .digest("hex")
    .slice(0, 16);
});

// ===========================================================================
// Golden Flow: P17 scope → P18 validator
// ===========================================================================

describe("P17→P18 Golden Flow", () => {
  // Scenario 1: PASS
  it("Scenario 1: allowed files + tests pass + human review → pass", () => {
    // Pick a file that P17 actually exports as allowed
    const allowedFile = scope.allowed_files[0]?.path;
    expect(allowedFile).toBeDefined();

    const result = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        changed_files: [allowedFile!],
        test_results: scope.required_tests.map(t => ({
          test_id: t.test_id,
          status: "passed" as const,
        })),
        human_review: {
          provided: true,
          reviewer_id: "golden_flow_operator",
          rationale: "Golden flow test — reviewed and approved.",
        },
      },
      scopeHash,
      requiredTestsHash,
    });

    expect(result.status).toBe("pass");
    expect(result.violations.length).toBe(0);
    expect(result.summary.changed_files).toBe(1);
  });

  // Scenario 2: OUTSIDE SCOPE → requires_reverse_issue
  it("Scenario 2: outside-scope file → requires_reverse_issue", () => {
    const result = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        changed_files: ["SomeRandomModuleNotInScope.kt"],
        test_results: scope.required_tests.map(t => ({
          test_id: t.test_id,
          status: "passed" as const,
        })),
        human_review: {
          provided: true,
          reviewer_id: "golden_flow_operator",
          rationale: "Golden flow test — reviewed and approved.",
        },
      },
      scopeHash,
      requiredTestsHash,
    });

    expect(result.status).toBe("requires_reverse_issue");
    expect(result.violations.some(v => v.violation_type === "outside_allowed_files")).toBe(true);
    expect(result.required_actions.length).toBeGreaterThan(0);
    expect(result.blocking_reasons.some(r => r.includes("SomeRandomModuleNotInScope"))).toBe(true);
  });

  // Scenario 3: MISSING TESTS → fail
  it("Scenario 3: allowed files + no test results → fail", () => {
    const allowedFile = scope.allowed_files[0]?.path;
    expect(allowedFile).toBeDefined();

    const result = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        changed_files: [allowedFile!],
        test_results: [], // no results at all
        human_review: {
          provided: true,
          reviewer_id: "golden_flow_operator",
          rationale: "Golden flow test — reviewed and approved.",
        },
      },
      scopeHash,
      requiredTestsHash,
    });

    // Status should be fail or requires_reverse_issue (depends on how many tests)
    expect(["fail", "requires_reverse_issue"]).toContain(result.status);
    expect(result.violations.some(v => v.violation_type === "required_test_missing")).toBe(true);
  });

  // Scenario 4: HASH BINDING TAMPER → fail
  it("Scenario 4: tampered required-tests.json → scope_mismatch fail", () => {
    const allowedFile = scope.allowed_files[0]?.path;
    expect(allowedFile).toBeDefined();

    // Tamper: use a fake scope hash
    const tamperedFile: RequiredTestsFile = {
      ...requiredTestsFile,
      source_scope_hash: "tampered_hash_value",
    };

    const result = validateScopeDiff({
      scope,
      requiredTestsFile: tamperedFile,
      request: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        changed_files: [allowedFile!],
        test_results: scope.required_tests.map(t => ({
          test_id: t.test_id,
          status: "passed" as const,
        })),
        human_review: {
          provided: true,
          reviewer_id: "golden_flow_operator",
          rationale: "Golden flow test.",
        },
      },
      scopeHash,
      requiredTestsHash: createHash("sha256")
        .update(JSON.stringify(tamperedFile))
        .digest("hex")
        .slice(0, 16),
    });

    expect(result.status).toBe("fail");
    expect(
      result.violations.some(v => v.violation_type === "required_tests_scope_mismatch")
    ).toBe(true);
  });

  // Scenario 5: PROTOCOL FILE → requires_reverse_issue
  it("Scenario 5: .pantheon/ protocol file modification → requires_reverse_issue", () => {
    const result = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        changed_files: [".pantheon/scope.json"],
        test_results: scope.required_tests.map(t => ({
          test_id: t.test_id,
          status: "passed" as const,
        })),
        human_review: {
          provided: true,
          reviewer_id: "golden_flow_operator",
          rationale: "Golden flow test.",
        },
      },
      scopeHash,
      requiredTestsHash,
    });

    expect(result.status).toBe("requires_reverse_issue");
    expect(result.violations.some(v => v.violation_type === "protocol_file_modified")).toBe(true);
  });
});
