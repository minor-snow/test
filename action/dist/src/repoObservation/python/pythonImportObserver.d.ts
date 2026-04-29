/**
 * P25a: Python Import Observer
 *
 * Regex-based extraction of Python import statements.
 * Produces syntax-level observations, NOT full runtime import resolution.
 *
 * Supported:
 *   import os
 *   import saleor.checkout
 *   from saleor.checkout import calculations
 *   from .models import Checkout
 *   from ..core import permissions
 *   __import__("x")
 *   importlib.import_module("x")
 */
import type { PythonImportObservation } from "./types.js";
export declare function observePythonImports(input: {
    filePath: string;
    content: string;
    projectPackages: readonly string[];
    declaredPackages: ReadonlySet<string>;
}): PythonImportObservation[];
/**
 * Detect top-level project package directories by finding dirs with __init__.py.
 */
export declare function detectProjectPackages(observedPaths: readonly string[]): string[];
