import type { ContractGateVerdict } from "../../policy/contractGateTypes.js";
import type { PantheonFinding } from "../../cli/types.js";
import type { GitHubRepairRunResult } from "../githubActionTypes.js";
export declare function labelForVerdict(verdict: string): string;
export declare function labelForGateVerdict(verdict: ContractGateVerdict): string;
export declare function summarizeBoundaryReason(finding: PantheonFinding): string;
export declare function formatAllowedActions(actions: readonly string[]): string;
export declare function escapeTableCell(value: string): string;
export declare function summarizeFindingKinds(findings: readonly {
    kind: string;
}[]): string[];
export declare function summarizeContractGateKinds(findings: readonly {
    kind: string;
}[]): string[];
export declare function summarizeRepairKinds(result: GitHubRepairRunResult): string[];
