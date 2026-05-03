/**
 * P28c: TypeScript/JavaScript Framework & Project-Role Detector
 *
 * Detects frameworks and project roles from multiple evidence dimensions:
 *   1. dependency_manifest — packages declared in package.json
 *   2. path_pattern — structural path patterns (pages/, app/, etc.)
 *   3. import_pattern — what modules are imported
 *   4. config_file — presence of config files (next.config.*, vite.config.*, etc.)
 *
 * Hard rules (same as Python adapter):
 *   - At least 2 evidence dimensions required for "high" confidence
 *   - Dependency-only evidence caps at "medium"
 *   - Test frameworks (vitest/jest/playwright) are framework signals, not project roles
 *   - Unknown outputs when no framework/role can be determined
 *
 * P28c-1.1 Calibration:
 *   - Import/path evidence from test/fixtures/examples/data paths is EXCLUDED
 *     from runtime framework detection to prevent false positives.
 *   - Only src/ and top-level source files count as runtime evidence.
 */
import type { TypeScriptFrameworkProfile, TypeScriptProjectLayout } from "./types.js";
import type { ObservedFile, PackageManifestObservation, ImportEdge, ConfigHint } from "../types.js";
export type FrameworkDetectorInput = {
    readonly files: readonly ObservedFile[];
    readonly manifests: readonly PackageManifestObservation[];
    readonly imports: readonly ImportEdge[];
    readonly configHints: readonly ConfigHint[];
    readonly layout: TypeScriptProjectLayout;
    readonly allPaths: readonly string[];
    readonly packageJsonFields?: any;
};
export declare function detectTypeScriptFrameworkProfile(input: FrameworkDetectorInput): TypeScriptFrameworkProfile;
