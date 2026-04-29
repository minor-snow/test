/**
 * P27-1e: Python Risk Preset Validator
 *
 * Produces suggested review/forbid boundary candidates based on observed
 * layout, framework, project-role, sensitive zones, and path signals.
 *
 * Hard rules:
 *   - Does NOT auto-decide allowed/review/forbid
 *   - Only outputs suggestions with matched_signals + reason
 *   - Unobserved paths go to dormant_patterns
 *   - SDK/library defaults to review, not forbid
 *   - Unvalidated presets cannot produce strong recommendations
 *   - Does NOT modify test mapper, layout, or framework detector
 */
import type { PythonProjectLayout, PythonFrameworkProfile, PythonSensitiveZone, PythonRiskPresetValidation } from "./types.js";
export type RiskPresetValidatorInput = {
    readonly layout: PythonProjectLayout;
    readonly frameworkProfile: PythonFrameworkProfile;
    readonly sensitiveZones: readonly PythonSensitiveZone[];
    readonly allPaths: readonly string[];
};
export declare function validatePythonRiskPreset(input: RiskPresetValidatorInput): PythonRiskPresetValidation;
