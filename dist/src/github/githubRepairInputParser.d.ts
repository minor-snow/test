import type { GitHubActionEvent, GitHubPullRequestContext } from "./githubActionTypes.js";
import type { GitHubRepairFailCondition, GitHubRepairInputs } from "./githubRepairTypes.js";
export declare function parseGitHubRepairInputs(env: NodeJS.ProcessEnv): {
    inputs: GitHubRepairInputs;
    event: GitHubActionEvent | null;
    prContext: GitHubPullRequestContext | null;
};
export declare function parseDelimitedList(raw: string | undefined): string[];
export declare function parseRepairFailConditions(raw: string | undefined): GitHubRepairFailCondition[];
