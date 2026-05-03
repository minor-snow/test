/**
 * Rejection Taxonomy
 *
 * ref: P6-004
 *
 * Classifies LLM rejection errors into enumerated categories.
 * Maps from free-text validator error messages to structured taxonomy.
 * Does NOT create new validation logic — only classifies existing errors.
 */
export type RejectionCategory = "bad_json" | "schema_invalid" | "wrong_artifact_id" | "wrong_base_revision" | "wrong_block_id" | "operation_not_allowed" | "empty_replacement" | "overbroad_patch" | "capability_violation" | "semantic_regression" | "unknown";
export type RejectionRecord = {
    category: RejectionCategory;
    gate: string | null;
    raw_error: string;
};
export declare function classifySingleError(error: string): RejectionRecord;
export declare function classifyRejection(errors: string[], rawOutput?: string): RejectionRecord[];
export declare function summarizeRejections(records: RejectionRecord[]): Record<RejectionCategory, number>;
