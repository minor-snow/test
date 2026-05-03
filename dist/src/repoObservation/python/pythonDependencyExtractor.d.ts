/**
 * P25a: Python Dependency Extractor
 *
 * Conservative extraction from pyproject.toml, requirements*.txt, setup.cfg.
 * NO TOML parser dependency — uses regex-based text extraction.
 *
 * Returns package names (normalized) and confidence levels.
 * Unsupported structures get confidence: "low" + warning.
 */
import type { PythonDependencyManifest } from "./types.js";
export declare function extractPythonDependencies(input: {
    filePath: string;
    content: string;
}): PythonDependencyManifest;
/**
 * Normalize a package name for comparison.
 * PyPI treats - and _ and . as equivalent; lowercase everything.
 */
export declare function normalizePackageName(name: string): string;
/**
 * Build a lookup set of declared package names from manifests.
 */
export declare function buildDeclaredPackageSet(manifests: readonly PythonDependencyManifest[]): Set<string>;
