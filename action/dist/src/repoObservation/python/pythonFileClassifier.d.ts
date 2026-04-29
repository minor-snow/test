/**
 * P25a: Python File Classifier
 *
 * Path-based classification for Python files.
 * No content inspection — uses only path patterns and extensions.
 */
import type { PythonObservedFile } from "./types.js";
export declare function classifyPythonFile(path: string, sizeBytes: number): PythonObservedFile;
export declare function isPythonFile(path: string): boolean;
