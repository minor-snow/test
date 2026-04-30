/**
 * P18 Tests: Scope Diff Validator
 *
 * Covers all 7 fixture scenarios plus unit tests for each subsystem.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { classifyChangedFile, classifyChangedFiles, normalizePath } from "../../src/scopeDiff/fileClassifier.js";
import { extractChangedFilesFromDiff } from "../../src/scopeDiff/diffParser.js";
import { validateRequiredTests } from "../../src/scopeDiff/testResultValidator.js";
import { validateHumanReview } from "../../src/scopeDiff/humanReviewValidator.js";
import { detectReverseIssueTriggers } from "../../src/scopeDiff/reverseIssueDetector.js";
import { validateScopeDiff } from "../../src/scopeDiff/scopeDiffValidator.js";
import { renderScopeDiffReportMarkdown } from "../../src/scopeDiff/scopeDiffReportRenderer.js";
import type { ScopedImplementationBoundaryPackage, RequiredTestsFile } from "../../src/scopedHandoff/types.js";
import { buildScopedImplementationBoundaryPackage } from "../../src/scopedHandoff/scopedHandoffExporter.js";
import type { BoundaryGraph } from "../../src/boundary/boundaryTypes.js";
import type { BlastRadiusReport } from "../../src/boundary/blastRadius.js";

// ---------------------------------------------------------------------------
// Load P10 fixtures
// ---------------------------------------------------------------------------

const DATA_BASE = resolve(__dirname, "../../data/dogfood/p10");

let graph: BoundaryGraph;
let report: BlastRadiusReport;
let scope: ScopedImplementationBoundaryPackage;
let scopeHash: string;
let requiredTestsFile: RequiredTestsFile;
let requiredTestsHash: string;

beforeAll(() => {
  graph = JSON.parse(readFileSync(resolve(DATA_BASE, "boundary/boundary_graph.json"), "utf-8"));
  report = JSON.parse(readFileSync(resolve(DATA_BASE, "boundary/blast_radius_report.json"), "utf-8"));

  scope = buildScopedImplementationBoundaryPackage({
    handoffPackageHash: "sha256:testfixture",
    boundaryGraph: graph,
    blastRadiusReport: report,
    options: { locale: "en", scopeLabel: "p18-test", extraForbiddenPatterns: ["ui/**", "navigation/**"] },
  });

  const scopeJson = JSON.stringify(scope);
  scopeHash = createHash("sha256").update(scopeJson).digest("hex").slice(0, 16);

  requiredTestsFile = {
    scope_id: scope.scope_id,
    source_scope_hash: scopeHash,
    generated_at: scope.created_at,
    required_tests: scope.required_tests,
  };
  requiredTestsHash = createHash("sha256").update(JSON.stringify(requiredTestsFile)).digest("hex").slice(0, 16);
});

// ============================================================
// File Classifier
// ============================================================

describe("fileClassifier", () => {
  it("classifies allowed exact file", () => {
    const result = classifyChangedFile("ConflictPolicy.kt", scope);
    expect(result.is_allowed).toBe(true);
    expect(result.is_forbidden).toBe(false);
    expect(result.is_protocol_file).toBe(false);
  });

  it("classifies outside file", () => {
    const result = classifyChangedFile("SomeRandomFile.kt", scope);
    expect(result.is_allowed).toBe(false);
    expect(result.is_forbidden).toBe(false);
    expect(result.reason).toContain("not in the allowed files");
  });

  it("classifies .pantheon/** as protocol file with high severity", () => {
    const result = classifyChangedFile(".pantheon/scope.json", scope);
    expect(result.is_protocol_file).toBe(true);
    expect(result.is_forbidden).toBe(true);
    expect(result.is_allowed).toBe(false);
  });

  it("classifies .cursor/** as protocol file", () => {
    const result = classifyChangedFile(".cursor/rules/pantheon-boundaries.md", scope);
    expect(result.is_protocol_file).toBe(true);
    expect(result.is_forbidden).toBe(true);
  });

  it("matches prefix/** patterns", () => {
    const result = classifyChangedFile("ui/TriageScreen.kt", scope);
    expect(result.is_forbidden).toBe(true);
    expect(result.matched_forbidden).toBe("ui/**");
  });

  it("normalizes slash direction", () => {
    expect(normalizePath("contracts\\Guards.kt")).toBe("contracts/Guards.kt");
    expect(normalizePath("./ConflictPolicy.kt")).toBe("ConflictPolicy.kt");
  });

  it("classifies generated boundary allowed with modify → allowed + generated boundary", () => {
    const result = classifyChangedFile("Enums.kt", scope);
    expect(result.is_allowed).toBe(true);
    expect(result.is_generated_boundary_file).toBe(true);
  });

  it("deduplicates in classifyChangedFiles", () => {
    const results = classifyChangedFiles(["ConflictPolicy.kt", "ConflictPolicy.kt", "./ConflictPolicy.kt"], scope);
    expect(results.length).toBe(1);
  });
});

// ============================================================
// Diff Parser
// ============================================================

describe("diffParser", () => {
  it("extracts from diff --git lines", () => {
    const diff = `diff --git a/ConflictPolicy.kt b/ConflictPolicy.kt
--- a/ConflictPolicy.kt
+++ b/ConflictPolicy.kt
@@ -1,3 +1,4 @@
+new line
diff --git a/Dtos.kt b/Dtos.kt
--- a/Dtos.kt
+++ b/Dtos.kt`;
    const result = extractChangedFilesFromDiff(diff);
    expect(result.changed_files).toContain("ConflictPolicy.kt");
    expect(result.changed_files).toContain("Dtos.kt");
    expect(result.changed_files.length).toBe(2);
  });

  it("deduplicates files", () => {
    const diff = `diff --git a/X.kt b/X.kt
diff --git a/X.kt b/X.kt`;
    const result = extractChangedFilesFromDiff(diff);
    expect(result.changed_files.length).toBe(1);
  });

  it("normalizes paths", () => {
    const diff = `diff --git a/contracts/Guards.kt b/contracts/Guards.kt`;
    const result = extractChangedFilesFromDiff(diff);
    expect(result.changed_files).toContain("contracts/Guards.kt");
  });

  it("handles empty diff with warning", () => {
    const result = extractChangedFilesFromDiff("");
    expect(result.changed_files.length).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles name-only style", () => {
    const diff = `ConflictPolicy.kt
Dtos.kt
Enums.kt`;
    const result = extractChangedFilesFromDiff(diff);
    expect(result.changed_files.length).toBe(3);
    expect(result.warnings.some(w => w.includes("name-only"))).toBe(true);
  });
});

// ============================================================
// Test Result Validator
// ============================================================

describe("testResultValidator", () => {
  it("passes when scope_id matches and all required tests pass", () => {
    const results = scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const }));
    const v = validateRequiredTests(requiredTestsFile, scope, results);
    expect(v.violations.length).toBe(0);
    expect(v.summary.required_tests_passed).toBe(scope.required_tests.length);
  });

  it("fails on scope_id mismatch", () => {
    const bad: RequiredTestsFile = { ...requiredTestsFile, scope_id: "wrong_scope" };
    const v = validateRequiredTests(bad, scope, []);
    expect(v.violations.length).toBe(1);
    expect(v.violations[0].violation_type).toBe("required_tests_scope_mismatch");
  });

  it("fails on missing test", () => {
    const v = validateRequiredTests(requiredTestsFile, scope, []);
    const missing = v.violations.filter(v => v.violation_type === "required_test_missing");
    expect(missing.length).toBe(scope.required_tests.length);
  });

  it("fails on failed test", () => {
    const results = scope.required_tests.map(t => ({ test_id: t.test_id, status: "failed" as const }));
    const v = validateRequiredTests(requiredTestsFile, scope, results);
    expect(v.violations.some(v => v.violation_type === "required_test_failed")).toBe(true);
  });

  it("treats skipped as missing", () => {
    const results = scope.required_tests.map(t => ({ test_id: t.test_id, status: "skipped" as const }));
    const v = validateRequiredTests(requiredTestsFile, scope, results);
    expect(v.violations.some(v => v.violation_type === "required_test_missing")).toBe(true);
  });

  it("treats not_run as missing", () => {
    const results = scope.required_tests.map(t => ({ test_id: t.test_id, status: "not_run" as const }));
    const v = validateRequiredTests(requiredTestsFile, scope, results);
    expect(v.violations.some(v => v.violation_type === "required_test_missing")).toBe(true);
  });

  it("warns on extra test results", () => {
    const results = [
      ...scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
      { test_id: "test:extra:XYZ", status: "passed" as const },
    ];
    const v = validateRequiredTests(requiredTestsFile, scope, results);
    expect(v.warnings.some(w => w.warning_type === "test_result_extra")).toBe(true);
  });

  it("respects treat_missing_tests_as_warning option", () => {
    const v = validateRequiredTests(requiredTestsFile, scope, [], { treat_missing_tests_as_warning: true });
    expect(v.violations.length).toBe(0);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it("fails on source_scope_hash mismatch", () => {
    const bad: RequiredTestsFile = { ...requiredTestsFile, source_scope_hash: "tampered_hash" };
    const results = scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const }));
    const v = validateRequiredTests(bad, scope, results, undefined, scopeHash);
    expect(v.violations.length).toBe(1);
    expect(v.violations[0].violation_type).toBe("required_tests_scope_mismatch");
    expect(v.violations[0].message).toContain("source_scope_hash");
  });

  it("passes when source_scope_hash matches", () => {
    const results = scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const }));
    const v = validateRequiredTests(requiredTestsFile, scope, results, undefined, scopeHash);
    expect(v.violations.length).toBe(0);
  });
});

// ============================================================
// Human Review Validator
// ============================================================

describe("humanReviewValidator", () => {
  it("passes when high-risk + review provided", () => {
    const v = validateHumanReview(scope, {
      provided: true,
      reviewer_id: "p10_operator",
      rationale: "Reviewed high-risk blast radius and confirmed safe.",
    });
    expect(v.violations.length).toBe(0);
  });

  it("fails when high-risk + missing review", () => {
    const v = validateHumanReview(scope);
    expect(v.violations.some(v => v.violation_type === "human_review_missing")).toBe(true);
  });

  it("fails when high-risk + review.provided = false", () => {
    const v = validateHumanReview(scope, { provided: false });
    expect(v.violations.some(v => v.violation_type === "human_review_missing")).toBe(true);
  });

  it("fails when reviewer_id missing", () => {
    const v = validateHumanReview(scope, { provided: true, rationale: "Reviewed and confirmed safe." });
    expect(v.violations.some(v => v.message.includes("reviewer_id"))).toBe(true);
  });

  it("fails when rationale empty", () => {
    const v = validateHumanReview(scope, { provided: true, reviewer_id: "op1", rationale: "" });
    expect(v.violations.some(v => v.message.includes("rationale"))).toBe(true);
  });

  it("warns when rationale too short", () => {
    const v = validateHumanReview(scope, { provided: true, reviewer_id: "op1", rationale: "OK" });
    expect(v.warnings.some(w => w.warning_type === "human_review_rationale_short")).toBe(true);
  });

  it("passes when low-risk + missing review", () => {
    const lowRisk = { ...scope, summary: { ...scope.summary, must_require_human_review: false } };
    const v = validateHumanReview(lowRisk);
    expect(v.violations.length).toBe(0);
  });
});

// ============================================================
// Reverse Issue Detector (unit)
// ============================================================

describe("reverseIssueDetector", () => {
  it("returns empty when no triggers", () => {
    const r = detectReverseIssueTriggers({
      fileClassifications: [{ file_path: "ConflictPolicy.kt", is_allowed: true, is_forbidden: false, is_protocol_file: false, is_generated_boundary_file: false, reason: "ok" }],
      fileViolations: [],
      testViolations: [],
      humanReviewViolations: [],
      scope,
    });
    expect(r.length).toBe(0);
  });

  it("triggers on outside files", () => {
    const r = detectReverseIssueTriggers({
      fileClassifications: [{ file_path: "Random.kt", is_allowed: false, is_forbidden: false, is_protocol_file: false, is_generated_boundary_file: false, reason: "outside" }],
      fileViolations: [],
      testViolations: [],
      humanReviewViolations: [],
      scope,
    });
    expect(r.length).toBe(1);
    expect(r[0].violation_type).toBe("reverse_issue_required");
  });

  it("triggers on generated boundary violations", () => {
    const r = detectReverseIssueTriggers({
      fileClassifications: [],
      fileViolations: [{ violation_id: "v_gen", violation_type: "generated_boundary_modified", severity: "medium", message: "test", required_action: "fix" }],
      testViolations: [],
      humanReviewViolations: [],
      scope,
    });
    expect(r.length).toBe(1);
    expect(r[0].severity).toBe("medium");
  });

  it("high severity when protocol files present", () => {
    const r = detectReverseIssueTriggers({
      fileClassifications: [{ file_path: ".pantheon/scope.json", is_allowed: false, is_forbidden: true, is_protocol_file: true, is_generated_boundary_file: false, reason: "protocol" }],
      fileViolations: [],
      testViolations: [],
      humanReviewViolations: [],
      scope,
    });
    expect(r[0].severity).toBe("high");
  });
});

// ============================================================
// Scope Diff Validator (integration)
// ============================================================

describe("scopeDiffValidator", () => {
  // Scenario 1: Pass
  it("pass scenario: allowed files + tests pass + human review", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt", "Dtos.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "p10_operator", rationale: "Reviewed high-risk blast radius and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("pass");
    expect(r.blocking_reasons.length).toBe(0);
  });

  // Scenario 2: Outside scope (not forbidden, just not in allowed_files)
  it("outside scope scenario", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["SomeRandomModule.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("requires_reverse_issue");
    expect(r.violations.some(v => v.violation_type === "outside_allowed_files")).toBe(true);
    expect(r.blocking_reasons.some(r => r.includes("SomeRandomModule.kt"))).toBe(true);
  });

  // Scenario 2b: Forbidden file (matches forbidden pattern)
  it("forbidden file scenario", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ui/TriageScreen.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("requires_reverse_issue");
    expect(r.violations.some(v => v.violation_type === "forbidden_file_modified")).toBe(true);
    expect(r.blocking_reasons.some(r => r.includes("ui/TriageScreen.kt"))).toBe(true);
  });
  // Scenario 2c: diff_text-only (no changed_files)
  it("diff_text-only scenario works end-to-end", () => {
    const diffText = [
      "diff --git a/ConflictPolicy.kt b/ConflictPolicy.kt",
      "--- a/ConflictPolicy.kt",
      "+++ b/ConflictPolicy.kt",
      "@@ -1,3 +1,3 @@",
      "-old line",
      "+new line",
    ].join("\n");
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        diff_text: diffText,
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("pass");
    expect(r.summary.changed_files).toBe(1);
  });

  // Scenario 3: Protocol modification
  it("protocol modification scenario", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: [".pantheon/scope.json"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.violations.some(v => v.violation_type === "protocol_file_modified")).toBe(true);
    expect(r.violations.some(v => v.severity === "high" && v.violation_type === "protocol_file_modified")).toBe(true);
    expect(r.blocking_reasons.some(r => r.includes(".pantheon/scope.json"))).toBe(true);
  });

  // Scenario 4: Missing tests
  it("missing tests scenario", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        test_results: [],
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.violations.some(v => v.violation_type === "required_test_missing")).toBe(true);
    expect(r.blocking_reasons.some(r => r.includes("Required test missing"))).toBe(true);
  });

  // Scenario 5: Missing human review
  it("missing human review still preserves reverse-issue signal", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("requires_reverse_issue");
    expect(r.violations.some(v => v.violation_type === "human_review_missing")).toBe(true);
  });

  // Scenario 6: Required tests scope mismatch
  it("required tests scope mismatch scenario", () => {
    const badFile: RequiredTestsFile = { ...requiredTestsFile, scope_id: "wrong_scope_id" };
    const r = validateScopeDiff({
      scope,
      requiredTestsFile: badFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.violations.some(v => v.violation_type === "required_tests_scope_mismatch")).toBe(true);
  });

  // Scenario 7: changed_files wins over diff_text
  it("changed_files wins over diff_text + warning", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        diff_text: "diff --git a/ui/TriageScreen.kt b/ui/TriageScreen.kt",
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("pass");
    expect(r.warnings.some(w => w.warning_type === "input_precedence_notice")).toBe(true);
    // Should NOT have outside_allowed_files since changed_files wins
    expect(r.violations.some(v => v.violation_type === "outside_allowed_files")).toBe(false);
  });

  // Status precedence
  it("requires_reverse_issue takes precedence while keeping human review visible", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ui/TriageScreen.kt"], // outside scope
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        // no human review
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("requires_reverse_issue");
    expect(r.violations.some(v => v.violation_type === "human_review_missing")).toBe(true);
  });

  // Reverse issue aggregation
  it("aggregates reverse issue once", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ui/TriageScreen.kt", "navigation/NavGraph.kt", ".pantheon/scope.json"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    const reverseIssues = r.violations.filter(v => v.violation_type === "reverse_issue_required");
    expect(reverseIssues.length).toBe(1);
  });

  // blocking_reasons contain all causes
  it("blocking_reasons contain all blocking causes", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ui/TriageScreen.kt"],
        test_results: [],
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.blocking_reasons.some(r => r.includes("ui/TriageScreen.kt"))).toBe(true);
    expect(r.blocking_reasons.some(r => r.includes("Required test missing"))).toBe(true);
  });

  // Generated boundary warning (file has modify permission)
  it("generated boundary modified but allowed with modify → warning", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["Enums.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.warnings.some(w => w.warning_type === "generated_file_modified_but_allowed")).toBe(true);
    expect(r.warnings.some(w => w.message.includes("regenerated through Pantheon"))).toBe(true);
  });

  // Generated boundary violation (file lacks modify permission)
  it("generated boundary modified without modify permission → requires_reverse_issue", () => {
    // Create a scope with a generated file that lacks modify permission
    const restrictedScope = {
      ...scope,
      allowed_files: scope.allowed_files.map(f =>
        f.path === "Enums.kt"
          ? { ...f, allowed_operations: ["read", "regenerate", "test"] as any }
          : f
      ),
    };
    const restrictedScopeHash = createHash("sha256").update(JSON.stringify(restrictedScope)).digest("hex").slice(0, 16);
    const restrictedTestsFile: RequiredTestsFile = {
      ...requiredTestsFile,
      scope_id: restrictedScope.scope_id,
      source_scope_hash: restrictedScopeHash,
    };
    const r = validateScopeDiff({
      scope: restrictedScope,
      requiredTestsFile: restrictedTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["Enums.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash: restrictedScopeHash,
      requiredTestsHash,
    });
    expect(r.violations.some(v => v.violation_type === "generated_boundary_modified")).toBe(true);
    expect(r.violations.some(v => v.violation_type === "reverse_issue_required")).toBe(true);
    expect(r.status).toBe("requires_reverse_issue");
    expect(r.required_actions.some(a => a.includes("Regenerate generated boundary"))).toBe(true);
  });

  // Generated boundary override option
  it("allow_generated_boundary_edits option bypasses violation", () => {
    const restrictedScope = {
      ...scope,
      allowed_files: scope.allowed_files.map(f =>
        f.path === "Enums.kt"
          ? { ...f, allowed_operations: ["read", "regenerate", "test"] as any }
          : f
      ),
    };
    const restrictedScopeHash = createHash("sha256").update(JSON.stringify(restrictedScope)).digest("hex").slice(0, 16);
    const restrictedTestsFile: RequiredTestsFile = {
      ...requiredTestsFile,
      scope_id: restrictedScope.scope_id,
      source_scope_hash: restrictedScopeHash,
    };
    const r = validateScopeDiff({
      scope: restrictedScope,
      requiredTestsFile: restrictedTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["Enums.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
        options: { allow_generated_boundary_edits: true },
      },
      scopeHash: restrictedScopeHash,
      requiredTestsHash,
    });
    expect(r.violations.some(v => v.violation_type === "generated_boundary_modified")).toBe(false);
    expect(r.warnings.some(w => w.warning_type === "generated_file_modified_but_allowed")).toBe(true);
  });

  // Hash binding at integration level
  it("fails when source_scope_hash is tampered", () => {
    const tamperedFile: RequiredTestsFile = { ...requiredTestsFile, source_scope_hash: "tampered" };
    const r = validateScopeDiff({
      scope,
      requiredTestsFile: tamperedFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.violations.some(v => v.violation_type === "required_tests_scope_mismatch")).toBe(true);
    expect(r.violations.some(v => v.message.includes("source_scope_hash"))).toBe(true);
    expect(r.blocking_reasons.some(r => r.includes("scope"))).toBe(true);
  });

  // No input
  it("fails when no changed_files or diff_text", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
      },
      scopeHash,
      requiredTestsHash,
    });
    expect(r.status).toBe("fail");
    expect(r.blocking_reasons.some(r => r.includes("No changed_files"))).toBe(true);
  });
});

// ============================================================
// Report Renderer
// ============================================================

describe("scopeDiffReportRenderer", () => {
  it("renders pass report", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    const md = renderScopeDiffReportMarkdown(r);
    expect(md).toContain("Scope Diff Validation Report");
    expect(md).toContain("PASS");
    expect(md).toContain(scope.scope_id);
  });

  it("renders fail report with blocking reasons", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ui/TriageScreen.kt"],
        test_results: [],
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    const md = renderScopeDiffReportMarkdown(r);
    expect(md).toContain("Blocking Reasons");
    expect(md).toContain("ui/TriageScreen.kt");
    expect(md).toContain("Violations");
    expect(md).toContain("Required Actions");
  });

  it("preserves technical IDs in markdown", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        test_results: [],
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    const md = renderScopeDiffReportMarkdown(r);
    // Test IDs should be preserved
    for (const t of scope.required_tests) {
      expect(md).toContain(t.test_id);
    }
  });

  it("includes source hashes", () => {
    const r = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: "scope.json",
        required_tests_path: "required-tests.json",
        changed_files: ["ConflictPolicy.kt"],
        test_results: scope.required_tests.map(t => ({ test_id: t.test_id, status: "passed" as const })),
        human_review: { provided: true, reviewer_id: "op", rationale: "Reviewed and confirmed safe." },
      },
      scopeHash,
      requiredTestsHash,
    });
    const md = renderScopeDiffReportMarkdown(r);
    expect(md).toContain(scopeHash);
    expect(md).toContain(requiredTestsHash);
  });
});
