/**
 * P25a + P27-1d: Python Test Mapper
 *
 * Maps Python source files to candidate test files using Python conventions.
 * P27-1d: Enhanced with framework-aware candidate generation using
 * layout, framework, and project-role context from P27-1b/1c.
 *
 * Hard rules:
 *   - Does NOT execute tests
 *   - Does NOT generate tests
 *   - Does NOT claim suggested tests are sufficient
 *   - All mappings carry confidence + reason
 *   - High confidence requires path convention + framework context evidence
 */
import type { PythonTestMapping, PythonProjectLayout, PythonFrameworkProfile } from "./types.js";
export type TestMapperInput = {
    readonly sourcePaths: readonly string[];
    readonly observedPaths: ReadonlySet<string>;
    readonly layout?: PythonProjectLayout;
    readonly frameworkProfile?: PythonFrameworkProfile;
};
export declare function mapPythonTests(input: TestMapperInput): PythonTestMapping[];
