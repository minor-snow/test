/**
 * P28c: TypeScript/JavaScript Test Mapper
 *
 * Maps source files to their corresponding test files using TS/JS conventions.
 * Distinguishes between unit tests, integration tests, and e2e tests.
 *
 * Conventions detected:
 *   - *.test.ts / *.spec.ts (co-located or parallel)
 *   - __tests__/ directory
 *   - Playwright/Cypress e2e tests (separate from unit mappings)
 *   - Vitest/Jest config-based test roots
 *
 * Hard rule: Playwright/Cypress tests are NEVER mapped as direct unit tests.
 */
export function mapTypeScriptTests(input) {
    const sourceFiles = input.tsFiles.filter(f => f.bucket === "source");
    const testFiles = input.tsFiles.filter(f => f.bucket === "test");
    // Classify test files into unit / e2e / integration
    const unitTests = [];
    const e2eTests = [];
    const integrationTests = [];
    for (const t of testFiles) {
        if (isE2ETest(t.path)) {
            e2eTests.push(t.path);
        }
        else if (isIntegrationTest(t.path)) {
            integrationTests.push(t.path);
        }
        else {
            unitTests.push(t);
        }
    }
    // Build mappings from source → unit test
    const mappings = [];
    const mappedSourcePaths = new Set();
    const mappedTestPaths = new Set();
    for (const src of sourceFiles) {
        const candidates = findTestCandidates(src.path, unitTests, input.allPaths);
        if (candidates.length > 0) {
            const existing = candidates.filter(c => input.allPaths.includes(c.path));
            mappings.push({
                source_path: src.path,
                candidate_test_paths: candidates.map(c => c.path),
                existing_test_paths: existing.map(c => c.path),
                confidence: existing.length > 0 ? candidates[0].confidence : "low",
                kind: candidates[0].kind,
                reason: candidates[0].reason,
            });
            mappedSourcePaths.add(src.path);
            for (const e of existing)
                mappedTestPaths.add(e.path);
        }
    }
    const unmapped_sources = sourceFiles
        .filter(f => !mappedSourcePaths.has(f.path))
        .map(f => f.path);
    const unmapped_tests = unitTests
        .filter(f => !mappedTestPaths.has(f.path))
        .map(f => f.path);
    return { test_mappings: mappings, unmapped_sources, unmapped_tests, e2e_tests: e2eTests, integration_tests: integrationTests };
}
// ---------------------------------------------------------------------------
// E2E / Integration detection
// ---------------------------------------------------------------------------
const E2E_PATTERNS = [
    /\be2e\b/i,
    /\bcypress\b/i,
    /\bplaywright\b/i,
    /\/e2e\//,
    /\/cypress\//,
    /\/playwright\//,
    /\.e2e\.(test|spec)\./,
    /\.pw\.(test|spec)\./,
    /\.cy\.(ts|tsx|js|jsx)$/,
];
const INTEGRATION_PATTERNS = [
    /\bintegration\b/i,
    /\/integration\//,
    /\.integration\.(test|spec)\./,
];
function isE2ETest(path) {
    return E2E_PATTERNS.some(p => p.test(path));
}
function isIntegrationTest(path) {
    return INTEGRATION_PATTERNS.some(p => p.test(path));
}
function findTestCandidates(sourcePath, unitTests, allPaths) {
    const candidates = [];
    const basename = getBasename(sourcePath);
    const dir = getDir(sourcePath);
    // 1. Same-basename .test.ts / .spec.ts (co-located)
    for (const ext of [".test.ts", ".spec.ts", ".test.tsx", ".spec.tsx", ".test.js", ".spec.js"]) {
        const testPath = sourcePath.replace(/\.(ts|tsx|js|jsx|mjs|mts)$/, ext);
        if (allPaths.includes(testPath)) {
            candidates.push({
                path: testPath,
                kind: ext.includes(".test.") ? "same_basename_test" : "same_basename_spec",
                confidence: "high",
                reason: `Co-located test: ${testPath}`,
            });
        }
    }
    // 2. __tests__/ directory (same level) and variants
    for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        for (const testDir of ["__tests__", "__test__", "__specs__"]) {
            const testPath = `${dir}${testDir}/${basename}${ext}`;
            if (allPaths.includes(testPath)) {
                candidates.push({
                    path: testPath,
                    kind: "__tests___dir",
                    confidence: "high",
                    reason: `${testDir} directory: ${testPath}`,
                });
            }
            // With .test or .spec suffix inside
            for (const suffix of [".test", ".spec"]) {
                const testPathWithSuffix = `${dir}${testDir}/${basename}${suffix}${ext}`;
                if (allPaths.includes(testPathWithSuffix)) {
                    candidates.push({
                        path: testPathWithSuffix,
                        kind: "__tests___dir",
                        confidence: "high",
                        reason: `${testDir} directory with suffix: ${testPathWithSuffix}`,
                    });
                }
            }
        }
    }
    // 3. Parallel test/ directory (src/foo.ts → test/foo.test.ts)
    if (sourcePath.startsWith("src/")) {
        const relToSrc = sourcePath.slice(4);
        for (const prefix of ["test/", "tests/"]) {
            for (const ext of [".test.ts", ".spec.ts", ".test.tsx", ".spec.tsx", ".test.js", ".spec.js"]) {
                const testPath = `${prefix}${relToSrc.replace(/\.(ts|tsx|js|jsx|mjs|mts)$/, ext)}`;
                if (allPaths.includes(testPath)) {
                    candidates.push({
                        path: testPath,
                        kind: "same_basename_test",
                        confidence: "high",
                        reason: `Parallel test dir: ${testPath}`,
                    });
                }
            }
        }
    }
    // 4. Fuzzy match by basename in test files
    if (candidates.length === 0) {
        for (const t of unitTests) {
            const tBase = getBasename(t.path).replace(/\.(test|spec)$/, "");
            if (tBase === basename) {
                candidates.push({
                    path: t.path,
                    kind: "same_basename_test",
                    confidence: "medium",
                    reason: `Basename match: ${t.path}`,
                });
            }
        }
    }
    // 3. Project-level test/ directory
    // e.g. src/utils/foo.ts -> test/utils/foo.ts or tests/utils/foo.ts
    const srcRelative = sourcePath.replace(/^src\//, "").replace(/^lib\//, "");
    const srcRelativeDir = getDir(srcRelative);
    for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        for (const rootTestDir of ["test", "tests", "spec", "specs"]) {
            // test/utils/foo.ts
            const testPath = `${rootTestDir}/${srcRelativeDir}${basename}${ext}`;
            if (allPaths.includes(testPath)) {
                candidates.push({
                    path: testPath,
                    kind: "test_dir",
                    confidence: "high",
                    reason: `Project test directory: ${testPath}`,
                });
            }
            // test/utils/foo.test.ts
            for (const suffix of [".test", ".spec"]) {
                const testPathWithSuffix = `${rootTestDir}/${srcRelativeDir}${basename}${suffix}${ext}`;
                if (allPaths.includes(testPathWithSuffix)) {
                    candidates.push({
                        path: testPathWithSuffix,
                        kind: "test_dir",
                        confidence: "high",
                        reason: `Project test directory with suffix: ${testPathWithSuffix}`,
                    });
                }
            }
        }
    }
    return candidates;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBasename(path) {
    const parts = path.split("/");
    const file = parts[parts.length - 1];
    // Remove .test.ts / .spec.tsx / .ts / .js etc.
    return file
        .replace(/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/, "")
        .replace(/\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/, "");
}
function getDir(path) {
    const lastSlash = path.lastIndexOf("/");
    return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : "";
}
//# sourceMappingURL=typescriptTestMapper.js.map