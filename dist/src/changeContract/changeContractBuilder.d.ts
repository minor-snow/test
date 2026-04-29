/**
 * P19b: Change Contract Builder
 *
 * Constructs a ChangeContract from upstream Pantheon pipeline outputs:
 *   - P15 BlastRadiusReport → impact + partial refs
 *   - P17 ScopedImplementationBoundaryPackage → scope + remaining refs
 *   - ChangeIntent → human-authored intent
 *   - ChangeContractRefs.canonical_revisions → caller-provided
 *
 * The builder produces a contract in "draft" status with a deterministic
 * contract_id and a contract_created event already appended.
 *
 * Design invariants:
 *   - No full artifact copies. Only hashes, IDs, and summaries.
 *   - Obligations are derived from scope (scope_diff always required;
 *     human_review required iff scope.must_require_human_review).
 *   - contract_id is deterministic from intent + canonical refs.
 *   - The builder never changes lifecycle status beyond "draft".
 *   - P15/P17 upstream consistency is verified (graph_hash + blast_radius_hash).
 *     Mismatch throws — fail-closed.
 *
 * ref: P19b
 */
import type { BlastRadiusReport } from "../boundary/blastRadius.js";
import type { ScopedImplementationBoundaryPackage } from "../scopedHandoff/types.js";
import type { ChangeContract, ChangeContractRefs, ChangeIntent, AgentAdapter } from "./types.js";
export type BuildChangeContractInput = {
    /** Human-authored intent for this change. */
    intent: ChangeIntent;
    /** Canonical artifact revisions that are in scope. */
    canonical_revisions: ChangeContractRefs["canonical_revisions"];
    /** P15 blast radius report. */
    blastRadiusReport: BlastRadiusReport;
    /** P17 scoped implementation boundary package. */
    scopedPackage: ScopedImplementationBoundaryPackage;
    /** Agent adapter to use. Default: "manual". */
    adapter?: AgentAdapter;
    /** Timestamp override for deterministic testing. */
    timestamp?: string;
};
export type BuildChangeContractResult = {
    contract: ChangeContract;
    diagnostics: string[];
};
/**
 * Build a ChangeContract from P15/P17 outputs and an intent.
 *
 * The result is always a valid "draft" contract with:
 * - Deterministic contract_id
 * - Impact derived from P15
 * - Scope derived from P17
 * - Verification obligations auto-generated
 * - One "contract_created" event
 */
export declare function buildChangeContract(input: BuildChangeContractInput): BuildChangeContractResult;
