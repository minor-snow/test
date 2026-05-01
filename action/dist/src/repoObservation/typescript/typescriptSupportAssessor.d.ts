/**
 * P28c: TypeScript/JavaScript Support Level Assessor
 *
 * Determines the support level for a TS/JS repository based on
 * observation signals.
 *
 * Levels:
 *   validated  — framework + test mappings + risk preset matched
 *   supported  — framework or role detected + some signals
 *   smoke      — valid package.json + source files + meaningful config
 *   observed_only — package.json exists but no meaningful engineering signals
 *   unsupported — no package.json or no TS/JS files at all
 *
 * Guardrail: package.json-only without source files stays observed_only.
 * Smoke requires package.json + source files + at least one meaningful signal.
 */
import type { TypeScriptSupportAssessment, TypeScriptFrameworkProfile, TypeScriptProjectLayout, TypeScriptRiskPresetValidation, TypeScriptObservedFile, TypeScriptTestMapping } from "./types.js";
export type SupportAssessorInput = {
    readonly layout: TypeScriptProjectLayout;
    readonly frameworkProfile: TypeScriptFrameworkProfile;
    readonly riskPreset: TypeScriptRiskPresetValidation;
    readonly tsFiles: readonly TypeScriptObservedFile[];
    readonly testMappings: readonly TypeScriptTestMapping[];
    readonly hasPackageJson: boolean;
    readonly allPaths: readonly string[];
    readonly workspace?: any;
};
export declare function assessTypeScriptSupportLevel(input: SupportAssessorInput): TypeScriptSupportAssessment;
