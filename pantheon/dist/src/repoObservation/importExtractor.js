/**
 * P20a: Import Extractor
 *
 * Extracts literal import/export/require specifiers from TS/JS files.
 * Uses deterministic regex — no TypeScript parser dependency.
 * Records resolution_status for each edge. Dynamic imports → unknown.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function extractImportsFromFile(input) {
    const edges = [];
    const dynamicImports = [];
    const unresolvedImports = [];
    // Static imports: import x from "..."  /  import { x } from "..."  /  import "..."
    for (const m of input.content.matchAll(/import\s+(?:(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?\s+from\s+)?["']([^"']+)["']/g)) {
        const edge = buildEdge(input.path, m[1], "static");
        edges.push(edge);
        if (edge.resolution_status === "unresolved_package" || edge.resolution_status === "unresolved_alias") {
            unresolvedImports.push(`${input.path}:${m[1]}`);
        }
    }
    // Export-from: export { x } from "..."  /  export * from "..."
    for (const m of input.content.matchAll(/export\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+["']([^"']+)["']/g)) {
        const edge = buildEdge(input.path, m[1], "export_from");
        edges.push(edge);
        if (edge.resolution_status === "unresolved_package" || edge.resolution_status === "unresolved_alias") {
            unresolvedImports.push(`${input.path}:${m[1]}`);
        }
    }
    // Require: const x = require("...")  /  require("...")
    for (const m of input.content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)) {
        const edge = buildEdge(input.path, m[1], "require");
        edges.push(edge);
        if (edge.resolution_status === "unresolved_package" || edge.resolution_status === "unresolved_alias") {
            unresolvedImports.push(`${input.path}:${m[1]}`);
        }
    }
    // Dynamic imports: import(...)
    for (const m of input.content.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
        edges.push(buildEdge(input.path, m[1], "dynamic"));
        dynamicImports.push(`${input.path}:${m[1]}`);
    }
    // Dynamic imports with non-literal: import(expr)
    for (const m of input.content.matchAll(/import\s*\(\s*(?!["'])([^)]+)\s*\)/g)) {
        dynamicImports.push(`${input.path}:<dynamic expression>`);
        edges.push({
            from_file: input.path,
            raw_specifier: `<dynamic:${m[1].trim().slice(0, 50)}>`,
            import_kind: "dynamic",
            resolution_status: "dynamic_unknown",
            evidence: [{ type: "import_literal", source_path: input.path, value: `dynamic import expression: ${m[1].trim().slice(0, 100)}` }],
        });
    }
    return {
        import_edges: edges,
        unknowns: { dynamic_imports: dynamicImports, unresolved_imports: unresolvedImports },
    };
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function buildEdge(fromFile, specifier, kind) {
    const resolution = resolveSpecifier(specifier);
    return {
        from_file: fromFile,
        raw_specifier: specifier,
        import_kind: kind,
        ...(resolution.targetHint ? { target_hint: resolution.targetHint } : {}),
        resolution_status: kind === "dynamic" ? "dynamic_unknown" : resolution.status,
        evidence: [{ type: "import_literal", source_path: fromFile, value: specifier }],
    };
}
function resolveSpecifier(specifier) {
    // Relative path
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
        return { status: "resolved_relative", targetHint: specifier };
    }
    // Node builtins (node:fs, node:path, etc.) — handled here for early classification
    if (specifier.startsWith("node:")) {
        return { status: "builtin_node_package" };
    }
    // Scoped package (@org/pkg)
    if (specifier.startsWith("@")) {
        return { status: "unresolved_package" };
    }
    // Bare specifier — could be package or alias
    // Package classification (declared/undeclared/builtin) is done later by packageDependencyClassifier
    if (!specifier.includes("/") || specifier.split("/").length <= 2) {
        if (/^[a-z@]/.test(specifier)) {
            return { status: "unresolved_package" };
        }
        return { status: "unresolved_alias" };
    }
    // Anything else
    return { status: "literal_extracted" };
}
//# sourceMappingURL=importExtractor.js.map