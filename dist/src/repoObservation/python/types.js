/**
 * P25a: Python Observation Sidecar — Domain Types
 *
 * Sidecar types that live alongside RepoObservations.
 * NOT merged into main types until P29 (unified language adapter).
 *
 * Core invariant: These are syntax-level observations, not full runtime
 * import resolution. The distinction matters for Python where __import__,
 * sys.path, and conditional imports defeat static analysis.
 */
export {};
//# sourceMappingURL=types.js.map