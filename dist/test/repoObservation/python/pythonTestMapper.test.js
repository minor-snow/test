/**
 * P25a: Python Test Mapper Tests
 */
import { describe, it, expect } from "vitest";
import { mapPythonTests } from "../../../src/repoObservation/python/pythonTestMapper.js";
describe("pythonTestMapper", () => {
    const saleorPaths = new Set([
        "saleor/__init__.py",
        "saleor/checkout/__init__.py",
        "saleor/checkout/actions.py",
        "saleor/checkout/calculations.py",
        "saleor/checkout/tests/__init__.py",
        "saleor/checkout/tests/test_actions.py",
        "saleor/checkout/tests/test_checkout.py",
        "saleor/payment/__init__.py",
        "saleor/payment/gateway.py",
        "saleor/payment/tests/__init__.py",
        "saleor/payment/tests/test_gateway.py",
        "saleor/order/__init__.py",
        "saleor/order/actions.py",
        "tests/checkout/test_actions.py",
        "tests/conftest.py",
    ]);
    function layout(primary, pkg) {
        return {
            primary_layout: primary,
            package_layout: pkg,
            confidence: "high",
            signals: [],
            unknowns: [],
            bucket_summary: {},
        };
    }
    function frameworkProfile(input = {}) {
        return {
            framework_signals: input.framework_signals ?? [],
            project_role_signals: input.project_role_signals ?? [],
            unknowns: input.unknowns ?? [],
        };
    }
    it("high confidence: sibling tests/ with exact name match", () => {
        const results = mapPythonTests({
            sourcePaths: ["saleor/checkout/actions.py"],
            observedPaths: saleorPaths,
        });
        expect(results).toHaveLength(1);
        expect(results[0].confidence).toBe("high");
        expect(results[0].existing_test_paths).toContain("saleor/checkout/tests/test_actions.py");
    });
    it("medium confidence: module-level test file", () => {
        const results = mapPythonTests({
            sourcePaths: ["saleor/checkout/calculations.py"],
            observedPaths: saleorPaths,
        });
        expect(results).toHaveLength(1);
        // calculations → test_calculations.py doesn't exist, but test_checkout.py does
        expect(results[0].existing_test_paths.length).toBeGreaterThan(0);
        expect(results[0].confidence).toBe("medium");
    });
    it("high confidence: payment module", () => {
        const results = mapPythonTests({
            sourcePaths: ["saleor/payment/gateway.py"],
            observedPaths: saleorPaths,
        });
        expect(results).toHaveLength(1);
        expect(results[0].confidence).toBe("high");
        expect(results[0].existing_test_paths).toContain("saleor/payment/tests/test_gateway.py");
    });
    it("low confidence: no matching test file exists", () => {
        const results = mapPythonTests({
            sourcePaths: ["saleor/order/actions.py"],
            observedPaths: saleorPaths,
        });
        expect(results).toHaveLength(1);
        expect(results[0].confidence).toBe("low");
        expect(results[0].candidate_test_paths.length).toBeGreaterThan(0);
        expect(results[0].existing_test_paths).toHaveLength(0);
    });
    it("skips __init__.py and conftest.py", () => {
        const results = mapPythonTests({
            sourcePaths: ["saleor/__init__.py", "saleor/checkout/__init__.py"],
            observedPaths: saleorPaths,
        });
        expect(results).toHaveLength(0);
    });
    it("skips test files themselves", () => {
        const results = mapPythonTests({
            sourcePaths: ["saleor/checkout/tests/test_actions.py"],
            observedPaths: saleorPaths,
        });
        expect(results).toHaveLength(0);
    });
    it("maps multiple sources at once", () => {
        const results = mapPythonTests({
            sourcePaths: [
                "saleor/checkout/actions.py",
                "saleor/payment/gateway.py",
                "saleor/order/actions.py",
            ],
            observedPaths: saleorPaths,
        });
        expect(results).toHaveLength(3);
    });
    it("uses library-aware candidates for private modules", () => {
        const observedPaths = new Set([
            "httpx/_auth.py",
            "tests/test_auth.py",
        ]);
        const results = mapPythonTests({
            sourcePaths: ["httpx/_auth.py"],
            observedPaths,
            layout: layout("library_package", "flat_package"),
            frameworkProfile: frameworkProfile({
                project_role_signals: [
                    { role: "python_sdk_library", confidence: "high", evidence: [{ dimension: "layout_classification", detail: "library_package" }] },
                ],
            }),
        });
        expect(results).toHaveLength(1);
        expect(results[0].candidate_test_paths).toContain("tests/test_auth.py");
        expect(results[0].confidence).toBe("high");
        expect(results[0].reason).toContain("Library module match");
    });
    it("uses FastAPI route domain patterns for service tests", () => {
        const observedPaths = new Set([
            "app/api/routes/articles.py",
            "tests/api/articles/test_article_list.py",
        ]);
        const results = mapPythonTests({
            sourcePaths: ["app/api/routes/articles.py"],
            observedPaths,
            layout: layout("api_service", "flat_package"),
            frameworkProfile: frameworkProfile({
                framework_signals: [
                    { name: "fastapi", kind: "web_framework", confidence: "high", evidence: [{ dimension: "dependency_manifest", detail: "fastapi" }] },
                ],
                project_role_signals: [
                    { role: "service_backend", confidence: "high", evidence: [{ dimension: "layout_classification", detail: "api_service" }] },
                ],
            }),
        });
        expect(results).toHaveLength(1);
        expect(results[0].candidate_test_paths).toContain("tests/api/articles/test_article_list.py");
        expect(results[0].confidence).toBe("high");
        expect(results[0].reason).toContain("API route domain test match");
    });
    it("uses CLI-aware fallback candidates", () => {
        const observedPaths = new Set([
            "cli.py",
            "tests/test_cli.py",
        ]);
        const results = mapPythonTests({
            sourcePaths: ["cli.py"],
            observedPaths,
            layout: layout("cli_app", "flat_package"),
            frameworkProfile: frameworkProfile({
                project_role_signals: [
                    { role: "cli_application", confidence: "high", evidence: [{ dimension: "layout_classification", detail: "cli_app" }] },
                ],
            }),
        });
        expect(results).toHaveLength(1);
        expect(results[0].candidate_test_paths).toContain("tests/test_cli.py");
        expect(results[0].confidence).toBe("high");
        expect(results[0].reason).toContain("Exact match");
    });
});
//# sourceMappingURL=pythonTestMapper.test.js.map