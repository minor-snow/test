/**
 * P29.5: Contract Gate Comment Renderer
 *
 * Renders GitHub PR comments for contract gate verdicts.
 * Three comment types:
 *   1. Contract Gate — requires_contract with why/next sections
 *   2. Governance Policy Changed — policy tamper notification
 *   3. Untrusted Approval Ignored — fake approval rejection
 *
 * All comments include base-branch policy disclosure.
 *
 * ref: P29.5 section 14
 */
import type { ContractGateResult } from "../policy/contractGateTypes.js";
export type ContractGateComment = {
    readonly markdown: string;
    readonly marker: string;
};
export declare function renderContractGateComment(result: ContractGateResult): ContractGateComment;
