/**
 * P20a: Sensitive Path Detector
 *
 * Detects sensitive paths by keyword matching in path segments.
 * No content inspection — path-only analysis.
 */
import type { SensitivePath } from "./types.js";
import type { ObservedFile } from "./types.js";
/**
 * Detect sensitive paths by keyword matching in path segments.
 */
export declare function detectSensitivePaths(files: ObservedFile[]): SensitivePath[];
