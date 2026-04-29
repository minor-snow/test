/**
 * P19a: Change Contract Types
 *
 * Core domain types for the ChangeContract — the single governance object
 * that binds intent, scope, verification, and result for one AI-driven
 * software change.
 *
 * Design invariants:
 *   - Reference-heavy: hashes and IDs only, no full artifact copies.
 *   - Append-only: result_events must never be overwritten.
 *   - Transaction-centric: one contract per change, not per artifact.
 *   - Thin: validator rejects dump fields.
 *
 * ref: P19a
 */
export {};
//# sourceMappingURL=types.js.map