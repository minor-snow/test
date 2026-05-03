import type { GitHubArtifactCollectionResult, GitHubArtifactMode } from "./githubActionTypes.js";
export declare function collectGitHubChangeArtifacts(input: {
    repoRoot: string;
    outputDir: string;
    artifactMode: GitHubArtifactMode;
    changeId: string;
}): GitHubArtifactCollectionResult & {
    sanitizerViolations: string[];
};
