/**
 * Risk Register — System Writer
 *
 * ref: P7b-005
 *
 * Append-only JSONL ledger for accepted engineering risks.
 * NOT a full Artifact — no revisions, no linting, no LLM patching.
 *
 * Write point: accepted_with_residual_issues decision
 * Storage: data/risks/risks.jsonl
 */
export type RiskEntry = {
    risk_id: string;
    source_issue_id: string;
    issue_type: string;
    severity: string;
    block_id: string;
    artifact_id: string;
    canonical_revision_id: string;
    accepted_by: string;
    release_decision_id: string;
    why_accepted: string;
    mitigation?: string;
    created_at: string;
};
/**
 * Append risk entries to the JSONL log.
 * Deduplicates by source_issue_id — if already present, skip.
 */
export declare function appendRiskEntries(dataDir: string, entries: RiskEntry[]): Promise<number>;
/**
 * Read all risk entries from the JSONL log.
 * Returns empty array if file doesn't exist.
 */
export declare function readRiskRegister(dataDir: string): Promise<RiskEntry[]>;
