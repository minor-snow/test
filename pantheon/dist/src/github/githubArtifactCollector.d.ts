import type { GitHubArtifactCollectionResult, GitHubArtifactMode } from "./githubActionTypes.js";
export declare function collectGitHubActionArtifacts(input: {
    repoRoot: string;
    outputDir: string;
    artifactMode: GitHubArtifactMode;
}): GitHubArtifactCollectionResult;
