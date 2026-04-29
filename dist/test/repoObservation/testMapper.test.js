import { describe, it, expect } from "vitest";
import { inferTestMappings } from "../../src/repoObservation/testMapper.js";
function makeFile(path, bucket) {
    return { path, bucket, language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] };
}
describe("inferTestMappings", () => {
    it("maps src/foo.ts to test/foo.test.ts (parallel_test_dir)", () => {
        const result = inferTestMappings({
            files: [makeFile("src/foo.ts", "src"), makeFile("test/foo.test.ts", "test")],
        });
        expect(result.test_mappings).toHaveLength(1);
        expect(result.test_mappings[0].source_path).toBe("src/foo.ts");
        expect(result.test_mappings[0].test_path).toBe("test/foo.test.ts");
        expect(result.test_mappings[0].mapping_kind).toBe("parallel_test_dir");
        expect(result.test_mappings[0].confidence).toBe("high");
    });
    it("maps src/sub/bar.ts to tests/sub/bar.test.ts", () => {
        const result = inferTestMappings({
            files: [makeFile("src/sub/bar.ts", "src"), makeFile("tests/sub/bar.test.ts", "test")],
        });
        expect(result.test_mappings).toHaveLength(1);
        expect(result.test_mappings[0].test_path).toBe("tests/sub/bar.test.ts");
    });
    it("maps src/foo.ts to src/foo.test.ts (co-located)", () => {
        const result = inferTestMappings({
            files: [makeFile("src/foo.ts", "src"), makeFile("src/foo.test.ts", "test")],
        });
        expect(result.test_mappings).toHaveLength(1);
        expect(result.test_mappings[0].mapping_kind).toBe("same_basename");
    });
    it("maps src/foo.ts to test/foo.spec.ts (suffix_spec)", () => {
        const result = inferTestMappings({
            files: [makeFile("src/foo.ts", "src"), makeFile("test/foo.spec.ts", "test")],
        });
        expect(result.test_mappings).toHaveLength(1);
        expect(result.test_mappings[0].mapping_kind).toBe("suffix_spec");
    });
    it("records unmapped source when no test found", () => {
        const result = inferTestMappings({
            files: [makeFile("src/orphan.ts", "src")],
        });
        expect(result.test_mappings).toHaveLength(0);
        expect(result.unmapped_sources).toContain("src/orphan.ts");
    });
    it("records unmapped test when no source matches", () => {
        const result = inferTestMappings({
            files: [makeFile("test/standalone.test.ts", "test")],
        });
        expect(result.test_mappings).toHaveLength(0);
        expect(result.unmapped_tests).toContain("test/standalone.test.ts");
    });
    it("records ambiguous when multiple test candidates exist", () => {
        const result = inferTestMappings({
            files: [
                makeFile("src/foo.ts", "src"),
                makeFile("test/foo.test.ts", "test"),
                makeFile("tests/foo.test.ts", "test"),
            ],
        });
        expect(result.test_mappings).toHaveLength(1);
        expect(result.ambiguous_test_mappings).toContain("src/foo.ts");
        expect(result.test_mappings[0].confidence).toBe("low");
    });
    it("handles deeply nested paths", () => {
        const result = inferTestMappings({
            files: [
                makeFile("src/auth/utils/helper.ts", "src"),
                makeFile("test/auth/utils/helper.test.ts", "test"),
            ],
        });
        expect(result.test_mappings).toHaveLength(1);
        expect(result.test_mappings[0].test_path).toBe("test/auth/utils/helper.test.ts");
    });
});
//# sourceMappingURL=testMapper.test.js.map