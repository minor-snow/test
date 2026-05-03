/**
 * P25a: Python Unknown Taxonomy
 *
 * Classifies Python observation unknowns into specific categories,
 * each tagged as out_of_scope, actionable, or intrinsic.
 */
import type { PythonObservationUnknown, PythonObservedFile, PythonImportObservation, PythonDependencyManifest, PythonTestMapping } from "./types.js";
export declare function buildPythonUnknownTaxonomy(input: {
    files: readonly PythonObservedFile[];
    imports: readonly PythonImportObservation[];
    manifests: readonly PythonDependencyManifest[];
    testMappings: readonly PythonTestMapping[];
}): PythonObservationUnknown[];
