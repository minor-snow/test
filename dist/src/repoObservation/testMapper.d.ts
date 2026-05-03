/**
 * P20a: Test Mapper
 *
 * Maps source files to test files by path convention.
 * Does NOT do coverage analysis or content inspection.
 */
import type { ObservedFile, TestMapping } from "./types.js";
export declare function inferTestMappings(input: {
    files: ObservedFile[];
    overrides?: Readonly<Record<string, readonly string[]>>;
}): {
    test_mappings: TestMapping[];
    unmapped_sources: string[];
    unmapped_tests: string[];
    ambiguous_test_mappings: string[];
};
