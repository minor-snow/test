/**
 * P18: Test Result Validator
 *
 * Validates required test results against scope-bound required-tests.json.
 * Primary join key: test_id.
 *
 * ref: P18
 */
import type { ScopedImplementationBoundaryPackage, RequiredTestsFile } from "../scopedHandoff/types.js";
import type { TestResult, ScopeDiffViolation, ScopeDiffWarning, ScopeDiffOptions } from "./types.js";
export declare function validateRequiredTests(requiredTestsFile: RequiredTestsFile, scope: ScopedImplementationBoundaryPackage, testResults?: TestResult[], options?: ScopeDiffOptions, scopeHash?: string): {
    violations: ScopeDiffViolation[];
    warnings: ScopeDiffWarning[];
    summary: {
        required_tests: number;
        required_tests_passed: number;
        required_tests_failed: number;
        required_tests_missing: number;
    };
};
