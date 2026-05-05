import type { ContractGateResult } from "../../policy/contractGateTypes.js";
import type { GitHubDisclosureLevel, GitHubRenderedComment, GitHubRenderedSummary } from "../githubActionTypes.js";
export declare const PANTHEON_GATE_COMMENT_MARKER = "<!-- pantheon-contract-gate-v1 -->";
export declare function renderContractGatePrComment(result: ContractGateResult, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedComment;
export declare function renderContractGateStepSummary(result: ContractGateResult, options?: {
    disclosure?: GitHubDisclosureLevel;
}): GitHubRenderedSummary;
