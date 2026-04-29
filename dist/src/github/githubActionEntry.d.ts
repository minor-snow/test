import type { GitHubActionRunResult } from "./githubActionTypes.js";
import type { GitHubRepairRunResult } from "./githubRepairTypes.js";
export declare function runGitHubAction(env?: NodeJS.ProcessEnv): Promise<GitHubActionRunResult>;
export declare function runGitHubWorkflowAction(env?: NodeJS.ProcessEnv): Promise<GitHubActionRunResult | GitHubRepairRunResult>;
