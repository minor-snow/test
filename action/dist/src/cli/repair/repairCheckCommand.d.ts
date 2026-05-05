export declare function cmdRepairCheck(input: {
    repoRoot: string;
    repairId: string;
    baseRef?: string;
    headRef?: string;
    diffJsonPath?: string;
    changedFilesOverride?: string[];
    sourceOverride?: "local_cli" | "github_action";
    prNumber?: number;
    prBaseSha?: string;
    prHeadSha?: string;
    artifactDir?: string;
    sanitizerViolations?: number;
    json?: boolean;
    redact?: boolean;
    exitOnResult?: boolean;
}): void;
