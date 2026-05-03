import type { ChangeCheckVerdict } from "../change/types.js";
import type { GitHubChangeExitDecision, GitHubChangeFailCondition } from "./githubChangeTypes.js";
export declare function decideGitHubChangeExit(input: {
    verdict: ChangeCheckVerdict;
    sanitizerViolations: number;
    failOn: readonly GitHubChangeFailCondition[];
}): GitHubChangeExitDecision;
