/**
 * P23: Attempt Comparison
 *
 * Deterministic comparison of two trial attempts.
 *
 * Core rules:
 *   1. Violations matched by (kind, location.file_path) — never by violation_id.
 *   2. constraint_id used as tiebreaker when same kind+path appears multiple times.
 *   3. feedback_effect derived from resolved/new counts + verdict severity.
 *   4. regressed → auto-generates ProtocolGap(feedback_ambiguous).
 *   5. unchanged with violations → auto-generates ProtocolGap(feedback_ignored).
 *
 * Verdict severity order: pass < requires_review < requires_reverse_issue < fail
 */
import type { TrialAttempt, AttemptComparison, ProtocolGap } from "./types.js";
/**
 * Compare two consecutive attempts and compute violation deltas.
 *
 * Cross-attempt violation matching:
 * - Match by (kind, location.file_path) first.
 * - If multiple violations share the same kind+path, use constraint_id as tiebreaker.
 * - violation_id is attempt-local and MUST NOT be used for cross-attempt matching.
 */
export declare function compareAttempts(fromAttempt: TrialAttempt, toAttempt: TrialAttempt): AttemptComparison;
/**
 * Auto-generate protocol gaps from an attempt comparison.
 *
 * Rules:
 *   - regressed → feedback_ambiguous
 *   - unchanged with violations > 0 → feedback_ignored
 */
export declare function deriveProtocolGapsFromComparison(comparison: AttemptComparison): ProtocolGap[];
