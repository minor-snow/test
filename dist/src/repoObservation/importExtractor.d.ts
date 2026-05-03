/**
 * P20a: Import Extractor
 *
 * Extracts literal import/export/require specifiers from TS/JS files.
 * Uses deterministic regex — no TypeScript parser dependency.
 * Records resolution_status for each edge. Dynamic imports → unknown.
 */
import type { ImportEdge, RepoUnknowns } from "./types.js";
export declare function extractImportsFromFile(input: {
    path: string;
    content: string;
}): {
    import_edges: ImportEdge[];
    unknowns: Pick<RepoUnknowns, "dynamic_imports" | "unresolved_imports">;
};
