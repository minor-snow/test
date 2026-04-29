/**
 * P25b: Python Governance Renderer Tests
 */
import { describe, it, expect } from "vitest";
import { renderPythonGovernanceReport, computePythonTaskEnhancement, renderPythonTaskSensitiveWarnings, renderPythonTaskTestSuggestions, renderPythonScopeSections, } from "../../../src/repoObservation/python/pythonGovernanceRenderer.js";
// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------
function makeSidecar(overrides) {
    return {
        schema_version: "python_observations.v1",
        repo: { root_label: "test-repo", observed_file_count: 100, python_file_count: 50 },
        layout: {
            primary_layout: "django_project",
            package_layout: "flat_package",
            confidence: "high",
            signals: [{ signal: "manage_py_found", weight: "strong", evidence: "manage.py in repo root" }],
            unknowns: [],
            bucket_summary: { source: 40, test: 8, config: 2 },
        },
        framework_profile: {
            framework_signals: [
                { name: "django", kind: "web_framework", confidence: "high", evidence: [{ dimension: "dependency_manifest", detail: "django found" }, { dimension: "path_pattern", detail: "manage.py found" }] },
            ],
            project_role_signals: [
                { role: "commerce_backend", confidence: "medium", evidence: [{ dimension: "path_pattern", detail: "checkout/payment/order path families" }] },
            ],
            unknowns: [],
        },
        risk_preset_validation: {
            preset: "django_commerce",
            validation: "validated",
            confidence: "high",
            matched_signals: ["layout: django_project", "framework: django"],
            suggested_review: [],
            suggested_forbidden: [],
            dormant_patterns: [],
        },
        files: [
            { path: "app/checkout/actions.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
            { path: "app/payment/gateway.py", bucket: "source", extension: ".py", size_bytes: 200, evidence: [] },
            { path: "app/checkout/tests/test_actions.py", bucket: "test", extension: ".py", size_bytes: 80, evidence: [] },
        ],
        import_observations: [
            { from_file: "app/checkout/actions.py", raw_specifier: "from app.payment import gateway", import_kind: "from_import", status: "project_import", top_level_module: "app", confidence: "high" },
            { from_file: "app/checkout/actions.py", raw_specifier: "from django.db import models", import_kind: "from_import", status: "declared_package", top_level_module: "django", confidence: "high" },
            { from_file: "app/payment/gateway.py", raw_specifier: "import requests", import_kind: "import", status: "declared_package", top_level_module: "requests", confidence: "high" },
        ],
        dependency_manifests: [
            { source_path: "pyproject.toml", source_type: "pyproject.toml", packages: ["django", "celery", "requests"], dev_packages: ["pytest"], confidence: "high", warnings: [] },
        ],
        test_mappings: [
            { source_path: "app/checkout/actions.py", candidate_test_paths: ["app/checkout/tests/test_actions.py"], existing_test_paths: ["app/checkout/tests/test_actions.py"], confidence: "high", reason: "Exact match" },
            { source_path: "app/payment/gateway.py", candidate_test_paths: ["app/payment/tests/test_gateway.py"], existing_test_paths: [], confidence: "low", reason: "No test found" },
        ],
        sensitive_zones: [
            { path_pattern: "**/payment/**", matched_paths: ["app/payment/gateway.py", "app/payment/models.py"], category: "financial_transactions", severity: "critical", source: "keyword", evidence: ["payment keyword"] },
            { path_pattern: "**/checkout/**", matched_paths: ["app/checkout/actions.py", "app/checkout/models.py", "app/checkout/calculations.py"], category: "purchase_flow", severity: "high", source: "keyword", evidence: ["checkout keyword"] },
            { path_pattern: "**/auth/**", matched_paths: ["app/auth/login.py"], category: "authentication", severity: "high", source: "keyword", evidence: ["auth keyword"] },
        ],
        unknowns: [
            { category: "scope_granularity_limit", classification: "intrinsic", paths: [], count: 0, note: "File-level only." },
            { category: "low_confidence_manifest", classification: "actionable", paths: ["setup.py"], count: 1, note: "Weak parsing." },
        ],
        quality: {
            python_file_count: 50,
            classified_count: 48,
            classified_ratio: 0.96,
            unknown_count: 2,
            unknown_ratio: 0.04,
            import_observation_count: 3,
            project_import_count: 1,
            declared_package_count: 2,
            undeclared_package_count: 0,
            dynamic_import_count: 0,
            test_mapping_count: 2,
            high_confidence_test_count: 1,
            medium_confidence_test_count: 0,
            sensitive_zone_count: 3,
            sensitive_file_count: 6,
            manifest_count: 1,
            low_confidence_manifest_count: 0,
        },
        limitations: [
            "Syntax-level only.",
            "Multi-line import limitation.",
        ],
        ...overrides,
    };
}
const SCOPE_FILES = [
    "app/checkout/actions.py",
    "app/checkout/models.py",
    "app/checkout/calculations.py",
    "app/payment/gateway.py",
];
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("pythonGovernanceRenderer", () => {
    describe("renderPythonGovernanceReport", () => {
        it("produces valid markdown with all sections", () => {
            const report = renderPythonGovernanceReport({
                sidecar: makeSidecar(),
                intent: "Add eco-packaging fee",
                scopeFiles: SCOPE_FILES,
                repoLabel: "test-repo",
            });
            expect(report).toContain("# Python Governance Report");
            expect(report).toContain("Add eco-packaging fee");
            expect(report).toContain("test-repo");
            expect(report).toContain("## Risk Summary");
            expect(report).toContain("## Sensitive Zones in Scope");
            expect(report).toContain("## Test Coverage");
            expect(report).toContain("## Dependencies");
            expect(report).toContain("## Observation Limitations");
        });
        it("shows critical severity first in sensitive zones", () => {
            const report = renderPythonGovernanceReport({
                sidecar: makeSidecar(),
                intent: "Fix bug",
                scopeFiles: SCOPE_FILES,
                repoLabel: "test-repo",
            });
            const criticalIdx = report.indexOf("financial_transactions");
            const highIdx = report.indexOf("purchase_flow");
            expect(criticalIdx).toBeLessThan(highIdx);
        });
        it("shows test coverage table", () => {
            const report = renderPythonGovernanceReport({
                sidecar: makeSidecar(),
                intent: "Fix bug",
                scopeFiles: SCOPE_FILES,
                repoLabel: "test-repo",
            });
            expect(report).toContain("app/checkout/actions.py");
            expect(report).toContain("app/checkout/tests/test_actions.py");
            expect(report).toContain("_no test found_");
        });
        it("shows dependencies", () => {
            const report = renderPythonGovernanceReport({
                sidecar: makeSidecar(),
                intent: "Fix bug",
                scopeFiles: SCOPE_FILES,
                repoLabel: "test-repo",
            });
            expect(report).toContain("`django`");
            expect(report).toContain("`celery`");
        });
        it("shows actionable unknowns", () => {
            const report = renderPythonGovernanceReport({
                sidecar: makeSidecar(),
                intent: "Fix bug",
                scopeFiles: SCOPE_FILES,
                repoLabel: "test-repo",
            });
            expect(report).toContain("Low confidence manifest");
        });
        it("shows limitations", () => {
            const report = renderPythonGovernanceReport({
                sidecar: makeSidecar(),
                intent: "Fix bug",
                scopeFiles: SCOPE_FILES,
                repoLabel: "test-repo",
            });
            expect(report).toContain("Syntax-level only");
            expect(report).toContain("Multi-line import limitation");
        });
        it("omits sensitive zones section when scope has none", () => {
            const report = renderPythonGovernanceReport({
                sidecar: makeSidecar(),
                intent: "Fix docs",
                scopeFiles: ["lib/utils.py"],
                repoLabel: "test-repo",
            });
            expect(report).not.toContain("## Sensitive Zones in Scope");
        });
    });
    describe("computePythonTaskEnhancement", () => {
        it("produces sensitive warnings for scope in sensitive zones", () => {
            const enhancement = computePythonTaskEnhancement({
                sidecar: makeSidecar(),
                scopeFiles: SCOPE_FILES,
            });
            expect(enhancement.sensitiveWarnings.length).toBeGreaterThan(0);
            expect(enhancement.sensitiveWarnings.some(w => w.includes("financial_transactions"))).toBe(true);
            expect(enhancement.sensitiveWarnings.some(w => w.includes("purchase_flow"))).toBe(true);
        });
        it("produces test suggestions from high-confidence mappings", () => {
            const enhancement = computePythonTaskEnhancement({
                sidecar: makeSidecar(),
                scopeFiles: SCOPE_FILES,
            });
            expect(enhancement.testSuggestions).toContain("app/checkout/tests/test_actions.py");
        });
        it("no warnings for non-sensitive scope", () => {
            const enhancement = computePythonTaskEnhancement({
                sidecar: makeSidecar(),
                scopeFiles: ["lib/utils.py"],
            });
            expect(enhancement.sensitiveWarnings).toHaveLength(0);
        });
    });
    describe("renderPythonTaskSensitiveWarnings & renderPythonTaskTestSuggestions", () => {
        it("renders sensitive warnings", () => {
            const enhancement = computePythonTaskEnhancement({
                sidecar: makeSidecar(),
                scopeFiles: SCOPE_FILES,
            });
            const sections = renderPythonTaskSensitiveWarnings(enhancement);
            expect(sections).toContain("⚠️ Sensitive zones");
            expect(sections).toContain("financial_transactions");
            expect(sections).toContain("Extra care required");
        });
        it("renders test suggestions", () => {
            const enhancement = computePythonTaskEnhancement({
                sidecar: makeSidecar(),
                scopeFiles: SCOPE_FILES,
            });
            const sections = renderPythonTaskTestSuggestions(enhancement);
            expect(sections).toContain("Suggested tests");
            expect(sections).toContain("test_actions.py");
        });
        it("returns empty for non-sensitive non-tested scope", () => {
            const enhancement = computePythonTaskEnhancement({
                sidecar: makeSidecar(),
                scopeFiles: ["lib/utils.py"],
            });
            const w = renderPythonTaskSensitiveWarnings(enhancement);
            const t = renderPythonTaskTestSuggestions(enhancement);
            expect(w).toBe("");
            expect(t).toBe("");
        });
    });
    describe("renderPythonScopeSections", () => {
        it("renders sensitive zone table", () => {
            const sections = renderPythonScopeSections({
                sidecar: makeSidecar(),
                scopeFiles: SCOPE_FILES,
            });
            expect(sections).toContain("Python Governance Signals");
            expect(sections).toContain("Sensitive zones in scope");
            expect(sections).toContain("financial_transactions");
            expect(sections).toContain("critical");
        });
        it("renders test coverage stats", () => {
            const sections = renderPythonScopeSections({
                sidecar: makeSidecar(),
                scopeFiles: SCOPE_FILES,
            });
            expect(sections).toContain("Test coverage");
            expect(sections).toContain("High confidence");
        });
        it("returns empty for non-matching scope", () => {
            const sections = renderPythonScopeSections({
                sidecar: makeSidecar(),
                scopeFiles: ["lib/utils.py"],
            });
            expect(sections).toBe("");
        });
    });
});
//# sourceMappingURL=pythonGovernanceRenderer.test.js.map