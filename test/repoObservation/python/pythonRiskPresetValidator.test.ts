import { describe, expect, it } from "vitest";
import { validatePythonRiskPreset } from "../../../src/repoObservation/python/pythonRiskPresetValidator.js";
import type {
  PythonFrameworkProfile,
  PythonProjectLayout,
  PythonSensitiveZone,
} from "../../../src/repoObservation/python/types.js";

function layout(primary: PythonProjectLayout["primary_layout"], pkg: PythonProjectLayout["package_layout"]): PythonProjectLayout {
  return {
    primary_layout: primary,
    package_layout: pkg,
    confidence: "high",
    signals: [],
    unknowns: [],
    bucket_summary: {},
  };
}

function frameworkProfile(input: Partial<PythonFrameworkProfile> = {}): PythonFrameworkProfile {
  return {
    framework_signals: input.framework_signals ?? [],
    project_role_signals: input.project_role_signals ?? [],
    unknowns: input.unknowns ?? [],
  };
}

function zone(category: string, matchedPaths: readonly string[], severity: PythonSensitiveZone["severity"] = "high"): PythonSensitiveZone {
  return {
    path_pattern: `**/${category}/**`,
    matched_paths: matchedPaths,
    category,
    severity,
    source: "keyword",
    evidence: [`matched ${matchedPaths.length} paths`],
  };
}

describe("pythonRiskPresetValidator", () => {
  it("validates django_commerce with dormant patterns preserved", () => {
    const result = validatePythonRiskPreset({
      layout: layout("django_project", "django_app_layout"),
      frameworkProfile: frameworkProfile({
        framework_signals: [
          { name: "django", kind: "web_framework", confidence: "high", evidence: [{ dimension: "dependency_manifest", detail: "django" }, { dimension: "path_pattern", detail: "manage.py" }] },
        ],
        project_role_signals: [
          { role: "commerce_backend", confidence: "high", evidence: [{ dimension: "layout_classification", detail: "django_project" }, { dimension: "path_pattern", detail: "checkout/payment/order" }] },
        ],
      }),
      sensitiveZones: [
        zone("financial_transactions", ["saleor/payment/gateway.py"], "critical"),
        zone("purchase_flow", ["saleor/checkout/service.py"]),
      ],
      allPaths: [
        "saleor/checkout/service.py",
        "saleor/order/models.py",
        "saleor/payment/gateway.py",
        "saleor/account/views.py",
        "saleor/auth/utils.py",
        "saleor/discount/rules.py",
        "saleor/tax/calc.py",
        "saleor/plugins/manager.py",
        "saleor/settings.py",
        "saleor/checkout/migrations/0001_initial.py",
      ],
    });

    expect(result.preset).toBe("django_commerce");
    expect(result.validation).toBe("validated");
    expect(result.suggested_forbidden.some(s => s.pattern === "**/migrations/**")).toBe(true);
    expect(result.suggested_review.some(s => s.pattern === "**/payment/**")).toBe(true);
    expect(result.dormant_patterns.some(s => s.pattern === "**/billing/**")).toBe(true);
  });

  it("keeps sdk/library presets review-only and never emits forbidden suggestions", () => {
    const result = validatePythonRiskPreset({
      layout: layout("library_package", "flat_package"),
      frameworkProfile: frameworkProfile({
        project_role_signals: [
          { role: "python_sdk_library", confidence: "high", evidence: [{ dimension: "layout_classification", detail: "library_package" }, { dimension: "path_pattern", detail: "py.typed" }] },
        ],
      }),
      sensitiveZones: [zone("authentication", ["httpx/_auth.py"])],
      allPaths: [
        "httpx/__init__.py",
        "httpx/_client.py",
        "httpx/_auth.py",
        "httpx/_models.py",
      ],
    });

    expect(result.preset).toBe("python_sdk_library");
    expect(result.suggested_forbidden).toHaveLength(0);
    expect(result.suggested_review.some(s => s.pattern === "**/_client*")).toBe(true);
    expect(result.suggested_review.some(s => s.pattern === "**/_auth*")).toBe(true);
    expect(result.dormant_patterns.some(s => s.pattern === "**/_urls*")).toBe(true);
  });

  it("marks generic service as partial when fewer than 60 percent of rules are active", () => {
    const result = validatePythonRiskPreset({
      layout: layout("api_service", "flat_package"),
      frameworkProfile: frameworkProfile({
        project_role_signals: [
          { role: "service_backend", confidence: "medium", evidence: [{ dimension: "layout_classification", detail: "api_service" }] },
        ],
      }),
      sensitiveZones: [],
      allPaths: ["app/auth.py"],
    });

    expect(result.preset).toBe("generic_service");
    expect(result.validation).toBe("partial");
  });

  it("requires at least three active rules before marking a preset validated", () => {
    const result = validatePythonRiskPreset({
      layout: layout("api_service", "flat_package"),
      frameworkProfile: frameworkProfile({
        project_role_signals: [
          { role: "service_backend", confidence: "medium", evidence: [{ dimension: "layout_classification", detail: "api_service" }] },
        ],
      }),
      sensitiveZones: [zone("authentication", ["app/auth.py"])],
      allPaths: ["app/auth.py", "app/config.py"],
    });

    expect(result.preset).toBe("generic_service");
    expect(result.validation).toBe("partial");
  });

  it("marks generic service as validated once enough rules are active", () => {
    const result = validatePythonRiskPreset({
      layout: layout("api_service", "flat_package"),
      frameworkProfile: frameworkProfile({
        project_role_signals: [
          { role: "service_backend", confidence: "medium", evidence: [{ dimension: "layout_classification", detail: "api_service" }] },
        ],
      }),
      sensitiveZones: [zone("authentication", ["app/auth.py"])],
      allPaths: ["app/auth.py", "app/config.py", "app/security.py"],
    });

    expect(result.preset).toBe("generic_service");
    expect(result.validation).toBe("validated");
  });

  it("falls back to unvalidated unknown when no preset signals are active", () => {
    const result = validatePythonRiskPreset({
      layout: layout("unknown", "unknown"),
      frameworkProfile: frameworkProfile(),
      sensitiveZones: [],
      allPaths: ["src/main.py"],
    });

    expect(result.preset).toBe("unknown");
    expect(result.validation).toBe("unvalidated");
    expect(result.dormant_patterns.length).toBeGreaterThan(0);
  });
});
