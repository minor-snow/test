/**
 * P28c: TypeScript/JavaScript Observation Sidecar — Domain Types
 *
 * Sidecar types that live alongside RepoObservations.
 * Mirrors python/types.ts architecture.
 *
 * Core invariant: These are manifest/config/path-level observations,
 * not full TypeScript compiler API analysis. The distinction matters
 * because TS projects use diverse build pipelines (tsc, esbuild,
 * swc, babel) that defeat static-only analysis.
 */
export {};
//# sourceMappingURL=types.js.map