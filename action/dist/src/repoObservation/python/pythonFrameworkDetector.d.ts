/**
 * P27-1c: Python Framework & Project-Role Detector
 *
 * Detects frameworks and project roles from multiple evidence dimensions:
 *   1. dependency_manifest — packages declared in manifests
 *   2. layout_classification — primary_layout / package_layout from P27-1b
 *   3. path_pattern — structural path patterns (manage.py, migrations/, etc.)
 *   4. import_pattern — what top-level modules are imported
 *
 * Hard rules:
 *   - At least 2 evidence dimensions required for "high" confidence
 *   - Dependency-only evidence caps at "medium"
 *   - pytest is "test_framework" kind, never a project role
 *   - Unknown outputs when no framework/role can be determined
 *   - Does NOT modify layout, test mapping, or risk presets
 */
import type { PythonObservedFile, PythonDependencyManifest, PythonImportObservation, PythonProjectLayout, PythonFrameworkProfile } from "./types.js";
export type FrameworkDetectorInput = {
    readonly files: readonly PythonObservedFile[];
    readonly manifests: readonly PythonDependencyManifest[];
    readonly imports: readonly PythonImportObservation[];
    readonly layout: PythonProjectLayout;
    readonly allPaths: readonly string[];
};
export declare function detectPythonFrameworkProfile(input: FrameworkDetectorInput): PythonFrameworkProfile;
