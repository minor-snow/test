/**
 * P25a: Python Unknown Taxonomy
 *
 * Classifies Python observation unknowns into specific categories,
 * each tagged as out_of_scope, actionable, or intrinsic.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function buildPythonUnknownTaxonomy(input) {
    const unknowns = [];
    // 1. Unclassified Python files
    const unclassified = input.files.filter(f => f.bucket === "unknown");
    if (unclassified.length > 0) {
        unknowns.push({
            category: "unclassified_python_file",
            classification: "actionable",
            paths: unclassified.map(f => f.path),
            count: unclassified.length,
            note: "Python files that could not be classified into source/test/config/migration/script buckets. May need custom path_roles in pantheon.json.",
        });
    }
    // 2. Dynamic / unresolved imports
    const dynamicImports = input.imports.filter(i => i.status === "dynamic_or_unresolved");
    if (dynamicImports.length > 0) {
        unknowns.push({
            category: "dynamic_or_unresolved_import",
            classification: "intrinsic",
            paths: [...new Set(dynamicImports.map(i => i.from_file))],
            count: dynamicImports.length,
            note: "Imports using __import__(), importlib.import_module(), or computed paths. Cannot be statically resolved — this is inherent to Python.",
        });
    }
    // 3. Unsupported Python artifacts
    const unsupported = input.files.filter(f => f.bucket === "unsupported" || f.bucket === "notebook");
    if (unsupported.length > 0) {
        unknowns.push({
            category: "unsupported_python_artifact",
            classification: "out_of_scope",
            paths: unsupported.map(f => f.path),
            count: unsupported.length,
            note: "Cython (.pyx) and Jupyter notebooks (.ipynb) — import analysis not supported.",
        });
    }
    // 4. Low confidence manifests
    const lowConfManifests = input.manifests.filter(m => m.confidence === "low");
    if (lowConfManifests.length > 0) {
        unknowns.push({
            category: "low_confidence_manifest",
            classification: "actionable",
            paths: lowConfManifests.map(m => m.source_path),
            count: lowConfManifests.length,
            note: "Dependency manifests parsed with low confidence. Package declarations may be incomplete.",
        });
    }
    // 5. Test mapping unknowns
    const unmappedTests = input.testMappings.filter(m => m.confidence === "unknown");
    if (unmappedTests.length > 0) {
        unknowns.push({
            category: "test_mapping_unknown",
            classification: "actionable",
            paths: unmappedTests.map(m => m.source_path),
            count: unmappedTests.length,
            note: "Source files for which no test file could be derived using Python conventions.",
        });
    }
    // 6. Scope granularity limit (always present)
    unknowns.push({
        category: "scope_granularity_limit",
        classification: "intrinsic",
        paths: [],
        count: 0,
        note: "Scope granularity in P25 is file/path-level. Function-level and semantic delta constraints are future work.",
    });
    return unknowns;
}
//# sourceMappingURL=pythonUnknownTaxonomy.js.map