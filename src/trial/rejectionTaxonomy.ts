/**
 * Rejection Taxonomy
 *
 * ref: P6-004
 *
 * Classifies LLM rejection errors into enumerated categories.
 * Maps from free-text validator error messages to structured taxonomy.
 * Does NOT create new validation logic — only classifies existing errors.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type RejectionCategory =
  | "bad_json"
  | "schema_invalid"
  | "wrong_artifact_id"
  | "wrong_base_revision"
  | "wrong_block_id"
  | "operation_not_allowed"
  | "empty_replacement"
  | "overbroad_patch"
  | "capability_violation"
  | "semantic_regression"
  | "unknown";

export type RejectionRecord = {
  category: RejectionCategory;
  gate: string | null;
  raw_error: string;
};

// ---------------------------------------------------------------------------
// Classification rules — ordered by specificity (most specific first)
// ---------------------------------------------------------------------------

type ClassificationRule = {
  category: RejectionCategory;
  gate: string | null;
  patterns: RegExp[];
};

const RULES: ClassificationRule[] = [
  // JSON parse failures (pre-gate)
  {
    category: "bad_json",
    gate: null,
    patterns: [
      /JSON\.parse/i,
      /unexpected token/i,
      /invalid json/i,
      /not valid JSON/i,
      /SyntaxError/i,
      /Failed to parse/i,
    ],
  },

  // Wrong artifact_id
  {
    category: "wrong_artifact_id",
    gate: "schema_gate",
    patterns: [
      /artifact_id.*does not match/i,
      /artifact_id.*mismatch/i,
      /wrong.*artifact_id/i,
    ],
  },

  // Wrong base_revision_id
  {
    category: "wrong_base_revision",
    gate: "schema_gate",
    patterns: [
      /base_revision_id.*does not match/i,
      /base_revision_id.*mismatch/i,
      /wrong.*base_revision/i,
    ],
  },

  // Wrong block_id (G-02)
  {
    category: "wrong_block_id",
    gate: "source_reference_gate",
    patterns: [
      /target_block_id.*does not exist/i,
      /block_id.*not found/i,
      /block.*index/i,
    ],
  },

  // Empty replacement text
  {
    category: "empty_replacement",
    gate: null,
    patterns: [
      /replacement_text.*empty/i,
      /replacement.*blank/i,
      /empty.*replacement/i,
    ],
  },

  // Overbroad patch (touches blocks outside scope)
  {
    category: "overbroad_patch",
    gate: null,
    patterns: [
      /overbroad/i,
      /outside.*scope/i,
      /multiple.*block/i,
      /too many.*operation/i,
    ],
  },

  // Operation not allowed (G-03 — specific output/target violations)
  {
    category: "operation_not_allowed",
    gate: "capability_gate",
    patterns: [
      /operation.*not allowed/i,
      /forbidden.*target/i,
      /not allowed.*output/i,
      /not allowed to produce/i,
    ],
  },

  // Capability violation (G-03 — broader capability errors)
  {
    category: "capability_violation",
    gate: "capability_gate",
    patterns: [
      /forbidden.*writing/i,
      /not allowed to write/i,
      /L3.*disabled/i,
      /Unknown skill/i,
    ],
  },

  // Schema invalid (G-01 — catch-all for schema errors)
  {
    category: "schema_invalid",
    gate: "schema_gate",
    patterns: [
      /schema/i,
      /required.*field/i,
      /missing.*field/i,
      /invalid.*type/i,
      /must have/i,
      /does not conform/i,
      /validation.*failed/i,
    ],
  },

  // Semantic regression
  {
    category: "semantic_regression",
    gate: null,
    patterns: [
      /semantic.*regression/i,
      /regression.*failed/i,
      /meaning.*changed/i,
      /intent.*lost/i,
    ],
  },
];

// ---------------------------------------------------------------------------
// Classify a single error message
// ---------------------------------------------------------------------------

export function classifySingleError(error: string): RejectionRecord {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(error)) {
        return {
          category: rule.category,
          gate: rule.gate,
          raw_error: error,
        };
      }
    }
  }
  return { category: "unknown", gate: null, raw_error: error };
}

// ---------------------------------------------------------------------------
// Classify all rejection errors
// ---------------------------------------------------------------------------

export function classifyRejection(
  errors: string[],
  rawOutput?: string
): RejectionRecord[] {
  // If no errors but rawOutput is present and not valid JSON,
  // it's a bad_json
  if (errors.length === 0 && rawOutput) {
    try {
      JSON.parse(rawOutput);
    } catch {
      return [{ category: "bad_json", gate: null, raw_error: "JSON parse failed" }];
    }
    return [];
  }

  return errors.map(classifySingleError);
}

// ---------------------------------------------------------------------------
// Summarize rejection categories
// ---------------------------------------------------------------------------

export function summarizeRejections(
  records: RejectionRecord[]
): Record<RejectionCategory, number> {
  const summary: Record<string, number> = {};
  for (const r of records) {
    summary[r.category] = (summary[r.category] || 0) + 1;
  }
  return summary as Record<RejectionCategory, number>;
}
