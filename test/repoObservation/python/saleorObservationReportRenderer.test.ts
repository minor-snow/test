import { describe, expect, it } from "vitest";
import {
  buildSaleorObservationReportSummary,
  renderSaleorObservationReportMarkdown,
} from "../../../src/repoObservation/python/saleorObservationReportRenderer.js";
import type { PythonObservationSidecar } from "../../../src/repoObservation/python/types.js";

function makeSidecar(overrides?: Partial<PythonObservationSidecar>): PythonObservationSidecar {
  return {
    schema_version: "python_observations.v1",
    repo: {
      root_label: "salary",
      observed_file_count: 3200,
      python_file_count: 2800,
    },
    layout: {
      primary_layout: "django_project",
      package_layout: "django_app_layout",
      confidence: "high",
      signals: [{ signal: "manage_py_found", weight: "strong", evidence: "manage.py in repo root" }],
      unknowns: [],
      bucket_summary: { source: 2000, test: 500, migration: 200, config: 100 },
    },
    framework_profile: {
      framework_signals: [
        { name: "django", kind: "web_framework", confidence: "high", evidence: [{ dimension: "dependency_manifest", detail: "django found" }, { dimension: "path_pattern", detail: "manage.py found" }] },
      ],
      project_role_signals: [
        { role: "commerce_backend", confidence: "high", evidence: [{ dimension: "path_pattern", detail: "checkout/payment/order families" }, { dimension: "layout_classification", detail: "django_project layout" }] },
      ],
      unknowns: [],
    },
    risk_preset_validation: {
      preset: "django_commerce",
      validation: "validated",
      confidence: "high",
      matched_signals: ["layout: django_project", "framework: django", "project_role: commerce_backend"],
      suggested_review: [],
      suggested_forbidden: [],
      dormant_patterns: [],
    },
    files: [
      { path: "saleor/checkout/actions.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/checkout/tests/test_actions.py", bucket: "test", extension: ".py", size_bytes: 80, evidence: [] },
      { path: "saleor/payment/gateway.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/order/actions.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/account/models.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/discount/utils.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/tax/calculations.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/plugins/manager.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/graphql/checkout/mutations.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/core/settings.py", bucket: "config", extension: ".py", size_bytes: 100, evidence: [] },
      { path: "saleor/checkout/migrations/0001_initial.py", bucket: "migration", extension: ".py", size_bytes: 100, evidence: [] },
    ],
    import_observations: [
      { from_file: "saleor/checkout/actions.py", raw_specifier: "from saleor.payment import gateway", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
      { from_file: "saleor/checkout/actions.py", raw_specifier: "from saleor.order import actions", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
      { from_file: "saleor/graphql/checkout/mutations.py", raw_specifier: "from saleor.checkout import actions", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
      { from_file: "saleor/payment/gateway.py", raw_specifier: "import django", import_kind: "import", status: "declared_package", top_level_module: "django", confidence: "high" },
      { from_file: "saleor/plugins/manager.py", raw_specifier: "__import__(name)", import_kind: "dynamic_import", status: "dynamic_or_unresolved", top_level_module: "__import__", confidence: "low" },
    ],
    dependency_manifests: [
      {
        source_path: "pyproject.toml",
        source_type: "pyproject.toml",
        packages: ["django", "graphene"],
        dev_packages: ["pytest"],
        confidence: "high",
        warnings: [],
      },
      {
        source_path: "setup.py",
        source_type: "setup.py",
        packages: [],
        dev_packages: [],
        confidence: "low",
        warnings: ["Weak parsing."],
      },
    ],
    test_mappings: [
      {
        source_path: "saleor/checkout/actions.py",
        candidate_test_paths: ["saleor/checkout/tests/test_actions.py"],
        existing_test_paths: ["saleor/checkout/tests/test_actions.py"],
        confidence: "high",
        reason: "Exact match",
      },
      {
        source_path: "saleor/order/actions.py",
        candidate_test_paths: ["saleor/order/tests/test_actions.py"],
        existing_test_paths: ["saleor/order/tests/test_checkout.py"],
        confidence: "medium",
        reason: "Module-level match",
      },
      {
        source_path: "saleor/tax/calculations.py",
        candidate_test_paths: ["saleor/tax/tests/test_calculations.py"],
        existing_test_paths: [],
        confidence: "low",
        reason: "Candidate only",
      },
    ],
    sensitive_zones: [
      {
        path_pattern: "**/payment/**",
        matched_paths: ["saleor/payment/gateway.py"],
        category: "financial_transactions",
        severity: "critical",
        source: "keyword",
        evidence: ["payment keyword"],
      },
      {
        path_pattern: "**/checkout/**",
        matched_paths: ["saleor/checkout/actions.py", "saleor/checkout/tests/test_actions.py"],
        category: "purchase_flow",
        severity: "high",
        source: "keyword",
        evidence: ["checkout keyword"],
      },
      {
        path_pattern: "**/order/**",
        matched_paths: ["saleor/order/actions.py"],
        category: "order_lifecycle",
        severity: "high",
        source: "keyword",
        evidence: ["order keyword"],
      },
      {
        path_pattern: "saleor/plugins/**",
        matched_paths: ["saleor/plugins/manager.py"],
        category: "runtime_extension",
        severity: "high",
        source: "config_override",
        evidence: ["override"],
      },
    ],
    unknowns: [
      {
        category: "low_confidence_manifest",
        classification: "actionable",
        paths: ["setup.py"],
        count: 1,
        note: "Weak parsing.",
      },
      {
        category: "dynamic_or_unresolved_import",
        classification: "intrinsic",
        paths: ["saleor/plugins/manager.py"],
        count: 1,
        note: "Dynamic import.",
      },
    ],
    quality: {
      python_file_count: 10,
      classified_count: 10,
      classified_ratio: 1,
      unknown_count: 0,
      unknown_ratio: 0,
      import_observation_count: 5,
      project_import_count: 3,
      declared_package_count: 1,
      undeclared_package_count: 0,
      dynamic_import_count: 1,
      test_mapping_count: 3,
      high_confidence_test_count: 1,
      medium_confidence_test_count: 1,
      sensitive_zone_count: 4,
      sensitive_file_count: 5,
      manifest_count: 2,
      low_confidence_manifest_count: 1,
    },
    limitations: [
      "Python import observations are syntax-level observations, not full runtime import resolution.",
      "Scope granularity in P25 is file/path-level. Function-level scope is future work.",
    ],
    ...overrides,
  };
}

describe("saleorObservationReportRenderer", () => {
  it("builds a repo-wide summary with readiness and zone suggestions", () => {
    const summary = buildSaleorObservationReportSummary({
      sidecar: makeSidecar(),
      subjectName: "Saleor",
      observationSummary: {
        repo_label: "salary",
        observed_files: 4579,
        python_files: 4251,
        scan_ms: 569,
        enhance_ms: 470,
      },
      generatedAt: "2026-04-28T00:00:00.000Z",
    });

    expect(summary.schema_version).toBe("saleor_observation_report.v2");
    expect(summary.subject_name).toBe("Saleor");
    expect(summary.repo_scale.observed_files).toBe(4579);
    expect(summary.high_risk_domains.find(d => d.domain === "checkout")?.matched_file_count).toBeGreaterThan(0);
    expect(summary.high_risk_domains.find(d => d.domain === "payment")?.governance_recommendation).toBe("protected");
    expect(summary.suggested_protected_zones).toContain("saleor/payment/**");
    expect(summary.suggested_review_required_zones).toContain("saleor/order/**");
    expect(summary.boundary_readiness.explicit_scope).toBe("requires_manual_scope");
    expect(summary.boundary_readiness.auto_scope).toBe("not_ready_for_auto_scope");
    expect(summary.recommended_trial_scenario.allowed).toContain("saleor/checkout/**");
  });

  it("renders the required P25b sections and explicit-scope conclusion", () => {
    const summary = buildSaleorObservationReportSummary({
      sidecar: makeSidecar({
        sensitive_zones: [
          ...makeSidecar().sensitive_zones,
          {
            path_pattern: "**/tax/**",
            matched_paths: ["saleor/tax/calculations.py"],
            category: "regulatory_calculation",
            severity: "medium",
            source: "keyword",
            evidence: ["tax keyword"],
          },
        ],
        quality: {
          ...makeSidecar().quality,
          sensitive_zone_count: 5,
          sensitive_file_count: 6,
          project_import_count: 16,
          test_mapping_count: 8,
        },
        import_observations: [
          { from_file: "saleor/checkout/actions.py", raw_specifier: "from saleor.payment import gateway", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/checkout/actions.py", raw_specifier: "from saleor.order import actions", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/graphql/checkout/mutations.py", raw_specifier: "from saleor.checkout import actions", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/graphql/checkout/mutations.py", raw_specifier: "from saleor.account import models", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/order/actions.py", raw_specifier: "from saleor.discount import utils", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/order/actions.py", raw_specifier: "from saleor.tax import calculations", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/payment/gateway.py", raw_specifier: "from saleor.plugins import manager", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/account/models.py", raw_specifier: "from saleor.core import settings", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/discount/utils.py", raw_specifier: "from saleor.order import actions", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/tax/calculations.py", raw_specifier: "from saleor.checkout import actions", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/plugins/manager.py", raw_specifier: "from saleor.payment import gateway", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/core/settings.py", raw_specifier: "from saleor.plugins import manager", import_kind: "from_import", status: "project_import", top_level_module: "saleor", confidence: "high" },
          { from_file: "saleor/payment/gateway.py", raw_specifier: "import django", import_kind: "import", status: "declared_package", top_level_module: "django", confidence: "high" },
        ],
        test_mappings: [
          ...makeSidecar().test_mappings,
          { source_path: "saleor/payment/gateway.py", candidate_test_paths: ["saleor/payment/tests/test_gateway.py"], existing_test_paths: ["saleor/payment/tests/test_gateway.py"], confidence: "high", reason: "Exact" },
          { source_path: "saleor/account/models.py", candidate_test_paths: ["saleor/account/tests/test_models.py"], existing_test_paths: ["saleor/account/tests/test_models.py"], confidence: "medium", reason: "Module" },
          { source_path: "saleor/discount/utils.py", candidate_test_paths: ["saleor/discount/tests/test_utils.py"], existing_test_paths: ["saleor/discount/tests/test_utils.py"], confidence: "medium", reason: "Module" },
          { source_path: "saleor/plugins/manager.py", candidate_test_paths: ["saleor/plugins/tests/test_manager.py"], existing_test_paths: ["saleor/plugins/tests/test_manager.py"], confidence: "high", reason: "Exact" },
          { source_path: "saleor/graphql/checkout/mutations.py", candidate_test_paths: ["saleor/graphql/checkout/tests/test_mutations.py"], existing_test_paths: ["saleor/graphql/checkout/tests/test_mutations.py"], confidence: "high", reason: "Exact" },
        ],
      }),
      subjectName: "Saleor",
    });

    const report = renderSaleorObservationReportMarkdown(summary);

    expect(report).toContain("# Saleor Observation Report v2");
    expect(report).toContain("## Executive Summary");
    expect(report).toContain("ready for explicit-scope governance");
    expect(report).toContain("## Sensitive Zone Map");
    expect(report).toContain("## High-Risk Saleor Domains");
    expect(report).toContain("## Suggested Protected Zones");
    expect(report).toContain("## Boundary Readiness");
    expect(report).toContain("## Recommended Trial Scenario");
    expect(report).toContain("saleor/checkout/**");
    expect(report).toContain("not ready for automatic intent-to-scope inference");
    expect(report).toContain("file/path-level");
  });
});
