/**
 * P28c: TypeScript/JavaScript Project Layout Classifier
 *
 * Classifies a TS/JS repository's primary layout from structural signals.
 * Does NOT use AST or compiler API — only manifest + path + config signals.
 *
 * P28c-1.1: Path-based signals use runtime-only paths (excluding test/fixtures/examples).
 */
export function classifyTypeScriptProject(input) {
    const signals = [];
    const unknowns = [];
    const pathSet = new Set(input.allPaths);
    const deps = new Set();
    const devDeps = new Set();
    // Check package.json for bin and workspaces
    let hasBinField = !!input.packageJsonBin;
    let hasWorkspaces = !!input.packageJsonWorkspaces;
    for (const m of input.manifests) {
        for (const p of m.dependencies)
            deps.add(p.toLowerCase());
        for (const p of m.dev_dependencies)
            devDeps.add(p.toLowerCase());
    }
    // P28c-1.1: Filter to runtime-only paths for structural detection
    const NON_RUNTIME_PREFIXES = [
        "test/", "tests/", "__tests__/",
        "fixtures/", "test/fixtures/", "__fixtures__/",
        "examples/", "example/",
        "data/", "docs/", "doc/",
    ];
    const runtimePaths = input.allPaths.filter(p => !NON_RUNTIME_PREFIXES.some(pfx => p.startsWith(pfx)));
    // Path-based signals (runtime paths only)
    const hasNextConfig = runtimePaths.some(p => /^next\.config\.(js|mjs|ts)$/.test(p));
    const hasViteConfig = runtimePaths.some(p => /^vite\.config\.(js|mjs|ts|mts)$/.test(p));
    const hasNestCliJson = pathSet.has("nest-cli.json");
    const hasActionYml = pathSet.has("action.yml") || pathSet.has("action.yaml");
    const hasPagesDir = runtimePaths.some(p => p.startsWith("pages/") || p.startsWith("src/pages/"));
    const hasAppDir = runtimePaths.some(p => p.startsWith("app/") || p.startsWith("src/app/"));
    const hasSrcDir = runtimePaths.some(p => p.startsWith("src/"));
    const hasTsxFiles = runtimePaths.some(p => p.endsWith(".tsx"));
    const hasComponentsDir = runtimePaths.some(p => p.includes("/components/"));
    const hasRoutesDir = runtimePaths.some(p => p.includes("/routes/"));
    const hasControllersDir = runtimePaths.some(p => p.includes("/controllers/"));
    const hasModulesDir = runtimePaths.some(p => p.includes("/modules/"));
    const hasDistDir = runtimePaths.some(p => p.startsWith("dist/"));
    const hasIndexTs = pathSet.has("src/index.ts") || pathSet.has("index.ts");
    const hasPackagesDir = runtimePaths.some(p => p.startsWith("packages/"));
    const hasAppsDir = runtimePaths.some(p => p.startsWith("apps/"));
    const hasTurboJson = pathSet.has("turbo.json");
    const hasNxJson = pathSet.has("nx.json");
    const hasLernaJson = pathSet.has("lerna.json");
    const hasPnpmWorkspace = pathSet.has("pnpm-workspace.yaml");
    // Workspace detection
    const isMonorepo = hasTurboJson || hasNxJson || hasLernaJson || hasPnpmWorkspace || hasWorkspaces ||
        (hasPackagesDir && hasAppsDir);
    // --- Classify primary layout ---
    let primary_layout = "unknown";
    if (isMonorepo) {
        primary_layout = "monorepo_workspace";
        signals.push({ signal: "monorepo_workspace", weight: "strong", evidence: "Workspace config or packages+apps layout detected" });
    }
    else if (hasNextConfig || (deps.has("next") && (hasPagesDir || hasAppDir))) {
        primary_layout = "next_app";
        signals.push({ signal: "next_app", weight: "strong", evidence: "next.config or next dep with pages/app dir" });
    }
    else if (hasNestCliJson || deps.has("@nestjs/core")) {
        primary_layout = "nestjs_service";
        signals.push({ signal: "nestjs_service", weight: "strong", evidence: "nest-cli.json or @nestjs/core dependency" });
    }
    else if (hasActionYml) {
        primary_layout = "github_action";
        signals.push({ signal: "github_action", weight: "strong", evidence: "action.yml present" });
    }
    else if (hasBinField || deps.has("commander") || deps.has("yargs") || deps.has("oclif") || deps.has("cac")) {
        primary_layout = "cli_tool";
        signals.push({ signal: "cli_tool", weight: "strong", evidence: "bin field or CLI framework dep" });
    }
    else if (deps.has("express") || deps.has("fastify") || deps.has("koa") || deps.has("hapi")) {
        const hasFrontend = deps.has("react") || hasTsxFiles;
        if (hasFrontend) {
            primary_layout = "fullstack_app";
            signals.push({ signal: "fullstack_app", weight: "moderate", evidence: "Server framework + frontend signals" });
        }
        else {
            primary_layout = "node_service";
            signals.push({ signal: "node_service", weight: "strong", evidence: "Server framework dep without frontend" });
        }
    }
    else if (hasViteConfig && deps.has("react")) {
        primary_layout = "react_vite_app";
        signals.push({ signal: "react_vite_app", weight: "strong", evidence: "vite.config + react dep" });
    }
    else if (deps.has("react") && hasTsxFiles) {
        primary_layout = "react_vite_app";
        signals.push({ signal: "react_vite_app", weight: "moderate", evidence: "react dep + .tsx files" });
    }
    else if (hasIndexTs && hasSrcDir && !deps.has("react") && !deps.has("express")) {
        primary_layout = "typescript_sdk";
        signals.push({ signal: "typescript_sdk", weight: "moderate", evidence: "src/index.ts without web framework" });
    }
    else if (pathSet.has("package.json")) {
        primary_layout = "unknown";
        unknowns.push({ aspect: "primary_layout", reason: "package.json exists but no recognizable framework pattern" });
    }
    // --- Classify package layout ---
    let package_layout = "unknown";
    if (isMonorepo) {
        package_layout = "multi_package";
    }
    else if (hasSrcDir) {
        package_layout = "src_layout";
    }
    else if (hasPagesDir || hasAppDir) {
        package_layout = "pages_app_layout";
    }
    else {
        package_layout = "flat_source";
    }
    // --- Confidence ---
    const confidence = signals.length >= 2 ? "high"
        : signals.length === 1 ? "medium"
            : "low";
    // --- Classify files into TS/JS buckets ---
    const tsFiles = classifyTsFiles(input.files);
    // --- Bucket summary ---
    const bucketSummary = {};
    for (const f of tsFiles) {
        bucketSummary[f.bucket] = (bucketSummary[f.bucket] || 0) + 1;
    }
    return {
        layout: {
            primary_layout,
            package_layout,
            confidence,
            signals,
            unknowns,
            bucket_summary: bucketSummary,
        },
        tsFiles,
    };
}
// ---------------------------------------------------------------------------
// File classification
// ---------------------------------------------------------------------------
const TS_JS_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
function classifyTsFiles(files) {
    const result = [];
    for (const f of files) {
        const ext = getExtension(f.path);
        if (!TS_JS_EXTENSIONS.has(ext) && ext !== ".json" && ext !== ".yaml" && ext !== ".yml")
            continue;
        let bucket = "unknown";
        const evidence = [];
        // Test files
        if (f.path.match(/\.(test|spec)\.(ts|tsx|js|jsx|mjs|mts|cjs|cts)$/) || f.path.includes("__tests__/") || f.path.includes("__test__/") || f.path.includes("__specs__/") || f.path.startsWith("test/") || f.path.startsWith("tests/") || f.path.includes("/test/") || f.path.includes("/tests/")) {
            bucket = "test";
            evidence.push("test file pattern");
        }
        // Config files
        else if (f.path.match(/\.(config|rc)\.(ts|js|mjs|cjs|mts|json|yaml|yml)$/) ||
            f.path.match(/^(tsconfig|jest\.config|vitest\.config|vite\.config|next\.config|eslint\.config|rollup\.config|webpack\.config)/) ||
            f.path.match(/^\.(eslintrc|prettierrc|babelrc)/)) {
            bucket = "config";
            evidence.push("config file pattern");
        }
        // Generated / dist
        else if (f.path.startsWith("dist/") || f.path.startsWith("build/") || f.path.includes("/generated/") || f.path.endsWith(".d.ts")) {
            bucket = "generated";
            evidence.push("generated/dist path");
        }
        // Scripts
        else if (f.path.startsWith("scripts/") || f.path.startsWith("tools/")) {
            bucket = "script";
            evidence.push("scripts directory");
        }
        // Docs
        else if (f.path.startsWith("docs/") || f.path.startsWith("doc/")) {
            bucket = "docs";
            evidence.push("docs directory");
        }
        // Source
        else if (TS_JS_EXTENSIONS.has(ext)) {
            bucket = "source";
            evidence.push("source file");
        }
        result.push({
            path: f.path,
            bucket,
            extension: ext,
            size_bytes: f.size_bytes,
            evidence,
        });
    }
    return result;
}
function getExtension(path) {
    // Handle .test.ts, .spec.tsx etc.
    const lastDot = path.lastIndexOf(".");
    if (lastDot < 0)
        return "";
    return path.slice(lastDot).toLowerCase();
}
//# sourceMappingURL=typescriptProjectClassifier.js.map