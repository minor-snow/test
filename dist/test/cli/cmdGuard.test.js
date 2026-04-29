import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cmdGuard } from "../../src/cli/cmdGuard.js";
import { internalPaths, publicPaths } from "../../src/cli/artifactLayout.js";
describe("cmdGuard", () => {
    const tmpDir = join("test", "cli", "__tmp_guard__");
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        mkdirSync(tmpDir, { recursive: true });
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("writes explicit review-required and forbidden boundary patterns into the saved scope", () => {
        writeRepoFile("saleor/checkout/calculations.py", "print('checkout')\n");
        writeRepoFile("saleor/graphql/checkout/schema.py", "print('graphql')\n");
        writeRepoFile("saleor/checkout/migrations/0001_initial.py", "print('migration')\n");
        writeRepoFile("saleor/tax/calculations.py", "print('tax')\n");
        writeRepoFile("saleor/order/events.py", "print('order')\n");
        writeRepoFile("saleor/payment/gateway.py", "print('payment')\n");
        writeFileSync(join(tmpDir, "pantheon.json"), JSON.stringify({
            version: 1,
            protected: [".pantheon/**", ".cursor/**"],
            review_required: [],
            generated: [],
            path_roles: {},
        }, null, 2));
        cmdGuard({
            repoRoot: tmpDir,
            intent: "Add an eco-packaging fee during checkout for selected product types.",
            scopePatterns: ["saleor/checkout/**", "saleor/graphql/checkout/**"],
            reviewPatterns: ["saleor/tax/**", "saleor/order/**"],
            forbiddenPatterns: ["saleor/payment/**", "saleor/checkout/migrations/**"],
        });
        const scope = JSON.parse(readFileSync(internalPaths(tmpDir).scope, "utf-8"));
        const check = JSON.parse(readFileSync(publicPaths(tmpDir).check, "utf-8"));
        const scopeMd = readFileSync(publicPaths(tmpDir).scope, "utf-8");
        expect(scope.allowed_files).toEqual([
            "saleor/checkout/calculations.py",
            "saleor/graphql/checkout/schema.py",
        ]);
        expect(scope.allowed_files).not.toContain("saleor/checkout/migrations/0001_initial.py");
        expect(scope.review_required_files.map((file) => file.path)).toEqual([
            "saleor/order/events.py",
            "saleor/tax/calculations.py",
        ]);
        expect(scope.review_required_files[0].reasons).toContain("Explicit review-required boundary.");
        expect(scope.forbidden_patterns).toEqual(expect.arrayContaining([
            expect.objectContaining({ pattern: "saleor/payment/**" }),
        ]));
        expect(check.summary.in_scope).toBe(2);
        expect(check.summary.review_required).toBe(2);
        expect(scopeMd).toContain("Review-required files");
        expect(scopeMd).toContain("saleor/order/events.py");
    });
    it("merges pantheon.json review_required patterns into the boundary", () => {
        writeRepoFile("saleor/checkout/calculations.py", "print('checkout')\n");
        writeRepoFile("saleor/tax/calculations.py", "print('tax')\n");
        writeFileSync(join(tmpDir, "pantheon.json"), JSON.stringify({
            version: 1,
            protected: [".pantheon/**"],
            review_required: ["saleor/tax/**"],
            generated: [],
            path_roles: {},
        }, null, 2));
        cmdGuard({
            repoRoot: tmpDir,
            intent: "Checkout pricing change",
            scopePatterns: ["saleor/checkout/**"],
        });
        const scope = JSON.parse(readFileSync(internalPaths(tmpDir).scope, "utf-8"));
        expect(scope.allowed_files).toEqual(["saleor/checkout/calculations.py"]);
        expect(scope.review_required_files.map((file) => file.path)).toContain("saleor/tax/calculations.py");
    });
    function writeRepoFile(relativePath, content) {
        const fullPath = join(tmpDir, relativePath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content);
    }
});
//# sourceMappingURL=cmdGuard.test.js.map