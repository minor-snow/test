import type { GitHubActionEvent, GitHubPullRequestContext } from "./githubActionTypes.js";
import type { GitHubChangeFailCondition, GitHubChangeInputs } from "./githubChangeTypes.js";
export declare function parseGitHubChangeInputs(env: NodeJS.ProcessEnv): {
    inputs: GitHubChangeInputs;
    event: GitHubActionEvent | null;
    prContext: GitHubPullRequestContext | null;
};
export declare function parseChangeFailConditions(raw: string | undefined): GitHubChangeFailCondition[];
