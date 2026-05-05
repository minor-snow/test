export declare function cmdRepairList(input: {
    repoRoot: string;
}): void;
export declare function cmdRepairStatus(input: {
    repoRoot: string;
}): void;
export declare function cmdRepairShow(input: {
    repoRoot: string;
    repairId: string;
}): void;
export declare function cmdRepairClose(input: {
    repoRoot: string;
    repairId: string;
    reason: string;
}): void;
export declare function cmdRepairAbandon(input: {
    repoRoot: string;
    repairId: string;
    reason: string;
}): void;
