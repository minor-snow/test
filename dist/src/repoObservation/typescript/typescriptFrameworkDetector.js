/**
 * P28c: TypeScript/JavaScript Framework & Project-Role Detector
 *
 * Detects frameworks and project roles from multiple evidence dimensions:
 *   1. dependency_manifest — packages declared in package.json
 *   2. path_pattern — structural path patterns (pages/, app/, etc.)
 *   3. import_pattern — what modules are imported
 *   4. config_file — presence of config files (next.config.*, vite.config.*, etc.)
 *
 * Hard rules (same as Python adapter):
 *   - At least 2 evidence dimensions required for "high" confidence
 *   - Dependency-only evidence caps at "medium"
 *   - Test frameworks (vitest/jest/playwright) are framework signals, not project roles
 *   - Unknown outputs when no framework/role can be determined
 *
 * P28c-1.1 Calibration:
 *   - Import/path evidence from test/fixtures/examples/data paths is EXCLUDED
 *     from runtime framework detection to prevent false positives.
 *   - Only src/ and top-level source files count as runtime evidence.
 */
export function detectTypeScriptFrameworkProfile(input) {
    const evidence = collectEvidence(input);
    const frameworkSignals = detectFrameworks(evidence);
    const projectRoleSignals = detectProjectRoles(evidence, input.layout, input.packageJsonFields);
    const unknowns = [];
    if (frameworkSignals.length === 0) {
        unknowns.push({
            kind: "unknown_framework_or_domain_role",
            reason: "No framework could be detected from dependencies, paths, imports, or config files",
        });
    }
    if (projectRoleSignals.length === 0) {
        unknowns.push({
            kind: "unknown_framework_or_domain_role",
            reason: "No project role could be inferred from layout, dependencies, or path families",
        });
    }
    return { framework_signals: frameworkSignals, project_role_signals: projectRoleSignals, unknowns };
}
/**
 * Prefixes that indicate non-runtime context.
 * Imports from these paths and structural signals from these paths
 * are EXCLUDED from framework/role detection to prevent fixture/test/example
 * content from polluting the project's primary classification.
 */
