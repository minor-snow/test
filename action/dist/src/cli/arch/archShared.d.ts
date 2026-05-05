export declare function resolveArchId(repoRoot: string, args: readonly string[]): string;
export declare function applyOverride(repoRoot: string, archId: string, input: {
    operation: string;
    subject: string;
    object?: string;
    pathPatterns?: string[];
    reason: string;
}): void;
export declare function loadJsonArtifact<T>(path: string, label: string): T;
