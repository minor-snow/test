import type { GitHubArtifactCollectionResult, GitHubArtifactLevel, GitHubArtifactMode, GitHubSanitizerViolation } from "./githubActionTypes.js";
/**
 * Unified artifact collector for all Pantheon GitHub Action modes.
 */
export declare function collectGitHubActionArtifacts(input: {
    repoRoot: string;
    outputDirRelative: string;
    artifactMode: GitHubArtifactMode;
    artifactLevel?: GitHubArtifactLevel;
    changeId?: string;
    repairId?: string;
    includeArchitecture?: boolean;
}): GitHubArtifactCollectionResult;
/**
 * Generates a standard manifest for the collected artifacts.
 */
export declare function writeGitHubArtifactManifest(input: {
    outputDir: string;
    collection: GitHubArtifactCollectionResult;
    metadata?: Record<string, any>;
}): void;
export declare function writeGitHubVerdictArtifact(input: {
    outputDir: string;
    mode: "boundary" | "change" | "repair" | "contract_gate";
    verdict: string;
    targetId?: string;
    extra?: Record<string, unknown>;
}): void;
export declare function sanitizeGeneratedGitHubArtifact(input: {
    target: string;
    content: string;
    artifactMode: GitHubArtifactMode;
}): {
    content: string;
    violation: GitHubSanitizerViolation | null;
    withheld: boolean;
};
/** @deprecated use writeGitHubArtifactManifest */
export declare function writeGitHubRepairSupportArtifacts(input: {
    outputDir: string;
    summaryMarkdown: string;
    artifactCollection: GitHubArtifactCollectionResult;
    repairId: string;
    verdict: string;
    commentStatus: string;
}): void;
/** @deprecated use collectGitHubActionArtifacts */
export declare function collectGitHubRepairArtifacts(input: {
    repoRoot: string;
    repairId: string;
    outputDirRelative?: string;
    artifactMode: GitHubArtifactMode;
}): GitHubArtifactCollectionResult;
