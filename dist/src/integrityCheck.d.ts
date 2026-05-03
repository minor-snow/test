/**
 * Integrity Check – Read-Only Store Validator
 *
 * ref: HARD-002
 *
 * This module performs a read-only scan of the data directory and reports
 * all integrity violations. It never modifies data.
 *
 * Checks:
 *   1. Canonical pointer → revision exists
 *   2. Revision JSON parseable + schema_version registered
 *   2c. Revision structural shape (sections/commitments exist)
 *   3. Block content_hash recomputation match
 *   4. Recomputed revision_id == filename & in-file revision_id
 *   5. parent_revision_id chain continuity
 *   6. Orphan revisions (no canonical path reaches them)
 *   7. Audit log parseable + missing critical events + canonical continuity
 *   8. .tmp leftover files
 */
import type { StoreConfig } from "./artifactStore.js";
export type FindingSeverity = "warning" | "corrupt";
export type Finding = {
    check: string;
    severity: FindingSeverity;
    artifact_id: string;
    revision_id?: string;
    message: string;
};
export type IntegrityReport = {
    timestamp: string;
    data_dir: string;
    findings: Finding[];
    summary: {
        total: number;
        warnings: number;
        corruptions: number;
        artifacts_scanned: number;
        revisions_scanned: number;
        residual_issues: number;
    };
};
/**
 * Run a read-only integrity check on the entire data directory.
 *
 * ref: HARD-002 — "先不自动修, 只做报告"
 *
 * @returns IntegrityReport with all findings
 */
export declare function integrityCheck(config: StoreConfig): Promise<IntegrityReport>;
