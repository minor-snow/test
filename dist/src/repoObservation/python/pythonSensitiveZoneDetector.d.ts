/**
 * P25a: Python Sensitive Zone Detector
 *
 * Keyword matching + config overrides for identifying high-risk code areas.
 */
import type { PythonSensitiveZone } from "./types.js";
export declare function detectPythonSensitiveZones(input: {
    pythonPaths: readonly string[];
    sensitiveOverrides?: Readonly<Record<string, string>>;
}): PythonSensitiveZone[];
