/**
 * P25a + P27-1d: Python Test Mapper
 *
 * Maps Python source files to candidate test files using Python conventions.
 * P27-1d: Enhanced with framework-aware candidate generation using
 * layout, framework, and project-role context from P27-1b/1c.
 *
 * Hard rules:
 *   - Does NOT execute tests
 *   - Does NOT generate tests
 *   - Does NOT claim suggested tests are sufficient
 *   - All mappings carry confidence + reason
 *   - High confidence requires path convention + framework context evidence
 */

import type {
  PythonTestMapping,
  PythonTestMappingConfidence,
  PythonProjectLayout,
  PythonFrameworkProfile,
} from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type TestMapperInput = {
  readonly sourcePaths: readonly string[];
  readonly observedPaths: ReadonlySet<string>;
  // P27-1d: framework/layout context
  readonly layout?: PythonProjectLayout;
  readonly frameworkProfile?: PythonFrameworkProfile;
};

export function mapPythonTests(input: TestMapperInput): PythonTestMapping[] {
  const results: PythonTestMapping[] = [];
  const context = buildMappingContext(input);

  for (const source of input.sourcePaths) {
    if (!source.endsWith(".py")) continue;
    // Skip __init__.py, conftest.py, and non-source
    const basename = source.split("/").pop()!;
    if (basename === "__init__.py" || basename === "conftest.py") continue;
    if (basename.startsWith("test_") || basename.endsWith("_test.py")) continue;

    const candidates = generateCandidates(source, context);
    const existing = candidates.filter(c => input.observedPaths.has(c));
    const confidence = assessConfidence(source, candidates, existing, context);

    results.push({
      source_path: source,
      candidate_test_paths: candidates,
      existing_test_paths: existing,
      confidence: confidence.level,
      reason: confidence.reason,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Framework-aware mapping context (P27-1d)
// ---------------------------------------------------------------------------

type MappingContext = {
  readonly isDjango: boolean;
  readonly isFastApiService: boolean;
  readonly isLibrary: boolean;
  readonly isCliApp: boolean;
  readonly primaryLayout: string;
  readonly packageLayout: string;
  /** Observed test directory patterns */
  readonly testDirPatterns: readonly TestDirPattern[];
};

type TestDirPattern =
  | "top_level_tests"        // tests/test_*.py
  | "top_level_tests_domain" // tests/api/articles/test_*.py
  | "sibling_tests"          // pkg/module/tests/test_*.py
  | "test_subdirectory";     // tests/client/test_*.py, tests/models/test_*.py

function buildMappingContext(input: TestMapperInput): MappingContext {
  const frameworks = input.frameworkProfile?.framework_signals ?? [];
  const roles = input.frameworkProfile?.project_role_signals ?? [];
  const layout = input.layout;

  const hasFw = (name: string) => frameworks.some(f => f.name === name);
  const hasRole = (role: string) => roles.some(r => r.role === role);

  // Detect observed test directory patterns from existing paths
  const testDirPatterns: TestDirPattern[] = [];
  const paths = [...input.observedPaths];

  if (paths.some(p => /^tests\/test_[^/]+\.py$/.test(p))) {
    testDirPatterns.push("top_level_tests");
  }
  if (paths.some(p => /^tests\/[^/]+\/[^/]+\/test_[^/]+\.py$/.test(p))) {
    testDirPatterns.push("top_level_tests_domain");
  }
  if (paths.some(p => /^[^/]+\/[^/]+\/tests\/test_[^/]+\.py$/.test(p) || /^[^/]+\/tests\/test_[^/]+\.py$/.test(p))) {
    testDirPatterns.push("sibling_tests");
  }
  if (paths.some(p => /^tests\/[^/]+\/test_[^/]+\.py$/.test(p))) {
    testDirPatterns.push("test_subdirectory");
  }

  return {
    isDjango: hasFw("django"),
    isFastApiService: hasFw("fastapi") || hasRole("service_backend"),
    isLibrary: hasRole("python_sdk_library") || hasRole("http_client_library") || layout?.primary_layout === "library_package",
    isCliApp: hasRole("cli_application") || layout?.primary_layout === "cli_app",
    primaryLayout: layout?.primary_layout ?? "unknown",
    packageLayout: layout?.package_layout ?? "unknown",
    testDirPatterns,
  };
}

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

function generateCandidates(sourcePath: string, ctx: MappingContext): string[] {
  const candidates: string[] = [];
  const parts = sourcePath.split("/");
  const filename = parts[parts.length - 1];
  const nameNoExt = filename.replace(/\.py$/, "");

  // Strip leading underscore for library private modules (httpx/_auth.py → auth)
  const cleanName = nameNoExt.startsWith("_") && nameNoExt !== "__init__" && nameNoExt !== "__main__"
    ? nameNoExt.slice(1)
    : nameNoExt;

  // === Django-style patterns (always included for backward compat) ===

  // Pattern 1: Sibling tests/ directory — Django app convention
  // saleor/checkout/actions.py → saleor/checkout/tests/test_actions.py
  if (parts.length >= 2) {
    const dirParts = parts.slice(0, -1);
    candidates.push([...dirParts, "tests", `test_${nameNoExt}.py`].join("/"));
  }

  // Pattern 2: Top-level tests/ mirror
  // saleor/checkout/actions.py → tests/checkout/test_actions.py
  if (parts.length >= 2) {
    const relativeParts = parts.slice(1, -1); // skip top-level package
    candidates.push(["tests", ...relativeParts, `test_${nameNoExt}.py`].join("/"));
  }

  // Pattern 3: Module-level test file
  // saleor/checkout/actions.py → saleor/checkout/tests/test_checkout.py
  if (parts.length >= 2) {
    const dirParts = parts.slice(0, -1);
    const moduleName = dirParts[dirParts.length - 1];
    candidates.push([...dirParts, "tests", `test_${moduleName}.py`].join("/"));
  }

  // Pattern 4: Root test mirror with test_ prefix
  candidates.push(`test/test_${nameNoExt}.py`);
  candidates.push(`tests/test_${nameNoExt}.py`);

  // === P27-1d: Library/SDK patterns ===
  if (ctx.isLibrary) {
    // Library pattern: <package>/_module.py → tests/test_module.py
    // httpx/_auth.py → tests/test_auth.py
    if (cleanName !== nameNoExt) {
      candidates.push(`tests/test_${cleanName}.py`);
      candidates.push(`test/test_${cleanName}.py`);
    }

    // Library pattern: <package>/_module.py → tests/<related>/test_<module>.py
    // httpx/_models.py → tests/models/test_*.py
    if (parts.length >= 2) {
      candidates.push(`tests/${cleanName}/test_${cleanName}.py`);
      // Also try plural/singular
      if (!cleanName.endsWith("s")) {
        candidates.push(`tests/${cleanName}s/test_${cleanName}.py`);
      }
    }

    // Library pattern: <package>/<subpackage>/<module>.py → tests/<subpackage>/test_<module>.py
    // httpx/_transports/asgi.py → tests/test_asgi.py
    if (parts.length >= 3) {
      const subpackage = parts[parts.length - 2];
      const cleanSub = subpackage.startsWith("_") ? subpackage.slice(1) : subpackage;
      candidates.push(`tests/test_${nameNoExt}.py`);
      candidates.push(`tests/${cleanSub}/test_${nameNoExt}.py`);
    }
  }

  // === P27-1d: FastAPI/service patterns ===
  if (ctx.isFastApiService) {
    // Service pattern: app/api/routes/<domain>.py → tests/api/<domain>/test_<domain>_*.py
    // app/api/routes/articles.py → tests/api/articles/test_article_*.py
    if (parts.includes("routes") || parts.includes("api")) {
      const domainName = nameNoExt;
      // Try singular form for test directory
      const singularDomain = domainName.endsWith("s") ? domainName.slice(0, -1) : domainName;

      // tests/api/<domain>/test_<domain>_<action>.py pattern
      candidates.push(`tests/api/${domainName}/test_${singularDomain}_create.py`);
      candidates.push(`tests/api/${domainName}/test_${singularDomain}_get.py`);
      candidates.push(`tests/api/${domainName}/test_${singularDomain}_list.py`);
      candidates.push(`tests/api/${domainName}/test_${singularDomain}_update.py`);
      candidates.push(`tests/api/${domainName}/test_${singularDomain}_delete.py`);
      // Generic test file
      candidates.push(`tests/api/${domainName}/test_${domainName}.py`);
      candidates.push(`tests/api/test_${domainName}.py`);
      candidates.push(`tests/test_${domainName}.py`);
    }

    // Service pattern: app/crud/crud_<entity>.py → tests/test_crud_<entity>.py
    if (parts.includes("crud")) {
      candidates.push(`tests/test_${nameNoExt}.py`);
      candidates.push(`tests/crud/test_${nameNoExt}.py`);
    }

    // Service pattern: app/models/<entity>.py → tests/test_<entity>.py
    if (parts.includes("models") || parts.includes("schemas")) {
      candidates.push(`tests/test_${nameNoExt}.py`);
      candidates.push(`tests/models/test_${nameNoExt}.py`);
      candidates.push(`tests/schemas/test_${nameNoExt}.py`);
    }

    // Service pattern: app/core/<module>.py → tests/test_<module>.py
    if (parts.includes("core") || parts.includes("services")) {
      candidates.push(`tests/test_${nameNoExt}.py`);
      candidates.push(`tests/core/test_${nameNoExt}.py`);
    }
  }

  // === P27-1d: CLI app patterns ===
  if (ctx.isCliApp) {
    candidates.push(`tests/test_cli.py`);
    candidates.push(`tests/test_${nameNoExt}.py`);
  }

  // Deduplicate
  return [...new Set(candidates)];
}

// ---------------------------------------------------------------------------
// Confidence assessment (P27-1d enhanced)
// ---------------------------------------------------------------------------

function assessConfidence(
  source: string,
  candidates: string[],
  existing: string[],
  ctx: MappingContext,
): { level: PythonTestMappingConfidence; reason: string } {
  if (existing.length === 0) {
    if (candidates.length > 0) {
      return { level: "low", reason: "Candidate test paths generated but none exist" };
    }
    return { level: "unknown", reason: "No reasonable test path could be derived" };
  }

  const sourceFilename = source.split("/").pop()!.replace(/\.py$/, "");
  const cleanSourceName = sourceFilename.startsWith("_") && sourceFilename !== "__init__" && sourceFilename !== "__main__"
    ? sourceFilename.slice(1)
    : sourceFilename;

  for (const ex of existing) {
    const testFilename = ex.split("/").pop()!.replace(/\.py$/, "");

    // === High confidence: exact match in expected location ===

    // Django/traditional: sibling tests/ dir
    if (testFilename === `test_${sourceFilename}`) {
      const sourceDirParts = source.split("/").slice(0, -1);
      const testDirParts = ex.split("/").slice(0, -1);
      const expectedTestDir = [...sourceDirParts, "tests"].join("/");
      if (testDirParts.join("/") === expectedTestDir) {
        return { level: "high", reason: `Exact match in sibling tests/: ${ex}` };
      }
    }

    // Library: _module → tests/test_module (strip underscore match)
    if (ctx.isLibrary && testFilename === `test_${cleanSourceName}` && ex.startsWith("tests/")) {
      const contextNote = ctx.primaryLayout === "library_package" ? " [library_package layout]" : "";
      return { level: "high", reason: `Library module match: ${ex}${contextNote}` };
    }

    // Service: route domain → tests/api/<domain>/test_<singular>_*.py
    if (ctx.isFastApiService && ex.includes("/api/") && ex.startsWith("tests/")) {
      return { level: "high", reason: `API route domain test match: ${ex} [service_backend context]` };
    }

    // Standard: test_<name> in tests/ root
    if (testFilename === `test_${sourceFilename}` || testFilename === `test_${cleanSourceName}`) {
      if (ex.startsWith("tests/") || ex.startsWith("test/")) {
        const contextNote = ctx.isLibrary ? " [library context]" : ctx.isFastApiService ? " [service context]" : "";
        return { level: "medium", reason: `Name match in tests/ directory: ${ex}${contextNote}` };
      }
      return { level: "medium", reason: `Name match but different directory: ${ex}` };
    }
  }

  // Domain-level match (test_article_create for articles route)
  for (const ex of existing) {
    const testFilename = ex.split("/").pop()!.replace(/\.py$/, "");
    // Check if test name contains the source module name (partial domain match)
    const singularSource = sourceFilename.endsWith("s") ? sourceFilename.slice(0, -1) : sourceFilename;
    if (testFilename.includes(singularSource) && ex.startsWith("tests/")) {
      return { level: "medium", reason: `Domain test match: ${ex} (contains ${singularSource})` };
    }
  }

  // Module-level match
  return { level: "medium", reason: `Module-level test file found: ${existing[0]}` };
}
