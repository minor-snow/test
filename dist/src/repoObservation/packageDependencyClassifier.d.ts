/**
 * P20a.2: Package Dependency Classifier
 *
 * Classifies package imports using package.json manifests and Node builtins.
 * Replaces the brittle WELLKNOWN_PACKAGES list with ground-truth resolution.
 *
 * Resolution order:
 *   1. node: prefix or builtin module → builtin_node_package
 *   2. Declared in any package.json dep group → declared_package
 *   3. package.json exists but not declared → undeclared_package
 *   4. No package.json found → unknown_package
 */
import type { ImportResolutionStatus, PackageManifestObservation } from "./types.js";
/**
 * Classify a package import specifier against known package manifests.
 *
 * Only call this for non-relative, non-dynamic specifiers.
 */
export declare function classifyPackageImport(input: {
    rawSpecifier: string;
    packageManifests: readonly PackageManifestObservation[];
}): ImportResolutionStatus;
/**
 * Check if a specifier is a Node.js builtin module.
 */
export declare function isNodeBuiltin(specifier: string): boolean;
/**
 * Extract the root package name from an import specifier.
 *
 * Examples:
 *   "lodash/fp"           → "lodash"
 *   "@scope/pkg/sub"      → "@scope/pkg"
 *   "zod"                 → "zod"
 *   "@scope/pkg"          → "@scope/pkg"
 *   "./relative"          → null (not a package)
 */
export declare function extractPackageName(specifier: string): string | null;
