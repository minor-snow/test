import { describe, it, expect } from "vitest";
import { extractImportsFromFile } from "../../src/repoObservation/importExtractor.js";
describe("extractImportsFromFile", () => {
    it("extracts static default import", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import bar from "./bar.js";`,
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].raw_specifier).toBe("./bar.js");
        expect(result.import_edges[0].import_kind).toBe("static");
        expect(result.import_edges[0].resolution_status).toBe("resolved_relative");
    });
    it("extracts named import", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import { baz, qux } from "../utils/helpers.js";`,
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].raw_specifier).toBe("../utils/helpers.js");
        expect(result.import_edges[0].resolution_status).toBe("resolved_relative");
    });
    it("extracts star import", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import * as utils from "./utils.js";`,
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].raw_specifier).toBe("./utils.js");
    });
    it("extracts side-effect import", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import "./setup.js";`,
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].raw_specifier).toBe("./setup.js");
    });
    it("extracts export-from", () => {
        const result = extractImportsFromFile({
            path: "src/index.ts",
            content: `export { foo } from "./foo.js";\nexport * from "./bar.js";`,
        });
        expect(result.import_edges).toHaveLength(2);
        expect(result.import_edges[0].import_kind).toBe("export_from");
        expect(result.import_edges[1].import_kind).toBe("export_from");
    });
    it("extracts require literal — bare package", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `const x = require("lodash");`,
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].import_kind).toBe("require");
        expect(result.import_edges[0].resolution_status).toBe("unresolved_package");
    });
    it("marks dynamic import with literal as dynamic_unknown", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `const m = await import("./lazy.js");`,
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].import_kind).toBe("dynamic");
        expect(result.import_edges[0].resolution_status).toBe("dynamic_unknown");
        expect(result.unknowns.dynamic_imports).toHaveLength(1);
    });
    it("marks dynamic import with expression as dynamic_unknown", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: "const m = await import(`./features/${name}.js`);",
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].resolution_status).toBe("dynamic_unknown");
        expect(result.unknowns.dynamic_imports).toHaveLength(1);
    });
    it("classifies scoped package as unresolved_package", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import { x } from "@org/pkg";`,
        });
        expect(result.import_edges[0].resolution_status).toBe("unresolved_package");
    });
    // BUG-072: unresolved_package must surface into unknowns.unresolved_imports
    it("populates unknowns.unresolved_imports for unresolved_package (BUG-072)", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import { x } from "@org/pkg";`,
        });
        expect(result.unknowns.unresolved_imports).toHaveLength(1);
        expect(result.unknowns.unresolved_imports[0]).toBe("src/foo.ts:@org/pkg");
    });
    it("classifies bare package as unresolved_package (reclassified by scanner)", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import express from "express";`,
        });
        expect(result.import_edges[0].resolution_status).toBe("unresolved_package");
    });
    it("classifies unknown bare package as unresolved_package", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import x from "my-internal-pkg";`,
        });
        expect(result.import_edges[0].resolution_status).toBe("unresolved_package");
    });
    it("classifies node: builtin as builtin_node_package", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import { readFileSync } from "node:fs";`,
        });
        expect(result.import_edges[0].resolution_status).toBe("builtin_node_package");
    });
    it("preserves raw specifier exactly", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import { x } from "../utils/format.js";`,
        });
        expect(result.import_edges[0].raw_specifier).toBe("../utils/format.js");
    });
    it("handles multiple imports in one file", () => {
        const content = [
            'import a from "./a.js";',
            'import { b } from "./b.js";',
            'export * from "./c.js";',
            'const d = require("d-pkg");',
        ].join("\n");
        const result = extractImportsFromFile({ path: "src/main.ts", content });
        expect(result.import_edges).toHaveLength(4);
    });
    it("handles type imports", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import type { Foo } from "./types.js";`,
        });
        expect(result.import_edges).toHaveLength(1);
        expect(result.import_edges[0].raw_specifier).toBe("./types.js");
    });
    // BUG-072: require with truly-unresolved package populates unknowns.unresolved_imports
    it("populates unknowns.unresolved_imports for require of unresolved package (BUG-072)", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `const x = require("some-private-pkg");`,
        });
        expect(result.unknowns.unresolved_imports).toHaveLength(1);
        expect(result.unknowns.unresolved_imports[0]).toBe("src/foo.ts:some-private-pkg");
    });
    // Node builtins should NOT populate unresolved_imports
    it("does NOT populate unresolved_imports for node: builtins", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import fs from "node:fs"; import path from "node:path";`,
        });
        expect(result.unknowns.unresolved_imports).toHaveLength(0);
    });
    // BUG-072: relative import does NOT populate unknowns.unresolved_imports
    it("does NOT populate unresolved_imports for relative imports", () => {
        const result = extractImportsFromFile({
            path: "src/foo.ts",
            content: `import { x } from "./bar.js";`,
        });
        expect(result.unknowns.unresolved_imports).toHaveLength(0);
    });
});
//# sourceMappingURL=importExtractor.test.js.map