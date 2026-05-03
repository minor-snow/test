/**
 * P24: Pantheon Config Loader
 *
 * Extends existing pantheon.json with P24 public interface fields:
 * protected, review_required, generated, path_roles.
 *
 * Reuses existing repoObservationConfigLoader for path_roles/excluded_dirs.
 * Does NOT use YAML — pantheon.json is the v1 public config.
 */
import type { PantheonConfig } from "./types.js";
export type ConfigLoadResult = {
    readonly config: PantheonConfig;
    readonly warnings: readonly string[];
    readonly loaded_from: string | null;
};
export declare function loadPantheonConfig(repoRoot: string, configPathInput?: string): ConfigLoadResult;
/**
 * Generate default pantheon.json content for `pantheon init`.
 */
export declare function generateDefaultConfigJson(): string;
