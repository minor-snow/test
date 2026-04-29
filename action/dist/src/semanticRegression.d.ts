/**
 * Semantic Regression Gate
 *
 * ref: 执行宪法 v0.2 §12
 *
 * Positioned as a HEURISTIC EARLY WARNING, not a correctness proof.
 *
 * A "failed" status means "needs human review", not "semantically broken".
 * Failure routes to the Human Override Cockpit (§13), not to disposal.
 *
 * MVP checks:
 *   1. Undefined term introduction
 *   2. Strong constraint deletion (must / only / never / always / exactly)
 *
 * Input: structured diff (old blocks, new blocks, changed blocks, context)
 * Output: { status, failed_gates, reasons, affected_blocks }
 */
import type { CommitmentBlock, SemanticRegressionInput, SemanticRegressionResult } from "./types.js";
/**
 * Extract strong constraint keywords from text.
 */
export declare function extractStrongConstraints(text: string): string[];
/**
 * Build a SemanticRegressionInput from old and new artifact states.
 *
 * This is a convenience function. The input to the gate is always
 * a structured diff, not raw artifacts (ref: §12).
 */
export declare function buildRegressionInput(oldBlocks: CommitmentBlock[], newBlocks: CommitmentBlock[], constitutionConstraints?: string[], sectionContext?: Record<string, string>): SemanticRegressionInput;
/**
 * Run the Semantic Regression Gate.
 *
 * ref: §12 — This is a heuristic early warning, not a correctness proof.
 *
 * @returns SemanticRegressionResult
 */
export declare function runSemanticRegression(input: SemanticRegressionInput): SemanticRegressionResult;
