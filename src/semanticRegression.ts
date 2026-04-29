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

import type {
  CommitmentBlock,
  SemanticRegressionInput,
  SemanticRegressionResult,
} from "./types.js";

// ---------------------------------------------------------------------------
// Strong constraint keywords
// ---------------------------------------------------------------------------

/**
 * Keywords that represent strong architectural commitments.
 * Deleting them from a block is a potential semantic regression.
 */
const STRONG_CONSTRAINT_KEYWORDS = [
  "must",
  "must not",
  "shall",
  "shall not",
  "only",
  "never",
  "always",
  "exactly",
  "forbidden",
  "prohibited",
  "required",
  "mandatory",
];

/**
 * Build a regex that matches strong constraint keywords as whole words.
 * Case-insensitive.
 */
function buildConstraintRegex(): RegExp {
  // Sort by length descending so "must not" matches before "must"
  const sorted = [...STRONG_CONSTRAINT_KEYWORDS].sort(
    (a, b) => b.length - a.length
  );
  const pattern = sorted.map((k) => k.replace(/\s+/g, "\\s+")).join("|");
  return new RegExp(`\\b(${pattern})\\b`, "gi");
}

const CONSTRAINT_REGEX = buildConstraintRegex();

/**
 * Extract strong constraint keywords from text.
 */
export function extractStrongConstraints(text: string): string[] {
  const matches = text.matchAll(CONSTRAINT_REGEX);
  const keywords: string[] = [];
  for (const m of matches) {
    keywords.push(m[1].toLowerCase());
  }
  return [...new Set(keywords)];
}

// ---------------------------------------------------------------------------
// Term extraction (reuses logic from linter, but self-contained here)
// ---------------------------------------------------------------------------

/**
 * Extract potential technical terms from text.
 * Same heuristics as the linter: backticks, snake_case, camelCase.
 */
function extractTermsFromText(text: string): Set<string> {
  const terms = new Set<string>();

  // Backtick-quoted terms
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    terms.add(m[1].toLowerCase());
  }

  // snake_case tokens
  for (const m of text.matchAll(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/gi)) {
    terms.add(m[1].toLowerCase());
  }

  // camelCase tokens
  for (const m of text.matchAll(/\b([a-z]+[A-Z][a-zA-Z0-9]*)\b/g)) {
    terms.add(m[1].toLowerCase());
  }

  return terms;
}

// ---------------------------------------------------------------------------
// Check: undefined term introduction
// ---------------------------------------------------------------------------

type CheckResult = {
  gate: string;
  passed: boolean;
  reasons: string[];
  affected_blocks: string[];
};

/**
 * Check 1: Does the new block introduce terms not present in the
 * artifact-wide defined terms or the old block?
 *
 * ref: §12 — "是否引入未定义术语"
 */
function checkUndefinedTerms(
  input: SemanticRegressionInput
): CheckResult {
  const reasons: string[] = [];
  const affected: string[] = [];

  // Build the set of all known/defined terms
  const definedTerms = new Set<string>();

  // Terms from all old blocks
  for (const block of input.old_blocks) {
    if (block.terms) {
      for (const t of block.terms) definedTerms.add(t.toLowerCase());
    }
  }

  // Terms from all new blocks
  for (const block of input.new_blocks) {
    if (block.terms) {
      for (const t of block.terms) definedTerms.add(t.toLowerCase());
    }
  }

  // Terms from constitution constraints (treated as defined)
  for (const c of input.constitution_constraints) {
    for (const t of extractTermsFromText(c)) {
      definedTerms.add(t);
    }
  }

  // Check each changed block for new undefined terms
  for (const change of input.changed_blocks) {
    const oldTerms = extractTermsFromText(change.old.text);
    const newTerms = extractTermsFromText(change.new.text);

    for (const term of newTerms) {
      // Term is new if it wasn't in old text AND isn't globally defined
      if (!oldTerms.has(term) && !definedTerms.has(term)) {
        reasons.push(
          `Block "${change.block_id}": introduces undefined term "${term}"`
        );
        if (!affected.includes(change.block_id)) {
          affected.push(change.block_id);
        }
      }
    }
  }

  return {
    gate: "undefined_term",
    passed: reasons.length === 0,
    reasons,
    affected_blocks: affected,
  };
}

// ---------------------------------------------------------------------------
// Check: strong constraint deletion
// ---------------------------------------------------------------------------

/**
 * Check 2: Does the new block delete strong constraint keywords
 * (must, only, never, always, etc.) that were present in the old block?
 *
 * ref: §12 — "是否删除旧 block 中的 must / only / never 等强约束"
 */
function checkConstraintDeletion(
  input: SemanticRegressionInput
): CheckResult {
  const reasons: string[] = [];
  const affected: string[] = [];

  for (const change of input.changed_blocks) {
    const oldConstraints = extractStrongConstraints(change.old.text);
    const newConstraints = extractStrongConstraints(change.new.text);
    const newSet = new Set(newConstraints);

    for (const keyword of oldConstraints) {
      if (!newSet.has(keyword)) {
        reasons.push(
          `Block "${change.block_id}": strong constraint "${keyword}" was removed`
        );
        if (!affected.includes(change.block_id)) {
          affected.push(change.block_id);
        }
      }
    }
  }

  return {
    gate: "constraint_deletion",
    passed: reasons.length === 0,
    reasons,
    affected_blocks: affected,
  };
}

// ---------------------------------------------------------------------------
// Build regression input from old and new artifacts
// ---------------------------------------------------------------------------

/**
 * Build a SemanticRegressionInput from old and new artifact states.
 *
 * This is a convenience function. The input to the gate is always
 * a structured diff, not raw artifacts (ref: §12).
 */
export function buildRegressionInput(
  oldBlocks: CommitmentBlock[],
  newBlocks: CommitmentBlock[],
  constitutionConstraints: string[] = [],
  sectionContext: Record<string, string> = {}
): SemanticRegressionInput {
  // Build block maps
  const oldMap = new Map(oldBlocks.map((b) => [b.block_id, b]));
  const newMap = new Map(newBlocks.map((b) => [b.block_id, b]));

  // Find changed blocks
  const changedBlocks: SemanticRegressionInput["changed_blocks"] = [];
  for (const [blockId, newBlock] of newMap) {
    const oldBlock = oldMap.get(blockId);
    if (oldBlock && oldBlock.content_hash !== newBlock.content_hash) {
      changedBlocks.push({
        block_id: blockId,
        old: oldBlock,
        new: newBlock,
      });
    }
  }

  return {
    old_blocks: oldBlocks,
    new_blocks: newBlocks,
    changed_blocks: changedBlocks,
    section_context: sectionContext,
    constitution_constraints: constitutionConstraints,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the Semantic Regression Gate.
 *
 * ref: §12 — This is a heuristic early warning, not a correctness proof.
 *
 * @returns SemanticRegressionResult
 */
export function runSemanticRegression(
  input: SemanticRegressionInput
): SemanticRegressionResult {
  const checks = [
    checkUndefinedTerms(input),
    checkConstraintDeletion(input),
  ];

  const failedGates: string[] = [];
  const allReasons: string[] = [];
  const allAffected: string[] = [];

  for (const check of checks) {
    if (!check.passed) {
      failedGates.push(check.gate);
      allReasons.push(...check.reasons);
      for (const b of check.affected_blocks) {
        if (!allAffected.includes(b)) allAffected.push(b);
      }
    }
  }

  return {
    status: failedGates.length === 0 ? "passed" : "failed",
    failed_gates: failedGates,
    reasons: allReasons,
    affected_blocks: allAffected,
  };
}
