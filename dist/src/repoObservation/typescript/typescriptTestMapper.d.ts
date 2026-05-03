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
import type { TypeScriptTestMapping, TypeScriptObservedFile } from "./types.js";
export type TestMapperInput = {
    readonly tsFiles: readonly TypeScriptObservedFile[];
    readonly allPaths: readonly string[];
};
export type TestMapperOutput = {
    readonly test_mappings: TypeScriptTestMapping[];
    readonly unmapped_sources: string[];
    readonly unmapped_tests: string[];
    readonly e2e_tests: string[];
    readonly integration_tests: string[];
};
export declare function mapTypeScriptTests(input: TestMapperInput): TestMapperOutput;
