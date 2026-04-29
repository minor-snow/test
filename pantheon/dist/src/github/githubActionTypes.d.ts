import type { PantheonCheckPublic, PantheonFinding } from "../cli/types.js";
export type GitHubFailCondition = "forbidden" | "outside_scope" | "review_required" | "all" | "none";
export type GitHubArtifactMode = "public" | "debug";
export type GitHubCommentMode = "update" | "off";
export type GitHubActionConfig = {
    readonly intent: string;
    readonly scopePatterns: readonly string[];
    readonly reviewPatterns: readonly string[];
    readonly forbidPatterns: readonly string[];
    readonly configPath: string;
    readonly failOn: readonly GitHubFailCondition[];
    readonly postComment: boolean;
    readonly uploadArtifacts: boolean;
    readonly artifactMode: GitHubArtifactMode;
    readonly commentMode: GitHubCommentMode;
    readonly baseSha?: string;
    readonly headSha?: string;
};
export type GitHubPullRequestContext = {
    readonly owner: string;
    readonly repo: string;
    readonly prNumber: number;
    readonly baseSha?: string;
    readonly headSha?: string;
    readonly title?: string;
};
export type GitHubActionEvent = {
    readonly number?: number;
    readonly repository?: {
        readonly name?: string;
        readonly owner?: {
            readonly login?: string;
        };
    };
    readonly pull_request?: {
        readonly title?: string;
        readonly base?: {
            readonly sha?: string;
        };
        readonly head?: {
            readonly sha?: string;
        };
    };
};
export type GitHubExitDecision = {
    readonly shouldFail: boolean;
    readonly matchedConditions: readonly GitHubFailCondition[];
    readonly reason: string;
};
export type GitHubRenderedComment = {
    readonly marker: string;
    readonly markdown: string;
};
export type GitHubRenderedSummary = {
    readonly markdown: string;
};
export type GitHubCommentOperationResult = {
    readonly status: "skipped";
    readonly reason: string;
} | {
    readonly status: "created";
    readonly commentId: number;
} | {
    readonly status: "updated";
    readonly commentId: number;
} | {
    readonly status: "failed";
    readonly reason: string;
};
export type GitHubArtifactCollectionResult = {
    readonly outputDir: string;
    readonly copiedPublicArtifacts: readonly string[];
    readonly copiedDebugArtifacts: readonly string[];
};
export type GitHubActionRunResult = {
    readonly config: GitHubActionConfig;
    readonly prContext: GitHubPullRequestContext | null;
    readonly check: PantheonCheckPublic;
    readonly exitDecision: GitHubExitDecision;
    readonly artifactOutputDir: string;
    readonly summaryPath: string | null;
    readonly commentPath: string;
    readonly commentResult: GitHubCommentOperationResult;
};
export type GitHubBlockingFinding = PantheonFinding & {
    readonly category: "forbidden" | "outside_scope";
};
