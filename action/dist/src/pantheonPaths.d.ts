/**
 * Canonical `.pantheon/` state layout shared by CLI, local governance, and GitHub projection.
 *
 * This module lives outside `src/cli/` so domain and infrastructure layers do not depend on a
 * command-surface namespace for core repository state paths.
 */
export type PublicArtifactPaths = {
    readonly dir: string;
    readonly task: string;
    readonly scope: string;
    readonly report: string;
    readonly feedback: string;
    readonly check: string;
};
export type InternalArtifactPaths = {
    readonly dir: string;
    readonly observations: string;
    readonly contract: string;
    readonly scope: string;
    readonly verification: string;
    readonly feedback: string;
};
export declare function resolvePantheonDir(repoRoot: string): string;
export declare function ensurePantheonDirs(repoRoot: string): void;
export declare function publicPaths(repoRoot: string): PublicArtifactPaths;
export declare function internalPaths(repoRoot: string): InternalArtifactPaths;
export declare function relativePantheonPath(fullPath: string, repoRoot: string): string;