const NON_RUNTIME_PATH_PREFIXES = [
    "test/", "tests/", "__tests__/",
    "fixtures/", "test/fixtures/", "__fixtures__/",
    "examples/", "example/",
    "data/", "docs/", "doc/",
    "scripts/",
];
function isRuntimePath(p) {
    return !NON_RUNTIME_PATH_PREFIXES.some(prefix => p.startsWith(prefix));
}
function collectEvidence(input) {
    const deps = new Set();
    const devDeps = new Set();
    for (const m of input.manifests) {
        for (const p of m.dependencies)
            deps.add(p.toLowerCase());
        for (const p of m.dev_dependencies)
            devDeps.add(p.toLowerCase());
    }
    // P28c-1.1: Only count imports from runtime source files.
    // Imports inside test fixtures, examples, and data directories are excluded.
    const importedModules = new Set();
    for (const imp of input.imports) {
        if (imp.resolution_status === "declared_package" || imp.resolution_status === "undeclared_package") {
            // Filter: only imports from runtime paths count
            if (!isRuntimePath(imp.from_file))
                continue;
            const mod = imp.raw_specifier.startsWith("@")
                ? imp.raw_specifier.split("/").slice(0, 2).join("/")
                : imp.raw_specifier.split("/")[0];
            importedModules.add(mod.toLowerCase());
        }
    }
    const configKinds = new Set();
    for (const hint of input.configHints) {
        configKinds.add(hint.kind);
    }
    // P28c-1.1: Only runtime paths count for structural detection.
    const runtimePaths = input.allPaths.filter(isRuntimePath);
    const pathSet = new Set(input.allPaths);
    const pathFamilies = new Set();
    const domainPatterns = [
        { pattern: /\bauth\b/i, family: "auth" },
        { pattern: /\bapi\b/i, family: "api" },
        { pattern: /\bcomponents?\b/i, family: "components" },
        { pattern: /\bpayment\b/i, family: "payment" },
        { pattern: /\bdashboard\b/i, family: "dashboard" },
        { pattern: /\badmin\b/i, family: "admin" },
        { pattern: /\bmiddleware\b/i, family: "middleware" },
        { pattern: /\broutes?\b/i, family: "routes" },
        { pattern: /\bcontrollers?\b/i, family: "controllers" },
        { pattern: /\bservices?\b/i, family: "services" },
    ];
    for (const p of runtimePaths) {
        for (const { pattern, family } of domainPatterns) {
            if (pattern.test(p))
                pathFamilies.add(family);
        }
    }
    const pathFacts = {
        hasPagesDir: runtimePaths.some(p => p.startsWith("pages/") || p.startsWith("src/pages/")),
        hasAppDir: runtimePaths.some(p => p.startsWith("app/") || p.startsWith("src/app/")),
        hasSrcDir: runtimePaths.some(p => p.startsWith("src/")),
        hasApiDir: runtimePaths.some(p => p.includes("/api/") || p.startsWith("api/")),
        hasRoutesDir: runtimePaths.some(p => p.includes("/routes/")),
        hasControllersDir: runtimePaths.some(p => p.includes("/controllers/")),
        hasModulesDir: runtimePaths.some(p => p.includes("/modules/")),
        hasComponentsDir: runtimePaths.some(p => p.includes("/components/")),
        hasLibDir: runtimePaths.some(p => p.startsWith("lib/") || p.startsWith("src/lib/")),
        hasDistDir: runtimePaths.some(p => p.startsWith("dist/")),
        hasBinField: false, // resolved from package.json in caller
        hasActionYml: pathSet.has("action.yml") || pathSet.has("action.yaml") || pathSet.has(".github/workflows/action.yml"),
        hasNextConfig: runtimePaths.some(p => p.match(/^next\.config\.(js|mjs|ts)$/)),
        hasViteConfig: runtimePaths.some(p => p.match(/^vite\.config\.(js|mjs|ts|mts)$/)),
        hasTsupConfig: runtimePaths.some(p => p.match(/^tsup\.config\.(js|mjs|ts)$/)),
        hasEslintConfig: runtimePaths.some(p => p.match(/^eslint\.config\.(js|mjs|ts)$/)),
        hasNestCliJson: pathSet.has("nest-cli.json"),
        hasTsconfigBuild: pathSet.has("tsconfig.build.json") || pathSet.has("tsconfig.base.json"),
        hasTsxFiles: runtimePaths.some(p => p.endsWith(".tsx")),
        hasIndexTs: pathSet.has("src/index.ts") || pathSet.has("index.ts") || pathSet.has("lib/index.ts"),
        hasMainTs: pathSet.has("src/main.ts") || pathSet.has("main.ts") || pathSet.has("src/main.tsx"),
        hasCliTs: pathSet.has("src/cli.ts") || pathSet.has("cli.ts") || pathSet.has("bin/cli.js"),
        pathFamilies,
    };
    return { deps, devDeps, importedModules, configKinds, pathFacts };
}
function detectFrameworks(ev) {
    const candidates = [];
    // --- Next.js ---
    {
        const evidence = [];
        if (ev.deps.has("next"))
            evidence.push({ dimension: "dependency_manifest", detail: "next found in dependencies" });
        if (ev.pathFacts.hasNextConfig)
            evidence.push({ dimension: "config_file", detail: "next.config.* found" });
        if (ev.pathFacts.hasPagesDir || ev.pathFacts.hasAppDir)
            evidence.push({ dimension: "path_pattern", detail: "pages/ or app/ directory (Next.js routing)" });
        if (ev.importedModules.has("next"))
            evidence.push({ dimension: "import_pattern", detail: "next/* imported in source" });
        if (evidence.length > 0)
            candidates.push({ name: "next.js", kind: "meta_framework", evidence });
    }
    // --- React ---
    {
        const evidence = [];
        if (ev.deps.has("react"))
            evidence.push({ dimension: "dependency_manifest", detail: "react found in dependencies" });
        if (ev.pathFacts.hasTsxFiles)
            evidence.push({ dimension: "path_pattern", detail: ".tsx files present (JSX)" });
        if (ev.pathFacts.hasComponentsDir)
            evidence.push({ dimension: "path_pattern", detail: "components/ directory" });
        if (ev.importedModules.has("react"))
            evidence.push({ dimension: "import_pattern", detail: "react imported in source" });
        if (evidence.length > 0)
            candidates.push({ name: "react", kind: "ui_library", evidence });
    }
    // --- Vite ---
    {
        const evidence = [];
        if (ev.deps.has("vite") || ev.devDeps.has("vite"))
            evidence.push({ dimension: "dependency_manifest", detail: "vite found in dependencies" });
        if (ev.pathFacts.hasViteConfig)
            evidence.push({ dimension: "config_file", detail: "vite.config.* found" });
        if (evidence.length > 0)
            candidates.push({ name: "vite", kind: "build_tool", evidence });
    }
    // --- Express ---
    {
        const evidence = [];
        if (ev.deps.has("express"))
            evidence.push({ dimension: "dependency_manifest", detail: "express found in dependencies" });
        if (ev.importedModules.has("express"))
            evidence.push({ dimension: "import_pattern", detail: "express imported in source" });
        if (ev.pathFacts.hasRoutesDir)
            evidence.push({ dimension: "path_pattern", detail: "routes/ directory" });
        if (evidence.length > 0)
            candidates.push({ name: "express", kind: "web_framework", evidence });
    }
    // --- Fastify ---
    {
        const evidence = [];
        if (ev.deps.has("fastify"))
            evidence.push({ dimension: "dependency_manifest", detail: "fastify found in dependencies" });
        if (ev.importedModules.has("fastify"))
            evidence.push({ dimension: "import_pattern", detail: "fastify imported in source" });
        if (evidence.length > 0)
            candidates.push({ name: "fastify", kind: "api_framework", evidence });
    }
    // --- NestJS ---
    {
        const evidence = [];
        if (ev.deps.has("@nestjs/core"))
            evidence.push({ dimension: "dependency_manifest", detail: "@nestjs/core found in dependencies" });
        if (ev.pathFacts.hasNestCliJson)
            evidence.push({ dimension: "config_file", detail: "nest-cli.json found" });
        if (ev.pathFacts.hasModulesDir || ev.pathFacts.hasControllersDir)
            evidence.push({ dimension: "path_pattern", detail: "modules/ or controllers/ directory (NestJS pattern)" });
        if (ev.importedModules.has("@nestjs/core") || ev.importedModules.has("@nestjs/common"))
            evidence.push({ dimension: "import_pattern", detail: "@nestjs/* imported in source" });
        if (evidence.length > 0)
            candidates.push({ name: "nestjs", kind: "api_framework", evidence });
    }
    // --- Vitest ---
    {
        const evidence = [];
        if (ev.deps.has("vitest") || ev.devDeps.has("vitest"))
            evidence.push({ dimension: "dependency_manifest", detail: "vitest found in dependencies" });
        if (ev.configKinds.has("vitest"))
            evidence.push({ dimension: "config_file", detail: "vitest.config.* found" });
        if (evidence.length > 0)
            candidates.push({ name: "vitest", kind: "test_framework", evidence });
    }
    // --- Jest ---
    {
        const evidence = [];
        if (ev.deps.has("jest") || ev.devDeps.has("jest"))
            evidence.push({ dimension: "dependency_manifest", detail: "jest found in dependencies" });
        if (ev.configKinds.has("jest"))
            evidence.push({ dimension: "config_file", detail: "jest.config.* found" });
        if (evidence.length > 0)
            candidates.push({ name: "jest", kind: "test_framework", evidence });
    }
    // --- Playwright ---
    {
        const evidence = [];
        if (ev.deps.has("@playwright/test") || ev.devDeps.has("@playwright/test"))
            evidence.push({ dimension: "dependency_manifest", detail: "@playwright/test found in dependencies" });
        if (evidence.length > 0)
            candidates.push({ name: "playwright", kind: "test_framework", evidence });
    }
    // --- Prisma ---
    {
        const evidence = [];
        if (ev.deps.has("@prisma/client") || ev.deps.has("prisma"))
            evidence.push({ dimension: "dependency_manifest", detail: "prisma found in dependencies" });
        if (ev.importedModules.has("@prisma/client"))
            evidence.push({ dimension: "import_pattern", detail: "@prisma/client imported" });
        if (evidence.length > 0)
            candidates.push({ name: "prisma", kind: "orm", evidence });
    }
    // --- Commander/Yargs (CLI) ---
    {
        const evidence = [];
        if (ev.deps.has("commander") || ev.deps.has("yargs") || ev.deps.has("oclif") || ev.deps.has("cac")) {
            evidence.push({ dimension: "dependency_manifest", detail: "CLI framework found in dependencies" });
        }
        if (ev.importedModules.has("commander") || ev.importedModules.has("yargs")) {
            evidence.push({ dimension: "import_pattern", detail: "CLI framework imported" });
        }
        if (evidence.length > 0)
            candidates.push({ name: "commander/yargs", kind: "cli_framework", evidence });
    }
    return candidates.map(c => ({
        name: c.name,
        kind: c.kind,
        confidence: computeConfidence(c.evidence),
        evidence: c.evidence,
    }));
}
// ---------------------------------------------------------------------------
// Project role detection
// ---------------------------------------------------------------------------
function detectProjectRoles(ev, layout, packageJsonFields) {
    const roles = [];
    // Frontend app
    {
        const evidence = [];
        if (layout.primary_layout === "next_app" || layout.primary_layout === "react_vite_app") {
            evidence.push({ dimension: "layout_classification", detail: `Layout classified as ${layout.primary_layout}` });
        }
        if (ev.deps.has("react") && ev.pathFacts.hasTsxFiles) {
            evidence.push({ dimension: "dependency_manifest", detail: "React + TSX files" });
        }
        if (ev.pathFacts.hasComponentsDir) {
            evidence.push({ dimension: "path_pattern", detail: "components/ directory" });
        }
        if (evidence.length >= 2) {
            roles.push({ role: "frontend_app", confidence: computeConfidence(evidence), evidence });
        }
    }
    // API/Service backend
    {
        const evidence = [];
        if (layout.primary_layout === "node_service" || layout.primary_layout === "nestjs_service") {
            evidence.push({ dimension: "layout_classification", detail: `Layout classified as ${layout.primary_layout}` });
        }
        if (ev.deps.has("express") || ev.deps.has("fastify") || ev.deps.has("@nestjs/core") || ev.deps.has("koa")) {
            evidence.push({ dimension: "dependency_manifest", detail: "Server framework in dependencies" });
        }
        if (ev.pathFacts.hasRoutesDir || ev.pathFacts.hasControllersDir) {
            evidence.push({ dimension: "path_pattern", detail: "routes/ or controllers/ directory" });
        }
        if (evidence.length > 0) {
            roles.push({ role: "service_backend", confidence: computeConfidence(evidence), evidence });
        }
    }
    // SDK / Library
    {
        const evidence = [];
        if (layout.primary_layout === "typescript_sdk") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as typescript_sdk" });
        }
        if (ev.pathFacts.hasIndexTs && !ev.deps.has("next") && !ev.deps.has("express")) {
            evidence.push({ dimension: "path_pattern", detail: "index.ts export without web framework" });
        }
        const pkg = packageJsonFields || {};
        if (pkg.exports || pkg.types || pkg.module || pkg.main) {
            evidence.push({ dimension: "dependency_manifest", detail: "package.json defines exports/types/main" });
        }
        if (ev.pathFacts.hasTsupConfig || ev.pathFacts.hasTsconfigBuild) {
            evidence.push({ dimension: "config_file", detail: "tsup or tsconfig.build config found" });
        }
        if (evidence.length > 0) {
            roles.push({ role: "typescript_sdk_library", confidence: computeConfidence(evidence), evidence });
        }
    }
    // CLI tool
    {
        const evidence = [];
        if (layout.primary_layout === "cli_tool") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as cli_tool" });
        }
        if (ev.deps.has("commander") || ev.deps.has("yargs") || ev.deps.has("oclif") || ev.deps.has("cac") || ev.deps.has("clipanion") || ev.deps.has("meow")) {
            evidence.push({ dimension: "dependency_manifest", detail: "CLI framework in dependencies" });
        }
        const pkg = packageJsonFields || {};
        if (pkg.bin) {
            evidence.push({ dimension: "dependency_manifest", detail: "package.json defines bin" });
        }
        if (ev.pathFacts.hasMainTs || ev.pathFacts.hasCliTs) {
            evidence.push({ dimension: "path_pattern", detail: "main.ts/cli.ts entry point" });
        }
        if (evidence.length >= 2) {
            roles.push({ role: "cli_application", confidence: computeConfidence(evidence), evidence });
        }
    }
    // GitHub Action
    {
        const evidence = [];
        if (layout.primary_layout === "github_action") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as github_action" });
        }
        if (ev.pathFacts.hasActionYml) {
            evidence.push({ dimension: "config_file", detail: "action.yml present" });
        }
        if (ev.pathFacts.hasDistDir) {
            evidence.push({ dimension: "path_pattern", detail: "dist/ directory (bundled action)" });
        }
        if (evidence.length >= 2) {
            roles.push({ role: "github_action", confidence: computeConfidence(evidence), evidence });
        }
    }
    // Fullstack app
    {
        const evidence = [];
        if (layout.primary_layout === "fullstack_app") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as fullstack_app" });
        }
        const hasFrontend = ev.deps.has("react") || ev.deps.has("next");
        const hasBackend = ev.deps.has("express") || ev.deps.has("fastify") || ev.deps.has("@nestjs/core");
        if (hasFrontend && hasBackend) {
            evidence.push({ dimension: "dependency_manifest", detail: "Both frontend (React/Next) and backend (Express/Fastify/NestJS) deps" });
        }
        if (evidence.length >= 2) {
            roles.push({ role: "fullstack_application", confidence: computeConfidence(evidence), evidence });
        }
    }
    return roles;
}
// ---------------------------------------------------------------------------
// Confidence rules (identical to Python)
// ---------------------------------------------------------------------------
function computeConfidence(evidence) {
    const dimensions = new Set(evidence.map(e => e.dimension));
    if (dimensions.size >= 2)
        return "high";
    if (dimensions.size === 1)
        return "medium";
    return "low";
}
//# sourceMappingURL=typescriptFrameworkDetector.js.map