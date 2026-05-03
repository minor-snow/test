/**
 * P28c: TypeScript/JavaScript Risk Preset Validator
 *
 * Matches repository signals against risk presets and generates
 * review_required / forbidden suggestions.
 *
 * DESIGN PRINCIPLE: CONSERVATIVE BY DEFAULT.
 * - dist/build/generated → review_required (never silently allowed)
 * - package.json scripts/exports/bin changes → review_required
 * - lockfile changes → review_required
 * - .env files → review_required
 * - GitHub workflow / action.yml → review_required
 * - tsconfig / build config → review_required
 * - public exports (index.ts) → review_required
 * - auth/payment paths → review_required
 *
 * Guardrail: dist/ MUST NOT silently pass unless change intent
 * explicitly declares rebuild with source relationship.
 */
import type { TypeScriptRiskPresetValidation, TypeScriptProjectLayout, TypeScriptFrameworkProfile, TypeScriptObservedFile } from "./types.js";
export type RiskPresetInput = {
    readonly layout: TypeScriptProjectLayout;
    readonly frameworkProfile: TypeScriptFrameworkProfile;
    readonly tsFiles: readonly TypeScriptObservedFile[];
    readonly allPaths: readonly string[];
    readonly packageJsonFields: PackageJsonFields;
};
export type PackageJsonFields = {
    readonly scripts?: Record<string, string>;
    readonly bin?: string | Record<string, string>;
    readonly exports?: unknown;
    readonly main?: string;
    readonly module?: string;
    readonly types?: string;
    readonly workspaces?: string[] | {
        packages?: string[];
    };
    readonly packageManager?: string;
    readonly engines?: Record<string, string>;
};
export declare function validateTypeScriptRiskPreset(input: RiskPresetInput): TypeScriptRiskPresetValidation;
