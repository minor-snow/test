/**
 * P27-1c: Python Framework & Project-Role Detector
 *
 * Detects frameworks and project roles from multiple evidence dimensions:
 *   1. dependency_manifest — packages declared in manifests
 *   2. layout_classification — primary_layout / package_layout from P27-1b
 *   3. path_pattern — structural path patterns (manage.py, migrations/, etc.)
 *   4. import_pattern — what top-level modules are imported
 *
 * Hard rules:
 *   - At least 2 evidence dimensions required for "high" confidence
 *   - Dependency-only evidence caps at "medium"
 *   - pytest is "test_framework" kind, never a project role
 *   - Unknown outputs when no framework/role can be determined
 *   - Does NOT modify layout, test mapping, or risk presets
 */
export function detectPythonFrameworkProfile(input) {
    // Collect all available evidence
    const evidence = collectEvidence(input);
    // Detect frameworks
    const frameworkSignals = detectFrameworks(evidence);
    // Detect project roles
    const projectRoleSignals = detectProjectRoles(evidence, input.layout);
    // Build unknowns
    const unknowns = [];
    if (frameworkSignals.length === 0) {
        unknowns.push({
            kind: "unknown_framework_or_domain_role",
            reason: "No framework could be detected from dependencies, paths, or imports",
        });
    }
    if (projectRoleSignals.length === 0) {
        unknowns.push({
            kind: "unknown_framework_or_domain_role",
            reason: "No project role could be inferred from layout, dependencies, or path families",
        });
    }
    return {
        framework_signals: frameworkSignals,
        project_role_signals: projectRoleSignals,
        unknowns,
    };
}
function collectEvidence(input) {
    // Declared packages (main + dev, normalized to lowercase)
    const declaredPackages = new Set();
    const devPackages = new Set();
    for (const m of input.manifests) {
        for (const p of m.packages)
            declaredPackages.add(p.toLowerCase());
        for (const p of m.dev_packages)
            devPackages.add(p.toLowerCase());
    }
    // Imported top-level modules
    const importedModules = new Set();
    for (const imp of input.imports) {
        if (imp.status === "declared_package" || imp.status === "undeclared_package") {
            importedModules.add(imp.top_level_module.toLowerCase());
        }
    }
    // Path-based facts
    const pathSet = new Set(input.allPaths);
    const pathFamilies = new Set();
    // Detect commerce/domain path families
    const domainFamilyPatterns = [
        { pattern: /\bcheckout\b/i, family: "checkout" },
        { pattern: /\bpayment\b/i, family: "payment" },
        { pattern: /\border\b/i, family: "order" },
        { pattern: /\bcart\b/i, family: "cart" },
        { pattern: /\bdiscount\b/i, family: "discount" },
        { pattern: /\binvoice\b/i, family: "invoice" },
        { pattern: /\bshipping\b/i, family: "shipping" },
        { pattern: /\bwarehouse\b/i, family: "warehouse" },
        { pattern: /\baccount\b/i, family: "account" },
        { pattern: /\bauth\b/i, family: "auth" },
        { pattern: /\bgraphql\b/i, family: "graphql" },
        { pattern: /\bapi\b/i, family: "api" },
    ];
    for (const p of input.allPaths) {
        for (const { pattern, family } of domainFamilyPatterns) {
            if (pattern.test(p))
                pathFamilies.add(family);
        }
    }
    const pathFacts = {
        hasManagePy: pathSet.has("manage.py"),
        hasMigrations: input.allPaths.some(p => p.includes("/migrations/") && p.endsWith(".py")),
        hasAlembicDir: input.allPaths.some(p => p.startsWith("alembic/")),
        hasAppDir: input.allPaths.some(p => p.startsWith("app/") && p.endsWith(".py")),
        hasCli: input.allPaths.some(p => p === "cli.py" || p.includes("/cli.py") || p.includes("/cli/") ||
            p === "__main__.py" || p.includes("/__main__.py")),
        hasMainPy: pathSet.has("__main__.py") || input.allPaths.some(p => p.includes("/__main__.py")),
        hasPyTyped: input.allPaths.some(p => p.endsWith("/py.typed") || p === "py.typed"),
        hasDocsDir: input.allPaths.some(p => p.startsWith("docs/")),
        hasSetupPy: pathSet.has("setup.py"),
        hasPyprojectToml: pathSet.has("pyproject.toml"),
        hasGraphqlDir: input.allPaths.some(p => p.includes("/graphql/")),
        hasApiDir: input.allPaths.some(p => p.startsWith("api/") || p.includes("/api/")),
        pathFamilies,
    };
    return { declaredPackages, devPackages, importedModules, pathFacts };
}
function detectFrameworks(ev) {
    const candidates = [];
    // --- Django ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("django"))
            evidence.push({ dimension: "dependency_manifest", detail: "django found in dependency manifests" });
        if (ev.pathFacts.hasManagePy)
            evidence.push({ dimension: "path_pattern", detail: "manage.py found in repo root" });
        if (ev.pathFacts.hasMigrations)
            evidence.push({ dimension: "path_pattern", detail: "Django-style migrations/ directories found" });
        if (ev.importedModules.has("django"))
            evidence.push({ dimension: "import_pattern", detail: "django imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "django", kind: "web_framework", evidence });
    }
    // --- FastAPI ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("fastapi"))
            evidence.push({ dimension: "dependency_manifest", detail: "fastapi found in dependency manifests" });
        if (ev.importedModules.has("fastapi"))
            evidence.push({ dimension: "import_pattern", detail: "fastapi imported in source files" });
        if (ev.pathFacts.hasAppDir && !ev.pathFacts.hasManagePy)
            evidence.push({ dimension: "path_pattern", detail: "app/ directory without manage.py (service pattern)" });
        if (evidence.length > 0)
            candidates.push({ name: "fastapi", kind: "web_framework", evidence });
    }
    // --- Flask ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("flask"))
            evidence.push({ dimension: "dependency_manifest", detail: "flask found in dependency manifests" });
        if (ev.importedModules.has("flask"))
            evidence.push({ dimension: "import_pattern", detail: "flask imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "flask", kind: "web_framework", evidence });
    }
    // --- pytest ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("pytest") || ev.devPackages.has("pytest")) {
            evidence.push({ dimension: "dependency_manifest", detail: "pytest found in dependency manifests" });
        }
        if (ev.importedModules.has("pytest"))
            evidence.push({ dimension: "import_pattern", detail: "pytest imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "pytest", kind: "test_framework", evidence });
    }
    // --- click ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("click"))
            evidence.push({ dimension: "dependency_manifest", detail: "click found in dependency manifests" });
        if (ev.importedModules.has("click"))
            evidence.push({ dimension: "import_pattern", detail: "click imported in source files" });
        if (ev.pathFacts.hasCli)
            evidence.push({ dimension: "path_pattern", detail: "CLI entry points detected" });
        if (evidence.length > 0)
            candidates.push({ name: "click", kind: "cli_framework", evidence });
    }
    // --- typer ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("typer"))
            evidence.push({ dimension: "dependency_manifest", detail: "typer found in dependency manifests" });
        if (ev.importedModules.has("typer"))
            evidence.push({ dimension: "import_pattern", detail: "typer imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "typer", kind: "cli_framework", evidence });
    }
    // --- SQLAlchemy ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("sqlalchemy"))
            evidence.push({ dimension: "dependency_manifest", detail: "sqlalchemy found in dependency manifests" });
        if (ev.importedModules.has("sqlalchemy"))
            evidence.push({ dimension: "import_pattern", detail: "sqlalchemy imported in source files" });
        if (ev.pathFacts.hasAlembicDir)
            evidence.push({ dimension: "path_pattern", detail: "alembic/ migration directory present" });
        if (evidence.length > 0)
            candidates.push({ name: "sqlalchemy", kind: "orm", evidence });
    }
    // --- Celery ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("celery"))
            evidence.push({ dimension: "dependency_manifest", detail: "celery found in dependency manifests" });
        if (ev.importedModules.has("celery"))
            evidence.push({ dimension: "import_pattern", detail: "celery imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "celery", kind: "task_queue", evidence });
    }
    // --- httpx (as framework/library, not role) ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("httpx"))
            evidence.push({ dimension: "dependency_manifest", detail: "httpx found in dependency manifests" });
        if (ev.importedModules.has("httpx"))
            evidence.push({ dimension: "import_pattern", detail: "httpx imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "httpx", kind: "http_client", evidence });
    }
    // --- Airflow ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("apache-airflow") || ev.declaredPackages.has("airflow")) {
            evidence.push({ dimension: "dependency_manifest", detail: "airflow found in dependency manifests" });
        }
        if (ev.importedModules.has("airflow"))
            evidence.push({ dimension: "import_pattern", detail: "airflow imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "airflow", kind: "async_framework", evidence });
    }
    // --- Prefect ---
    {
        const evidence = [];
        if (ev.declaredPackages.has("prefect"))
            evidence.push({ dimension: "dependency_manifest", detail: "prefect found in dependency manifests" });
        if (ev.importedModules.has("prefect"))
            evidence.push({ dimension: "import_pattern", detail: "prefect imported in source files" });
        if (evidence.length > 0)
            candidates.push({ name: "prefect", kind: "async_framework", evidence });
    }
    // Apply confidence rules
    return candidates.map(c => ({
        name: c.name,
        kind: c.kind,
        confidence: computeFrameworkConfidence(c.evidence),
        evidence: c.evidence,
    }));
}
/**
 * Confidence rules:
 *   - 2+ distinct dimensions → "high"
 *   - 1 dimension only (dependency-only, path-only, or import-only) → "medium"
 *   - This ensures dependency-only never exceeds "medium" per hard rule
 */
function computeFrameworkConfidence(evidence) {
    const dimensions = new Set(evidence.map(e => e.dimension));
    if (dimensions.size >= 2)
        return "high";
    if (dimensions.size === 1)
        return "medium";
    return "low";
}
// ---------------------------------------------------------------------------
// Project role detection
// ---------------------------------------------------------------------------
function detectProjectRoles(ev, layout) {
    const roles = [];
    // Commerce backend detection
    {
        const evidence = [];
        const commerceFamilies = ["checkout", "payment", "order", "cart", "discount", "invoice", "shipping", "warehouse"];
        const matchedFamilies = commerceFamilies.filter(f => ev.pathFacts.pathFamilies.has(f));
        if (matchedFamilies.length >= 3) {
            evidence.push({ dimension: "path_pattern", detail: `Commerce path families: ${matchedFamilies.join(", ")}` });
        }
        if (layout.primary_layout === "django_project") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as django_project" });
        }
        if (ev.declaredPackages.has("django") && matchedFamilies.length >= 2) {
            evidence.push({ dimension: "dependency_manifest", detail: "Django with commerce-domain directories" });
        }
        if (evidence.length > 0) {
            roles.push({
                role: "commerce_backend",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // API/Service backend detection
    {
        const evidence = [];
        if (layout.primary_layout === "api_service") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as api_service" });
        }
        if (ev.declaredPackages.has("fastapi") || ev.declaredPackages.has("flask") || ev.declaredPackages.has("starlette")) {
            evidence.push({ dimension: "dependency_manifest", detail: "API framework found in dependencies" });
        }
        if (ev.pathFacts.hasAppDir && !ev.pathFacts.hasManagePy) {
            evidence.push({ dimension: "path_pattern", detail: "app/ directory without manage.py (service layout)" });
        }
        if (ev.pathFacts.hasAlembicDir) {
            evidence.push({ dimension: "path_pattern", detail: "Alembic migrations (service DB pattern)" });
        }
        if (ev.pathFacts.hasApiDir) {
            evidence.push({ dimension: "path_pattern", detail: "api/ directory present" });
        }
        // Avoid double-counting: don't label as service_backend if already strong commerce_backend
        const commerceEvDims = new Set(roles.find(r => r.role === "commerce_backend")?.evidence.map(e => e.dimension) ?? []);
        const isStrongCommerce = commerceEvDims.size >= 2;
        if (evidence.length > 0 && !isStrongCommerce) {
            roles.push({
                role: "service_backend",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // Python SDK / Library detection
    {
        const evidence = [];
        if (layout.primary_layout === "library_package") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as library_package" });
        }
        if (ev.pathFacts.hasPyTyped) {
            evidence.push({ dimension: "path_pattern", detail: "py.typed marker (PEP 561 typed package)" });
        }
        if (ev.pathFacts.hasDocsDir && !ev.pathFacts.hasManagePy && !ev.pathFacts.hasAppDir) {
            evidence.push({ dimension: "path_pattern", detail: "docs/ directory without web framework signals" });
        }
        if ((ev.pathFacts.hasSetupPy || ev.pathFacts.hasPyprojectToml) && !ev.pathFacts.hasManagePy) {
            evidence.push({ dimension: "dependency_manifest", detail: "Packaging config without web framework" });
        }
        if (evidence.length > 0) {
            roles.push({
                role: "python_sdk_library",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // HTTP client library detection (specific sub-role of sdk_library)
    {
        const evidence = [];
        // Check if the project's own package is an HTTP client
        if (ev.declaredPackages.has("httpx") || ev.declaredPackages.has("httpcore")) {
            // This is httpx as a dependency, but for httpx itself, check path patterns
        }
        if (ev.importedModules.has("httpcore") || ev.declaredPackages.has("httpcore")) {
            evidence.push({ dimension: "dependency_manifest", detail: "httpcore dependency (HTTP transport layer)" });
        }
        if (ev.pathFacts.pathFamilies.has("api") && layout.primary_layout === "library_package") {
            evidence.push({ dimension: "path_pattern", detail: "API-related paths in library package" });
        }
        // Check for HTTP-specific path patterns
        const httpPaths = ["_transports", "_client", "_models", "_urls", "_content"];
        const hasHttpPaths = httpPaths.some(p => ev.pathFacts.pathFamilies.has(p) || // unlikely via families
            // fallback: check raw paths
            false);
        // Use layout + dependency as dimensions for HTTP client role
        if (layout.primary_layout === "library_package" && ev.declaredPackages.has("httpcore")) {
            evidence.push({ dimension: "layout_classification", detail: "Library package with HTTP core dependency" });
        }
        if (evidence.length >= 2) {
            roles.push({
                role: "http_client_library",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    // CLI app detection
    {
        const evidence = [];
        if (layout.primary_layout === "cli_app") {
            evidence.push({ dimension: "layout_classification", detail: "Layout classified as cli_app" });
        }
        if (ev.pathFacts.hasCli || ev.pathFacts.hasMainPy) {
            evidence.push({ dimension: "path_pattern", detail: "CLI entry points (__main__.py or cli.py)" });
        }
        if (ev.declaredPackages.has("click") || ev.declaredPackages.has("typer") || ev.declaredPackages.has("argparse")) {
            evidence.push({ dimension: "dependency_manifest", detail: "CLI framework in dependencies" });
        }
        if (evidence.length >= 2) {
            roles.push({
                role: "cli_application",
                confidence: computeRoleConfidence(evidence),
                evidence,
            });
        }
    }
    return roles;
}
/**
 * Role confidence rules (same as framework):
 *   - 2+ distinct dimensions → "high"
 *   - 1 dimension only → "medium"
 */
function computeRoleConfidence(evidence) {
    const dimensions = new Set(evidence.map(e => e.dimension));
    if (dimensions.size >= 2)
        return "high";
    if (dimensions.size === 1)
        return "medium";
    return "low";
}
//# sourceMappingURL=pythonFrameworkDetector.js.map