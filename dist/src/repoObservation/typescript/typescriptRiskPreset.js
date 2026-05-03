/**
 * P28c: TypeScript/JavaScript Risk Preset Validator
 *
 * Matches repository signals against risk presets and generates
 * review_required / forbidden suggestions.
 *
 * DESIGN PRINCIPLE: CONSERVATIVE BY DEFAULT.
 * - dist/build/generated → review_required (never silently allowed)
 * - package.json scripts/exports/bin changes → review_required
 * - lockfile changes → review_required
 * - .env files → review_required
 * - GitHub workflow / action.yml → review_required
 * - tsconfig / build config → review_required
 * - public exports (index.ts) → review_required
 * - auth/payment paths → review_required
 *
 * Guardrail: dist/ MUST NOT silently pass unless change intent
 * explicitly declares rebuild with source relationship.
 */
export function validateTypeScriptRiskPreset(input) {
    const presetName = resolvePreset(input.layout);
    const suggested_review = [];
    const suggested_forbidden = [];
    const dormant_patterns = [];
    const matched_signals = [];
    // --- Universal high-risk patterns (apply to ALL presets) ---
    applyUniversalRiskPatterns(input, suggested_review, matched_signals);
    // --- Preset-specific patterns ---
    switch (presetName) {
        case "next_app":
            applyNextAppPreset(input, suggested_review, dormant_patterns, matched_signals);
            break;
        case "react_vite_app":
            applyReactVitePreset(input, suggested_review, dormant_patterns, matched_signals);
            break;
        case "node_service":
        case "nestjs_service":
            applyNodeServicePreset(input, suggested_review, dormant_patterns, matched_signals);
            break;
        case "typescript_sdk":
            applyTsSdkPreset(input, suggested_review, suggested_forbidden, dormant_patterns, matched_signals);
            break;
        case "cli_tool":
            applyCliPreset(input, suggested_review, dormant_patterns, matched_signals);
            break;
        case "github_action":
            applyGithubActionPreset(input, suggested_review, suggested_forbidden, dormant_patterns, matched_signals);
            break;
        case "monorepo_workspace":
            applyMonorepoPreset(input, suggested_review, dormant_patterns, matched_signals);
            break;
    }
    // Compute validation level
    const frameworkCount = input.frameworkProfile.framework_signals.length;
    const roleCount = input.frameworkProfile.project_role_signals.length;
    const validation = (frameworkCount > 0 && roleCount > 0) ? "validated"
        : (frameworkCount > 0 || roleCount > 0) ? "partial"
            : "unvalidated";
    const confidence = validation === "validated" ? "high"
        : validation === "partial" ? "medium"
            : "low";
    return {
        preset: presetName,
        validation,
        confidence,
        matched_signals,
        suggested_review,
        suggested_forbidden,
        dormant_patterns,
    };
}
// ---------------------------------------------------------------------------
// Preset resolution
// ---------------------------------------------------------------------------
function resolvePreset(layout) {
    return layout.primary_layout === "unknown" ? "generic_tsjs" : layout.primary_layout;
}
// ---------------------------------------------------------------------------
// Universal risk patterns (all presets)
// ---------------------------------------------------------------------------
function applyUniversalRiskPatterns(input, review, matched) {
    const pathSet = new Set(input.allPaths);
    // dist / build / generated artifacts — NEVER silently allowed
    const distPaths = input.allPaths.filter(p => p.startsWith("dist/") || p.startsWith("build/") || p.includes("/generated/") || p.endsWith(".d.ts"));
    if (distPaths.length > 0) {
        review.push({
            pattern: "**/*.d.ts|dist/**|build/**|generated/**",
            reason: "Generated/built artifacts must not silently pass. Require rebuild declaration.",
            severity: "high",
            matched_path_count: distPaths.length,
            evidence: [`${distPaths.length} generated artifact paths found`],
        });
        matched.push("generated_artifacts_detected");
    }
    // package.json scripts
    if (input.packageJsonFields.scripts && Object.keys(input.packageJsonFields.scripts).length > 0) {
        review.push({
            pattern: "package.json",
            reason: "Package script changes can alter build/test/deploy behavior",
            severity: "high",
            matched_path_count: 1,
            evidence: [`${Object.keys(input.packageJsonFields.scripts).length} scripts defined`],
        });
        matched.push("package_scripts_present");
    }
    // Lockfiles
    const lockfiles = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].filter(l => pathSet.has(l));
    if (lockfiles.length > 0) {
        review.push({
            pattern: lockfiles.join("|"),
            reason: "Lockfile changes affect dependency resolution and supply chain",
            severity: "high",
            matched_path_count: lockfiles.length,
            evidence: lockfiles.map(l => `${l} present`),
        });
        matched.push("lockfile_present");
    }
    // .env files
    const envFiles = input.allPaths.filter(p => p.match(/\.env(\.|$)/));
    if (envFiles.length > 0) {
        review.push({
            pattern: ".env*",
            reason: "Environment files may contain secrets or alter runtime behavior",
            severity: "critical",
            matched_path_count: envFiles.length,
            evidence: envFiles.slice(0, 5).map(p => p),
        });
        matched.push("env_files_detected");
    }
    // GitHub workflows
    const workflows = input.allPaths.filter(p => p.startsWith(".github/workflows/"));
    if (workflows.length > 0) {
        review.push({
            pattern: ".github/workflows/**",
            reason: "CI/CD workflow changes affect deployment pipeline",
            severity: "high",
            matched_path_count: workflows.length,
            evidence: [`${workflows.length} workflow files`],
        });
        matched.push("github_workflows_present");
    }
    // tsconfig / build configs
    const buildConfigs = input.allPaths.filter(p => p.match(/^tsconfig(\.\w+)?\.json$/) ||
        p.match(/^(vite|webpack|rollup|esbuild|babel)\.config\.(ts|js|mjs|cjs)$/) ||
        p.match(/^next\.config\.(ts|js|mjs)$/));
    if (buildConfigs.length > 0) {
        review.push({
            pattern: "tsconfig*.json|*.config.{ts,js}",
            reason: "Build/compiler configuration changes affect output behavior",
            severity: "medium",
            matched_path_count: buildConfigs.length,
            evidence: buildConfigs,
        });
        matched.push("build_config_present");
    }
    // Public exports (index.ts at src root)
    if (pathSet.has("src/index.ts") || pathSet.has("index.ts")) {
        review.push({
            pattern: "index.ts|src/index.ts",
            reason: "Public API export surface changes require review",
            severity: "medium",
            matched_path_count: 1,
            evidence: ["Public export entry point detected"],
        });
        matched.push("public_exports_detected");
    }
    // Auth / payment paths
    const sensitivePathPatterns = [/\bauth\b/i, /\bpayment\b/i, /\bbilling\b/i, /\bsecret\b/i, /\badmin\b/i, /\bmiddleware\b/i];
    const sensitivePaths = input.allPaths.filter(p => sensitivePathPatterns.some(pat => pat.test(p)));
    if (sensitivePaths.length > 0) {
        review.push({
            pattern: "**/auth/**|**/payment/**|**/billing/**|**/admin/**|**/middleware/**",
            reason: "Security-sensitive paths require review",
            severity: "high",
            matched_path_count: sensitivePaths.length,
            evidence: sensitivePaths.slice(0, 10),
        });
        matched.push("sensitive_paths_detected");
    }
    // package.json exports / bin / main / types — public API fields
    const { bin, exports: pkgExports, main, types } = input.packageJsonFields;
    if (bin || pkgExports || main || types) {
        review.push({
            pattern: "package.json",
            reason: "Public API surface fields — changes affect consumers",
            severity: "high",
            matched_path_count: 1,
            evidence: [
                bin ? "bin field present" : "",
                pkgExports ? "exports field present" : "",
                main ? `main: ${main}` : "",
                types ? `types: ${types}` : "",
            ].filter(Boolean),
        });
        matched.push("package_public_api_fields");
    }
    // Workspace config
    if (input.packageJsonFields.workspaces) {
        review.push({
            pattern: "package.json|pnpm-workspace.yaml|turbo.json",
            reason: "Workspace configuration changes require review",
            severity: "high",
            matched_path_count: 1,
            evidence: ["workspaces field present in package.json"],
        });
        matched.push("workspace_config_detected");
    }
}
// ---------------------------------------------------------------------------
// Preset-specific patterns
// ---------------------------------------------------------------------------
function applyNextAppPreset(input, review, dormant, matched) {
    // API routes
    const apiRoutes = input.allPaths.filter(p => p.match(/^(app|pages)\/api\//) || p.match(/^src\/(app|pages)\/api\//));
    if (apiRoutes.length > 0) {
        review.push({
            pattern: "**/app/api/**|**/pages/api/**",
            reason: "Next.js API routes handle server-side logic — security-sensitive",
            severity: "high",
            matched_path_count: apiRoutes.length,
            evidence: apiRoutes.slice(0, 5),
        });
        matched.push("nextjs_api_routes");
    }
    // Middleware
    const middleware = input.allPaths.filter(p => p.match(/^(src\/)?middleware\.(ts|js)$/));
    if (middleware.length > 0) {
        review.push({
            pattern: "**/middleware.{ts,js}",
            reason: "Next.js middleware runs on every request — high impact",
            severity: "critical",
            matched_path_count: middleware.length,
            evidence: middleware,
        });
        matched.push("nextjs_middleware");
    }
    if (!input.allPaths.some(p => p.match(/^(app|pages)\//))) {
        dormant.push({ pattern: "app/|pages/", reason: "Expected Next.js routing directory not found" });
    }
}
function applyReactVitePreset(input, review, dormant, matched) {
    matched.push("react_vite_preset_applied");
    if (!input.allPaths.some(p => p.endsWith(".tsx"))) {
        dormant.push({ pattern: "*.tsx", reason: "Expected TSX component files not found" });
    }
}
function applyNodeServicePreset(input, review, dormant, matched) {
    // Route handlers
    const routes = input.allPaths.filter(p => p.includes("/routes/") || p.includes("/controllers/"));
    if (routes.length > 0) {
        review.push({
            pattern: "**/routes/**|**/controllers/**",
            reason: "Route/controller changes affect API surface",
            severity: "medium",
            matched_path_count: routes.length,
            evidence: routes.slice(0, 5),
        });
        matched.push("service_routes_detected");
    }
    // DB migrations
    const migrations = input.allPaths.filter(p => p.includes("/migrations/") || p.includes("/migrate/"));
    if (migrations.length > 0) {
        review.push({
            pattern: "**/migrations/**",
            reason: "Database migration changes require careful review",
            severity: "high",
            matched_path_count: migrations.length,
            evidence: [`${migrations.length} migration files`],
        });
        matched.push("db_migrations_detected");
    }
}
function applyTsSdkPreset(input, review, forbidden, dormant, matched) {
    matched.push("typescript_sdk_preset_applied");
    // Published type definitions
    const dtsFiles = input.allPaths.filter(p => p.endsWith(".d.ts") && !p.startsWith("dist/"));
    if (dtsFiles.length > 0) {
        review.push({
            pattern: "**/*.d.ts",
            reason: "Published type definition changes affect downstream consumers",
            severity: "high",
            matched_path_count: dtsFiles.length,
            evidence: dtsFiles.slice(0, 5),
        });
        matched.push("published_types_detected");
    }
}
function applyCliPreset(input, review, dormant, matched) {
    // bin entry change
    if (input.packageJsonFields.bin) {
        review.push({
            pattern: "package.json",
            reason: "CLI bin entry changes affect installed command names",
            severity: "high",
            matched_path_count: 1,
            evidence: ["bin field present"],
        });
        matched.push("cli_bin_field");
    }
}
function applyGithubActionPreset(input, review, forbidden, dormant, matched) {
    const pathSet = new Set(input.allPaths);
    // action.yml
    if (pathSet.has("action.yml") || pathSet.has("action.yaml")) {
        review.push({
            pattern: "action.yml|action.yaml",
            reason: "Action definition changes affect all consumers of this action",
            severity: "critical",
            matched_path_count: 1,
            evidence: ["action.yml present"],
        });
        matched.push("action_yml_detected");
    }
    // dist/ bundle — extra-conservative for actions
    const distFiles = input.allPaths.filter(p => p.startsWith("dist/"));
    if (distFiles.length > 0) {
        review.push({
            pattern: "dist/**",
            reason: "Action dist bundle changes without corresponding source changes are suspicious. Require rebuild marker.",
            severity: "critical",
            matched_path_count: distFiles.length,
            evidence: [`${distFiles.length} bundled dist files`],
        });
        matched.push("action_dist_bundle");
    }
    // @actions/core dependency
    if (input.allPaths.some(p => p.includes("@actions"))) {
        matched.push("actions_core_usage");
    }
}
function applyMonorepoPreset(input, review, dormant, matched) {
    const pathSet = new Set(input.allPaths);
    // Workspace config files
    const wsConfigs = ["turbo.json", "nx.json", "lerna.json", "pnpm-workspace.yaml", "rush.json"]
        .filter(f => pathSet.has(f));
    if (wsConfigs.length > 0) {
        review.push({
            pattern: wsConfigs.join("|"),
            reason: "Workspace orchestration config changes affect all packages",
            severity: "critical",
            matched_path_count: wsConfigs.length,
            evidence: wsConfigs,
        });
        matched.push("workspace_orchestration_config");
    }
    // (Detection of cross-package changes is deferred to impact surface layer)
}
//# sourceMappingURL=typescriptRiskPreset.js.map