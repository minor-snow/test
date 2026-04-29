/**
 * P25a.1: Shared Python Ecosystem Patterns
 *
 * Single source of truth for Python file detection patterns.
 * Used by both pythonFileClassifier and pythonObservationEnhancer
 * to eliminate duplication.
 */
export declare const PYTHON_EXTENSIONS: Set<string>;
export declare const PYTHON_ECOSYSTEM_BASENAMES: Set<string>;
export declare const PYTHON_ECOSYSTEM_PREFIXES: readonly ["requirements"];
/**
 * Check if a file path refers to a Python ecosystem file (config/manifest).
 * These are not .py files but are part of the Python project infrastructure.
 */
export declare function isPythonEcosystemFile(path: string): boolean;
/**
 * Check if a file path refers to a Python source file (.py/.pyi/.pyx/.ipynb).
 */
export declare function isPythonSourceExtension(path: string): boolean;
/**
 * Check if a file is relevant to Python observation (source or ecosystem).
 */
export declare function isPythonRelevantFile(path: string): boolean;
export declare const PYTHON_MANIFEST_BASENAMES: Set<string>;
export declare function isPythonManifestFile(path: string): boolean;
/**
 * Detect if a repo likely contains Python code worth analyzing.
 * Cheap heuristic: check if >5% of files are .py or if key ecosystem files exist.
 */
export declare function hasPythonSignals(filePaths: readonly string[]): boolean;
