/**
 * Backward-compatible re-export for legacy CLI imports.
 *
 * New shared code should import from `src/pantheonPaths.ts` directly so core state layout does not
 * depend on the CLI namespace.
 */
export { ensurePantheonDirs, internalPaths, publicPaths, relativePantheonPath, resolvePantheonDir, type InternalArtifactPaths, type PublicArtifactPaths, } from "../pantheonPaths.js";
