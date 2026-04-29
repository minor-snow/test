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

import { builtinModules } from "node:module";
import type { ImportResolutionStatus, PackageManifestObservation } from "./types.js";

// ---------------------------------------------------------------------------
// Node builtins set (includes both "fs" and "node:fs" forms)
// ---------------------------------------------------------------------------

const NODE_BUILTINS = new Set<string>([
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a package import specifier against known package manifests.
 *
 * Only call this for non-relative, non-dynamic specifiers.
 */
export function classifyPackageImport(input: {
  rawSpecifier: string;
  packageManifests: readonly PackageManifestObservation[];
}): ImportResolutionStatus {
  const { rawSpecifier, packageManifests } = input;

  // 1. Node builtin
  if (isNodeBuiltin(rawSpecifier)) {
    return "builtin_node_package";
  }

  // 2. Extract package name root
  const packageName = extractPackageName(rawSpecifier);
  if (!packageName) {
    return "unknown_package";
  }

  // 3. No manifests → unknown
  if (packageManifests.length === 0) {
    return "unknown_package";
  }

  // 4. Check all manifests
  for (const manifest of packageManifests) {
    if (isDeclaredIn(packageName, manifest)) {
      return "declared_package";
    }
  }

  // 5. Manifests exist but package not declared
  return "undeclared_package";
}

/**
 * Check if a specifier is a Node.js builtin module.
 */
export function isNodeBuiltin(specifier: string): boolean {
  // node: prefix
  if (specifier.startsWith("node:")) return true;
  // Bare builtin name
  return NODE_BUILTINS.has(specifier);
}

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
export function extractPackageName(specifier: string): string | null {
  // Relative path — not a package
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return null;
  }

  // node: prefix — builtin, not a package
  if (specifier.startsWith("node:")) {
    return null;
  }

  // Scoped package: @scope/pkg or @scope/pkg/subpath
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null; // Malformed scoped package
  }

  // Bare package: pkg or pkg/subpath
  const slashIdx = specifier.indexOf("/");
  if (slashIdx === -1) {
    return specifier;
  }
  return specifier.substring(0, slashIdx);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function isDeclaredIn(packageName: string, manifest: PackageManifestObservation): boolean {
  return (
    manifest.dependencies.includes(packageName) ||
    manifest.dev_dependencies.includes(packageName) ||
    manifest.peer_dependencies.includes(packageName) ||
    manifest.optional_dependencies.includes(packageName)
  );
}
