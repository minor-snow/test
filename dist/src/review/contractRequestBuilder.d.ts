/**
 * P29.5: Contract Request Builder
 *
 * Generates review requests from ContractGateResult for the local review queue.
 * These review items ensure that `requires_contract` verdicts are tracked,
 * auditable, and visible in daily metrics reports.
 *
 * Generated request types:
 *   - contract_request     — high/medium risk without contract
 *   - policy_tamper_review — governance policy file modified
 *   - trusted_approval_required — policy-sensitive changes need trusted approval
 *   - fake_approval_detected — PR includes untrusted approval artifact
 *
 * ref: P29.5 section 15
 */
import type { ContractGateResult } from "../policy/contractGateTypes.js";
import type { ReviewRequest } from "./reviewRequestTypes.js";
export declare function buildContractGateReviewRequest(input: {
    gateResult: ContractGateResult;
    source: "local_cli" | "github_action";
    pr?: {
        provider: "github";
        number?: number;
        url?: string;
    };
}): ReviewRequest | null;
