/**
 * P27-1b: Python Layout Classifier
 *
 * Classifies the physical organization (layout) of a Python repository
 * into two orthogonal dimensions:
 *
 *   1. primary_layout — project form (django_project, api_service, library_package, etc.)
 *   2. package_layout — Python packaging structure (src_layout, flat_package, etc.)
 *
 * Uses only paths, file buckets, and manifest presence — NOT framework role inference.
 * Framework/project-role detection is deferred to P27-1c.
 */
export function classifyPythonLayout(input) {
    const signals = [];
    const unknowns = [];
    // Build bucket summary
    const bucketSummary = {};
    for (const f of input.files) {
        bucketSummary[f.bucket] = (bucketSummary[f.bucket] ?? 0) + 1;
    }
    // Collect structural facts
    const facts = extractStructuralFacts(input.allPaths, input.files, input.manifests);
    // Classify package layout (independent of primary layout)
    const { packageLayout, packageSignals, packageUnknowns } = classifyPackageLayout(facts);
    signals.push(...packageSignals);
    unknowns.push(...packageUnknowns);
    // Classify primary layout
    const { primaryLayout, primarySignals, primaryUnknowns } = classifyPrimaryLayout(facts, packageLayout);
    signals.push(...primarySignals);
    unknowns.push(...primaryUnknowns);
    // Compute confidence
    const strongCount = signals.filter(s => s.weight === "strong").length;
    const moderateCount = signals.filter(s => s.weight === "moderate").length;
    const confidence = strongCount >= 2 ? "high" :
        strongCount >= 1 || moderateCount >= 2 ? "medium" :
            "low";
    return {
        primary_layout: primaryLayout,
        package_layout: packageLayout,
        confidence,
        signals,
        unknowns,
        bucket_summary: bucketSummary,
    };
}
function extractStructuralFacts(allPaths, files, manifests) {
    const pathSet = new Set(allPaths);
    // Detect root-level __init__.py packages (flat_package indicator)
    const rootInitPyPackages = [];
    const srcInitPyPackages = [];
    const srcNamespacePackages = new Set();
    for (const p of allPaths) {
        const match = /^([^/]+)\/__init__\.py$/.exec(p);
        if (match && match[1] !== "tests" && match[1] !== "test" && match[1] !== "docs") {
            rootInitPyPackages.push(match[1]);
        }
        const srcMatch = /^src\/([^/]+)\/__init__\.py$/.exec(p);
        if (srcMatch) {
            srcInitPyPackages.push(srcMatch[1]);
        }
        const srcNamespaceMatch = /^src\/([^/]+)\/.+\.pyi?$/.exec(p);
        if (srcNamespaceMatch && !p.endsWith("/__init__.py")) {
            srcNamespacePackages.add(srcNamespaceMatch[1]);
        }
    }
    // Top-level .py files (not inside any subdirectory)
    const topLevelPyFiles = allPaths.filter(p => !p.includes("/") && p.endsWith(".py"));
    // Bucket counts
    const migrationCount = files.filter(f => f.bucket === "migration").length;
    const testCount = files.filter(f => f.bucket === "test").length;
    const sourceCount = files.filter(f => f.bucket === "source").length;
    const totalPyFiles = files.filter(f => f.extension === ".py" || f.extension === ".pyi").length;
    // Test directory pattern
    const hasTopTests = allPaths.some(p => p.startsWith("tests/") || p.startsWith("test/"));
    const hasNestedTests = allPaths.some(p => /^[^/]+\/tests\//.test(p) || /^[^/]+\/test\//.test(p));
    const testDirPattern = hasTopTests && hasNestedTests ? "mixed" :
        hasTopTests ? "top_level" :
            hasNestedTests ? "nested" :
                "none";
    // CLI signals
    const hasCli = allPaths.some(p => p === "cli.py" || p.includes("/cli.py") || p.includes("/cli/") ||
        p === "__main__.py" || p.includes("/__main__.py") ||
        topLevelPyFiles.includes("__main__.py"));
    // Data pipeline signals (paths only, not imports)
    const hasDataPipeline = allPaths.some(p => p.includes("/pipelines/") || p.includes("/pipeline/") ||
        p.includes("/dags/") || p.includes("/etl/") ||
        p.includes("/data/") && p.endsWith(".py"));
    // ML signals (paths only)
    const hasMLSignals = allPaths.some(p => p.includes("/models/") && (p.includes("train") || p.includes("predict") || p.includes("infer")) ||
        p.includes("/notebooks/") || p.includes("/experiments/"));
    return {
        hasSrcDir: allPaths.some(p => p.startsWith("src/")),
        hasManagePy: pathSet.has("manage.py"),
        hasAppDir: allPaths.some(p => p.startsWith("app/") && p.endsWith(".py")),
        hasAlembicDir: allPaths.some(p => p.startsWith("alembic/")),
        hasDjangoMigrations: allPaths.some(p => p.includes("/migrations/") && p.endsWith(".py")),
        hasSetupPyOrCfg: pathSet.has("setup.py") || pathSet.has("setup.cfg"),
        hasPyprojectToml: pathSet.has("pyproject.toml"),
        hasPyTyped: allPaths.some(p => p.endsWith("/py.typed") || p === "py.typed"),
        hasDocDir: allPaths.some(p => p.startsWith("docs/")),
        hasNotebooks: files.some(f => f.bucket === "notebook" || f.extension === ".ipynb"),
        hasConftest: pathSet.has("conftest.py") || allPaths.some(p => p.endsWith("/conftest.py")),
        rootInitPyPackages,
        srcInitPyPackages,
        srcNamespacePackages: [...srcNamespacePackages].filter(name => !srcInitPyPackages.includes(name)).sort(),
        topLevelPyFiles,
        migrationCount,
        testCount,
        sourceCount,
        totalPyFiles,
        testDirPattern,
        hasMultipleTopPackages: rootInitPyPackages.length > 1,
        hasCli,
        hasDataPipeline,
        hasMLSignals,
    };
}
// ---------------------------------------------------------------------------
// Package layout classification
// ---------------------------------------------------------------------------
function classifyPackageLayout(facts) {
    const signals = [];
    const unknowns = [];
    // src layout: src/<package>/__init__.py
    if (facts.hasSrcDir && facts.srcInitPyPackages.length > 0) {
        signals.push({
            signal: "src_layout_detected",
            weight: "strong",
            evidence: `src/ directory with package(s): ${facts.srcInitPyPackages.join(", ")}`,
        });
        return { packageLayout: "src_layout", packageSignals: signals, packageUnknowns: unknowns };
    }
    if (facts.hasSrcDir && facts.srcNamespacePackages.length > 0) {
        signals.push({
            signal: "namespace_package_detected",
            weight: "strong",
            evidence: `src/ namespace package(s) without __init__.py: ${facts.srcNamespacePackages.join(", ")}`,
        });
        return { packageLayout: "namespace_package", packageSignals: signals, packageUnknowns: unknowns };
    }
    // Django app layout: multiple top-level packages with migrations
    if (facts.hasDjangoMigrations && facts.hasManagePy && facts.rootInitPyPackages.length >= 1) {
        signals.push({
            signal: "django_app_layout_detected",
            weight: "strong",
            evidence: `Django manage.py + migrations + packages: ${facts.rootInitPyPackages.join(", ")}`,
        });
        return { packageLayout: "django_app_layout", packageSignals: signals, packageUnknowns: unknowns };
    }
    // Flat package: single or multiple top-level __init__.py packages
    if (facts.rootInitPyPackages.length >= 1) {
        signals.push({
            signal: "flat_package_detected",
            weight: "strong",
            evidence: `Root-level package(s) with __init__.py: ${facts.rootInitPyPackages.join(", ")}`,
        });
        return { packageLayout: "flat_package", packageSignals: signals, packageUnknowns: unknowns };
    }
    // app/ directory without __init__.py at root — common in FastAPI/Flask service layouts
    if (facts.hasAppDir) {
        signals.push({
            signal: "app_directory_layout",
            weight: "moderate",
            evidence: "app/ directory with Python files (service-style layout)",
        });
        return { packageLayout: "flat_package", packageSignals: signals, packageUnknowns: unknowns };
    }
    // Only top-level .py files, no package structure
    if (facts.topLevelPyFiles.length > 0 && facts.rootInitPyPackages.length === 0) {
        signals.push({
            signal: "loose_scripts_only",
            weight: "weak",
            evidence: `${facts.topLevelPyFiles.length} top-level .py files without package __init__.py`,
        });
        unknowns.push({
            aspect: "package_layout",
            reason: "No package structure detected; only loose scripts",
        });
        return { packageLayout: "unknown", packageSignals: signals, packageUnknowns: unknowns };
    }
    unknowns.push({
        aspect: "package_layout",
        reason: "Unable to determine package layout from file paths",
    });
    return { packageLayout: "unknown", packageSignals: signals, packageUnknowns: unknowns };
}
// ---------------------------------------------------------------------------
// Primary layout classification
// ---------------------------------------------------------------------------
function classifyPrimaryLayout(facts, packageLayout) {
    const signals = [];
    const unknowns = [];
    // Score-based: accumulate evidence for each candidate
    const scores = {
        django_project: 0,
        api_service: 0,
        library_package: 0,
        cli_app: 0,
        data_pipeline: 0,
        ml_project: 0,
        monorepo: 0,
        mixed: 0,
        unknown: 0,
    };
    // --- Django project signals ---
    if (facts.hasManagePy) {
        scores.django_project += 3;
        signals.push({ signal: "manage_py_found", weight: "strong", evidence: "manage.py in repo root" });
    }
    if (facts.hasDjangoMigrations) {
        scores.django_project += 2;
        signals.push({ signal: "django_migrations_found", weight: "moderate", evidence: `${facts.migrationCount} migration files` });
    }
    if (packageLayout === "django_app_layout") {
        scores.django_project += 2;
    }
    // --- API service signals ---
    if (facts.hasAppDir && !facts.hasManagePy) {
        scores.api_service += 2;
        signals.push({ signal: "app_dir_without_manage_py", weight: "moderate", evidence: "app/ directory without Django manage.py" });
    }
    if (facts.hasAlembicDir) {
        scores.api_service += 1;
        signals.push({ signal: "alembic_dir_found", weight: "moderate", evidence: "alembic/ migration directory (non-Django)" });
    }
    // --- Library package signals ---
    if (facts.hasPyTyped) {
        scores.library_package += 2;
        signals.push({ signal: "py_typed_marker", weight: "strong", evidence: "py.typed marker file (PEP 561 typed package)" });
    }
    if (facts.hasSetupPyOrCfg || facts.hasPyprojectToml) {
        // Having packaging config is necessary but not sufficient for library
        if (!facts.hasManagePy && !facts.hasAppDir && !facts.hasDjangoMigrations) {
            scores.library_package += 1;
            signals.push({ signal: "packaging_config_no_framework", weight: "weak", evidence: "Packaging config present without framework indicators" });
        }
    }
    if (facts.hasDocDir && !facts.hasManagePy) {
        scores.library_package += 1;
        signals.push({ signal: "docs_directory", weight: "weak", evidence: "docs/ directory suggests library documentation" });
    }
    if (facts.testDirPattern === "top_level" && !facts.hasManagePy && !facts.hasAppDir) {
        scores.library_package += 1;
        signals.push({ signal: "top_level_tests_pattern", weight: "weak", evidence: "Top-level tests/ directory typical of library packages" });
    }
    // Single root package with py.typed = very likely library
    if (facts.rootInitPyPackages.length === 1 && facts.hasPyTyped) {
        scores.library_package += 2;
    }
    // --- CLI app signals ---
    if (facts.hasCli) {
        scores.cli_app += 2;
        signals.push({ signal: "cli_entry_point", weight: "moderate", evidence: "CLI entry point detected (__main__.py or cli.py)" });
    }
    // --- Data pipeline signals ---
    if (facts.hasDataPipeline) {
        scores.data_pipeline += 2;
        signals.push({ signal: "pipeline_structure", weight: "moderate", evidence: "Pipeline/DAG/ETL directory structure" });
    }
    // --- ML project signals ---
    if (facts.hasMLSignals) {
        scores.ml_project += 2;
        signals.push({ signal: "ml_project_structure", weight: "moderate", evidence: "ML-related paths (train/predict/experiments)" });
    }
    if (facts.hasNotebooks) {
        scores.ml_project += 1;
        signals.push({ signal: "jupyter_notebooks", weight: "weak", evidence: "Jupyter notebooks present" });
    }
    // --- Monorepo signals ---
    if (facts.hasMultipleTopPackages && facts.rootInitPyPackages.length >= 3) {
        scores.monorepo += 2;
        signals.push({ signal: "multiple_top_packages", weight: "moderate", evidence: `${facts.rootInitPyPackages.length} top-level packages: ${facts.rootInitPyPackages.join(", ")}` });
    }
    // Find winner
    const candidates = Object.entries(scores)
        .filter(([key]) => key !== "unknown" && key !== "mixed")
        .sort(([, a], [, b]) => b - a);
    if (candidates.length === 0 || candidates[0][1] === 0) {
        unknowns.push({
            aspect: "primary_layout",
            reason: "No structural signals matched known project forms",
        });
        return { primaryLayout: "unknown", primarySignals: signals, primaryUnknowns: unknowns };
    }
    const [topName, topScore] = candidates[0];
    const [, secondScore] = candidates.length > 1 ? candidates[1] : ["", 0];
    // If top two are close, consider "mixed"
    if (topScore > 0 && secondScore > 0 && topScore - secondScore <= 1) {
        signals.push({
            signal: "ambiguous_layout",
            weight: "weak",
            evidence: `Close scores: ${candidates[0][0]}=${topScore}, ${candidates[1]?.[0]}=${secondScore}`,
        });
        // Still pick the winner unless truly tied
        if (topScore === secondScore) {
            unknowns.push({
                aspect: "primary_layout",
                reason: `Tied between ${candidates[0][0]} and ${candidates[1][0]}`,
            });
            return { primaryLayout: "mixed", primarySignals: signals, primaryUnknowns: unknowns };
        }
    }
    return { primaryLayout: topName, primarySignals: signals, primaryUnknowns: unknowns };
}
//# sourceMappingURL=pythonLayoutClassifier.js.map