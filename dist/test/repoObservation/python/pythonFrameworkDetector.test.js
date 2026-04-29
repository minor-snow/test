import { describe, expect, it } from "vitest";
import { detectPythonFrameworkProfile } from "../../../src/repoObservation/python/pythonFrameworkDetector.js";
function manifest(packages, devPackages = []) {
    return {
        source_path: "pyproject.toml",
        source_type: "pyproject.toml",
        packages,
        dev_packages: devPackages,
        confidence: "high",
        warnings: [],
    };
}
function imp(rawSpecifier, topLevelModule) {
    return {
        from_file: "app/main.py",
        raw_specifier: rawSpecifier,
        import_kind: "import",
        status: "declared_package",
        top_level_module: topLevelModule,
        confidence: "high",
    };
}
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
describe("pythonFrameworkDetector", () => {
    it("caps dependency-only framework evidence at medium confidence", () => {
        const profile = detectPythonFrameworkProfile({
            files: [],
            manifests: [manifest(["django"])],
            imports: [],
            layout: layout("unknown", "unknown"),
            allPaths: ["pyproject.toml"],
        });
        const django = profile.framework_signals.find(s => s.name === "django");
        expect(django?.confidence).toBe("medium");
    });
    it("promotes to high confidence when framework has multiple evidence dimensions", () => {
        const profile = detectPythonFrameworkProfile({
            files: [],
            manifests: [manifest(["fastapi"])],
            imports: [imp("fastapi", "fastapi")],
            layout: layout("api_service", "flat_package"),
            allPaths: ["app/main.py", "app/api/routes/items.py", "pyproject.toml"],
        });
        const fastapi = profile.framework_signals.find(s => s.name === "fastapi");
        const serviceRole = profile.project_role_signals.find(s => s.role === "service_backend");
        expect(fastapi?.confidence).toBe("high");
        expect(serviceRole?.confidence).toBe("high");
    });
    it("treats pytest as a test framework and never as a project role", () => {
        const profile = detectPythonFrameworkProfile({
            files: [],
            manifests: [manifest([], ["pytest"])],
            imports: [imp("pytest", "pytest")],
            layout: layout("unknown", "unknown"),
            allPaths: ["tests/test_client.py"],
        });
        const pytest = profile.framework_signals.find(s => s.name === "pytest");
        expect(pytest?.kind).toBe("test_framework");
        expect(pytest?.confidence).toBe("high");
        expect(profile.project_role_signals.some(s => s.role === "pytest")).toBe(false);
    });
    it("classifies cli_application as high with layout, path, and dependency evidence", () => {
        const profile = detectPythonFrameworkProfile({
            files: [],
            manifests: [manifest(["click"])],
            imports: [],
            layout: layout("cli_app", "flat_package"),
            allPaths: ["tool/__main__.py", "tool/cli.py", "pyproject.toml"],
        });
        const click = profile.framework_signals.find(s => s.name === "click");
        const cliRole = profile.project_role_signals.find(s => s.role === "cli_application");
        expect(click?.confidence).toBe("high");
        expect(cliRole?.confidence).toBe("high");
    });
    it("suppresses generic service_backend when strong commerce_backend evidence exists", () => {
        const profile = detectPythonFrameworkProfile({
            files: [],
            manifests: [manifest(["django"])],
            imports: [imp("django", "django")],
            layout: layout("django_project", "django_app_layout"),
            allPaths: [
                "manage.py",
                "saleor/checkout/service.py",
                "saleor/payment/gateway.py",
                "saleor/order/models.py",
                "saleor/api/views.py",
            ],
        });
        expect(profile.project_role_signals.some(s => s.role === "commerce_backend")).toBe(true);
        expect(profile.project_role_signals.some(s => s.role === "service_backend")).toBe(false);
    });
});
//# sourceMappingURL=pythonFrameworkDetector.test.js.map