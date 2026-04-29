/**
 * P24: Artifact Layout
 *
 * Canonical .pantheon/ directory structure.
 * Public artifacts go in .pantheon/ root.
 * Internal machine objects go in .pantheon/internal/.
 */
import type { PublicArtifactPaths, InternalArtifactPaths } from "./types.js";
export declare function resolvePantheonDir(repoRoot: string): string;
export declare function ensurePantheonDirs(repoRoot: string): void;
export declare function publicPaths(repoRoot: string): PublicArtifactPaths;
export declare function internalPaths(repoRoot: string): InternalArtifactPaths;
/**
 * Relative path from repo root for display purposes.
 */
export declare function relativePantheonPath(fullPath: string, repoRoot: string): string;
