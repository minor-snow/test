import type { GitHubRepairArtifactCollectionResult } from "./githubRepairTypes.js";
export declare function collectGitHubRepairArtifacts(input: {
    repoRoot: string;
    repairId: string;
    artifactMode: "public" | "debug";
}): GitHubRepairArtifactCollectionResult;
export declare function writeGitHubRepairSupportArtifacts(input: {
    outputDir: string;
    summaryMarkdown: string;
    artifactCollection: GitHubRepairArtifactCollectionResult;
    repairId: string;
    verdict: string;
    commentStatus?: string;
    commentReason?: string;
}): void;
