/**
 * P25b: Python Governance Renderer
 *
 * Product-quality Markdown renderers that project Python observation sidecar
 * data into actionable governance artifacts.
 *
 * Three outputs:
 *   1. Standalone Python governance report (python_report.md)
 *   2. Python-enhanced task.md sections (sensitive warnings + test mappings)
 *   3. Python-enhanced scope.md sections (risk heatmap + test coverage)
 *
 * NO internal terminology. NO Pantheon internals.
 */
import type { PythonObservationSidecar } from "./types.js";
export declare function renderPythonGovernanceReport(input: {
    sidecar: PythonObservationSidecar;
    intent: string;
    scopeFiles: readonly string[];
    repoLabel: string;
}): string;
export type PythonTaskEnhancement = {
    readonly sensitiveWarnings: readonly string[];
    readonly testSuggestions: readonly string[];
};
export declare function computePythonTaskEnhancement(input: {
    sidecar: PythonObservationSidecar;
    scopeFiles: readonly string[];
}): PythonTaskEnhancement;
/**
 * Render the Python sensitive warnings section for task.md.
 */
export declare function renderPythonTaskSensitiveWarnings(enhancement: PythonTaskEnhancement): string;
/**
 * Render the Python test suggestions section for task.md.
 */
export declare function renderPythonTaskTestSuggestions(enhancement: PythonTaskEnhancement): string;
export declare function renderPythonScopeSections(input: {
    sidecar: PythonObservationSidecar;
    scopeFiles: readonly string[];
}): string;
