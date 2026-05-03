/**
 * Deterministic Linter
 *
 * ref: 执行宪法 v0.2 §17 Day 4
 *
 * This is an L1 Evidence Skill (ref: §7).
 * It produces Issue objects only — it never patches or commits.
 *
 * Rules (all deterministic, no LLM):
 *   1. block.text contains "instantly committed" → unsafe_canonical_commit
 *   2. block.text references undefined terms → undefined_term
 *   3. block.text is empty → empty_block_text
 *   4. block.text has no domain-relevant keywords → domain_irrelevant_content (P4-001)
 *   5. cross-block narrative redundancy → redundant_narrative (P4-003)
 *
 * Design:
 *   - Each rule is a pure function: (block, context) → Issue[]
 *   - The linter collects all defined terms across the artifact
 *     to build a glossary for the undefined term check.
 *   - All output Issues must enter quarantine before promotion (ref: C-03).
 */
import type { Artifact, ArtifactType, CommitmentBlock, Issue } from "./types.js";
export type LinterContext = {
    artifact_id: string;
    base_revision_id: string;
    artifact_type: ArtifactType;
    /** All terms defined across all blocks in the artifact */
    definedTerms: Set<string>;
    /** All blocks across all sections (for cross-block rules) */
    allBlocks: {
        block: CommitmentBlock;
        section_id: string;
    }[];
};
/**
 * Collect all defined terms across an artifact.
 * A term is "defined" if it appears in any block's `terms` array.
 */
export declare function collectDefinedTerms(artifact: Artifact): Set<string>;
/**
 * Extract potential technical terms from block text.
 *
 * Heuristics for MVP:
 *   - Words/phrases in backticks: `quarantine gate`
 *   - snake_case tokens: quarantine_gate
 *   - camelCase tokens: quarantineGate
 *   - Words/phrases in double quotes that look technical (contain _ or are multi-word)
 *
 * This is intentionally conservative — it flags potential terms
 * for human review, not as definitive errors.
 */
export declare function extractPotentialTerms(text: string): string[];
/**
 * Reset the issue counter (for testing).
 */
export declare function resetIssueCounter(): void;
/**
 * Extract 3-grams from text after removing stop words.
 */
export declare function extract3Grams(text: string): Set<string>;
/**
 * Compute overlap ratio between two 3-gram sets.
 * Returns value in [0, 1].
 */
export declare function gramOverlapRatio(a: Set<string>, b: Set<string>): number;
/**
 * Run the deterministic linter on an artifact.
 *
 * ref: §7 — This is an L1 Evidence Skill.
 * ref: §10.1 — Output is Issue[], not patches.
 *
 * @returns Array of Issue objects. These must enter quarantine (ref: C-03).
 */
export declare function lintArtifact(artifact: Artifact): Issue[];
/**
 * Run a single lint rule by name (for testing / selective linting).
 */
export declare function lintBlockWithRule(ruleName: string, block: CommitmentBlock, ctx: LinterContext): Issue[];
