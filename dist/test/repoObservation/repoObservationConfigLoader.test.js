import { describe, it, expect, beforeEach } from "vitest";
import { loadRepoObservationConfig } from "../../src/repoObservation/repoObservationConfigLoader.js";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
const TMP_ROOT = join(import.meta.dirname, "..", "..", "data", ".test-config-loader");
function setup(content) {
    if (existsSync(TMP_ROOT))
        rmSync(TMP_ROOT, { recursive: true });
    mkdirSync(TMP_ROOT, { recursive: true });
    const json = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    writeFileSync(join(TMP_ROOT, "pantheon.json"), json);
}
function cleanup() {
    if (existsSync(TMP_ROOT))
        rmSync(TMP_ROOT, { recursive: true });
}
describe("loadRepoObservationConfig", () => {
    beforeEach(cleanup);
    it("returns empty config when no pantheon.json exists", () => {
        cleanup();
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.loaded_from).toBeNull();
        expect(result.config).toEqual({});
        expect(result.warnings).toHaveLength(0);
    });
    it("loads excluded_dirs", () => {
        setup({ repo_observation: { excluded_dirs: [".build", "vendor"] } });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.loaded_from).toBe("pantheon.json");
        expect(result.config.excluded_dirs).toEqual([".build", "vendor"]);
    });
    it("loads path_roles", () => {
        setup({ repo_observation: { path_roles: { "data/dogfood": "generated", "cockpit": "asset" } } });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.config.path_roles).toEqual({ "data/dogfood": "generated", "cockpit": "asset" });
    });
    it("loads test_mapping_overrides", () => {
        setup({
            repo_observation: {
                test_mapping_overrides: {
                    "src/hash.ts": ["test/hash.test.ts", "test/integrityCheck.test.ts"],
                },
            },
        });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.config.test_mapping_overrides).toEqual({
            "src/hash.ts": ["test/hash.test.ts", "test/integrityCheck.test.ts"],
        });
    });
    it("warns on invalid bucket in path_roles", () => {
        setup({ repo_observation: { path_roles: { "data/x": "invalid_bucket" } } });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain("invalid bucket");
        expect(result.config.path_roles).toEqual({});
    });
    it("warns on non-string excluded_dirs entry", () => {
        setup({ repo_observation: { excluded_dirs: ["valid", 123, null] } });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.config.excluded_dirs).toEqual(["valid"]);
        expect(result.warnings.length).toBeGreaterThan(0);
    });
    it("warns on non-array test_mapping_overrides value", () => {
        setup({ repo_observation: { test_mapping_overrides: { "src/x.ts": "not-array" } } });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain("array of strings");
    });
    it("warns on invalid JSON", () => {
        setup("{ invalid json");
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain("Failed to parse");
        expect(result.config).toEqual({});
    });
    it("handles missing repo_observation section gracefully", () => {
        setup({ other_section: { foo: "bar" } });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.loaded_from).toBe("pantheon.json");
        expect(result.config).toEqual({});
        expect(result.warnings).toHaveLength(0);
    });
    it("warns on non-object repo_observation", () => {
        setup({ repo_observation: "string" });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain("must be an object");
    });
    it("handles all sections together", () => {
        setup({
            repo_observation: {
                excluded_dirs: [".build"],
                path_roles: { "data/dogfood": "generated" },
                test_mapping_overrides: { "src/a.ts": ["test/a.test.ts"] },
            },
        });
        const result = loadRepoObservationConfig(TMP_ROOT);
        expect(result.warnings).toHaveLength(0);
        expect(result.config.excluded_dirs).toEqual([".build"]);
        expect(result.config.path_roles).toEqual({ "data/dogfood": "generated" });
        expect(result.config.test_mapping_overrides).toEqual({ "src/a.ts": ["test/a.test.ts"] });
    });
    // Cleanup after all
    it("cleanup", () => {
        cleanup();
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=repoObservationConfigLoader.test.js.map