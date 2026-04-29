import type { RepairVerdict } from "../repair/types.js";
import type { GitHubRepairExitDecision, GitHubRepairFailCondition } from "./githubRepairTypes.js";
export declare function decideGitHubRepairExit(input: {
    verdict: RepairVerdict;
    sanitizerViolations: number;
    failOn: readonly GitHubRepairFailCondition[];
}): GitHubRepairExitDecision;
