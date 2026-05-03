import type { GitHubRenderedComment, GitHubRenderedSummary, GitHubRepairRunResult } from "./githubActionTypes.js";
import type { ContractGateResult } from "../policy/contractGateTypes.js";
import type { PantheonCheckPublic } from "../cli/types.js";
import type { ChangeCheckResult } from "../change/types.js";
export type ArchitectureFindingForRender = {
    kind: string;
    message: string;
    severity: string;
    files?: string[];
};
export declare function renderArchitectureFindingsSection(findings: ArchitectureFindingForRender[], baseSha: string | null): string;
export declare const PANTHEON_BOUNDARY_CHECK_MARKER = "<!-- pantheon-boundary-check-v0 -->";
export declare function renderGitHubPrComment(check: PantheonCheckPublic): GitHubRenderedComment;
export declare function renderGitHubStepSummary(check: PantheonCheckPublic, metadata?: {
    readonly baseSha?: string;
    readonly headSha?: string;
}): GitHubRenderedSummary;
export declare const PANTHEON_CHANGE_COMMENT_MARKER = "<!-- pantheon_change_governance_comment -->";
export declare function renderChangePrComment(check: ChangeCheckResult, context?: {
    baseSha?: string;
    headSha?: string;
    type?: string;
}): GitHubRenderedComment;
export declare function renderChangeStepSummary(check: ChangeCheckResult, context: {
    baseSha?: string;
    headSha?: string;
    type?: string;
}): GitHubRenderedSummary;
export declare const PANTHEON_GATE_COMMENT_MARKER = "<!-- pantheon-contract-gate-v1 -->";
export declare function renderContractGatePrComment(result: ContractGateResult): GitHubRenderedComment;
export declare function renderContractGateStepSummary(result: ContractGateResult): GitHubRenderedSummary;
export declare const PANTHEON_REPAIR_COMMENT_MARKER = "<!-- pantheon-repair-gate-v0 -->";
export declare function renderGitHubRepairComment(result: GitHubRepairRunResult): GitHubRenderedComment;
export declare function renderGitHubRepairStepSummary(result: GitHubRepairRunResult): GitHubRenderedSummary;
