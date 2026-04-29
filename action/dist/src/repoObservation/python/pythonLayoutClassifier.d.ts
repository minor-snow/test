/**
 * P27-1b: Python Layout Classifier
 *
 * Classifies the physical organization (layout) of a Python repository
 * into two orthogonal dimensions:
 *
 *   1. primary_layout — project form (django_project, api_service, library_package, etc.)
 *   2. package_layout — Python packaging structure (src_layout, flat_package, etc.)
 *
 * Uses only paths, file buckets, and manifest presence — NOT framework role inference.
 * Framework/project-role detection is deferred to P27-1c.
 */
import type { PythonObservedFile, PythonDependencyManifest, PythonProjectLayout } from "./types.js";
export type LayoutClassifierInput = {
    readonly files: readonly PythonObservedFile[];
    readonly manifests: readonly PythonDependencyManifest[];
    readonly allPaths: readonly string[];
};
export declare function classifyPythonLayout(input: LayoutClassifierInput): PythonProjectLayout;
