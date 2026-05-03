import type { GitHubArtifactCollectionResult, GitHubArtifactMode } from "./githubActionTypes.js";
/**
 * Unified artifact collector for all Pantheon GitHub Action modes.
 */
export declare function collectGitHubActionArtifacts(input: {
    repoRoot: string;
    outputDirRelative: string;
    artifactMode: GitHubArtifactMode;
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
