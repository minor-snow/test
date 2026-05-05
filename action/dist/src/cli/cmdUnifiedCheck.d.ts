export type UnifiedCheckMode = "auto" | "boundary" | "change" | "repair" | "architecture";
export declare function cmdUnifiedCheck(input: {
    repoRoot: string;
    baseRef?: string;
    headRef?: string;
    mode?: UnifiedCheckMode;
    changeId?: string;
    repairId?: string;
    json?: boolean;
    redact?: boolean;
}): void;
