import type { PantheonCheckPublic } from "../cli/types.js";
import type { GitHubExitDecision, GitHubFailCondition } from "./githubActionTypes.js";
export declare function decideGitHubActionExit(input: {
    check: PantheonCheckPublic;
    failOn: readonly GitHubFailCondition[];
}): GitHubExitDecision;
