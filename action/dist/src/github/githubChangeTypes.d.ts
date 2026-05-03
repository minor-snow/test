import type { ChangeCheckResult, ChangeCheckVerdict } from "../change/types.js";
import type { GitHubArtifactMode, GitHubCommentMode, GitHubCommentOperationResult, GitHubPullRequestContext } from "./githubActionTypes.js";
export type GitHubChangeFailCondition = ChangeCheckVerdict | "public_artifact_sanitizer_violation" | "all" | "none";
export type GitHubChangeInputs = {
    readonly mode: "change";
    readonly changeId: string;
    readonly configPath: string;
    readonly artifactMode: GitHubArtifactMode;
    readonly commentMode: GitHubCommentMode;
    readonly postComment: boolean;
    readonly uploadArtifacts: boolean;
    readonly failOn: readonly GitHubChangeFailCondition[];
    readonly baseSha?: string;
    readonly headSha?: string;
};
export type GitHubChangeExitDecision = {
    readonly shouldFail: boolean;
    readonly matchedConditions: readonly GitHubChangeFailCondition[];
    readonly reason: string;
};
export type GitHubChangeRunResult = {
    readonly inputs: GitHubChangeInputs;
    readonly prContext: GitHubPullRequestContext | null;
    readonly check: ChangeCheckResult;
    readonly changeId: string;
    readonly changeType: string;
    readonly exitDecision: GitHubChangeExitDecision;
    readonly artifactOutputDir: string;
    readonly artifactCollection: {
        readonly outputDir: string;
        readonly copiedPublicArtifacts: readonly string[];
        readonly copiedDebugArtifacts: readonly string[];
        readonly sanitizerViolations: readonly string[];
    };
    readonly summaryPath: string | null;
    readonly commentPath: string;
    readonly commentResult: GitHubCommentOperationResult;
};
