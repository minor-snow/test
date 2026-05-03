/**
 * P20a: Test Mapper
 *
 * Maps source files to test files by path convention.
 * Does NOT do coverage analysis or content inspection.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function inferTestMappings(input) {
    const srcFiles = input.files.filter(f => f.bucket === "src");
    const testFiles = input.files.filter(f => f.bucket === "test");
    const overrides = input.overrides ?? {};
    const testPaths = new Set(testFiles.map(f => f.path));
    const mappedTests = new Set();
    const mappings = [];
    const unmappedSources = [];
    const ambiguous = [];
    for (const src of srcFiles) {
        // Config overrides take priority
        const overrideTests = overrides[src.path];
        if (overrideTests && overrideTests.length > 0) {
            for (const testPath of overrideTests) {
                mappings.push({
                    source_path: src.path,
                    test_path: testPath,
                    mapping_kind: "config_override",
                    confidence: "high",
                    evidence: [{ type: "config", source_path: "pantheon.json", value: `test_mapping_override: ${src.path} → ${testPath}` }],
                });
                mappedTests.add(testPath);
            }
            continue;
        }
        const candidates = findTestCandidates(src.path, testPaths);
        if (candidates.length === 0) {
            unmappedSources.push(src.path);
        }
        else if (candidates.length === 1) {
            const c = candidates[0];
            mappings.push({
                source_path: src.path,
                test_path: c.testPath,
                mapping_kind: c.kind,
                confidence: c.confidence,
                evidence: [{ type: "test_convention", source_path: src.path, value: `Matched by ${c.kind}: ${c.testPath}` }],
            });
            mappedTests.add(c.testPath);
        }
        else {
            // Multiple candidates — record first but mark ambiguous
            const c = candidates[0];
            mappings.push({
                source_path: src.path,
                test_path: c.testPath,
                mapping_kind: c.kind,
                confidence: "low",
                evidence: [{ type: "test_convention", source_path: src.path, value: `Ambiguous: ${candidates.length} candidates` }],
            });
            mappedTests.add(c.testPath);
            ambiguous.push(src.path);
        }
    }
    const unmappedTests = testFiles
        .filter(f => !mappedTests.has(f.path))
        .map(f => f.path);
    return { test_mappings: mappings, unmapped_sources: unmappedSources, unmapped_tests: unmappedTests, ambiguous_test_mappings: ambiguous };
}
function findTestCandidates(srcPath, testPaths) {
    const candidates = [];
    const basename = getBasename(srcPath);
    const dirParts = srcPath.split("/").slice(1, -1); // remove bucket prefix and filename
    const subPath = dirParts.join("/");
    const extensions = ["ts", "tsx", "js", "jsx"];
    for (const extension of extensions) {
        // Convention 1: test/<subpath>/<basename>.test.tsx|ts|js|jsx
        tryCandidate(candidates, testPaths, `test/${subPath ? subPath + "/" : ""}${basename}.test.${extension}`, "parallel_test_dir", extension === "ts" ? "high" : "medium");
        // Convention 2: tests/<subpath>/<basename>.test.*
        tryCandidate(candidates, testPaths, `tests/${subPath ? subPath + "/" : ""}${basename}.test.${extension}`, "parallel_test_dir", extension === "ts" ? "high" : "medium");
        // Convention 3: src/<subpath>/<basename>.test.* (co-located)
        tryCandidate(candidates, testPaths, `src/${subPath ? subPath + "/" : ""}${basename}.test.${extension}`, "same_basename", extension === "ts" ? "high" : "medium");
        // Convention 4: __tests__/<subpath>/<basename>.test.*
        tryCandidate(candidates, testPaths, `__tests__/${subPath ? subPath + "/" : ""}${basename}.test.${extension}`, "parallel_test_dir", "medium");
        // Convention 5/6/7: *.spec.*
        tryCandidate(candidates, testPaths, `test/${subPath ? subPath + "/" : ""}${basename}.spec.${extension}`, "suffix_spec", "medium");
        tryCandidate(candidates, testPaths, `tests/${subPath ? subPath + "/" : ""}${basename}.spec.${extension}`, "suffix_spec", "medium");
        tryCandidate(candidates, testPaths, `src/${subPath ? subPath + "/" : ""}${basename}.spec.${extension}`, "suffix_spec", "medium");
    }
    return candidates;
}
function tryCandidate(out, testPaths, testPath, kind, confidence) {
    if (testPaths.has(testPath)) {
        out.push({ testPath, kind, confidence });
    }
}
function getBasename(filePath) {
    const fileName = filePath.split("/").pop() ?? "";
    // Strip extension (.ts, .tsx, .js, .jsx)
    return fileName.replace(/\.[tj]sx?$/, "");
}
//# sourceMappingURL=testMapper.js.map