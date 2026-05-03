import { type RepairAuditGate } from "../repair/types.js";
import type { RepoStateSnapshot, RepairSession } from "../repair/session/repairSessionTypes.js";
export declare function cmdRepair(args: string[]): void;
export declare function cmdRepairIntake(input: {
    repoRoot: string;
    fromPath?: string;
    intent?: string;
    suspectPaths?: string[];
    failingTests?: string[];
    mustPreserve?: string[];
    agentId?: string;
    operatorId?: string;
}): RepairSession;
export declare function cmdRepairPlan(input: {
    repoRoot: string;
    repairId: string;
    configPath?: string;
    overrideBaseSha?: string;
    overrideHeadSha?: string;
    overrideCheckoutSha?: string;
    overrideSource?: RepoStateSnapshot["source"];
    sourceOverride?: "local_cli" | "github_action";
}): void;
export declare function cmdRepairAudit(input: {
    repoRoot: string;
    repairId: string;
    targetRevision: number;
    gate: RepairAuditGate;
    decision: string;
    reason: string;
    operatorId: string;
    addReview?: string[];
    addForbid?: string[];
    addMustPreserve?: string[];
}): void;
export declare function cmdRepairCheck(input: {
    repoRoot: string;
    repairId: string;
    baseRef?: string;
    diffJsonPath?: string;
    changedFilesOverride?: string[];
    sourceOverride?: "local_cli" | "github_action";
    prNumber?: number;
    prBaseSha?: string;
    prHeadSha?: string;
    artifactDir?: string;
    sanitizerViolations?: number;
}): void;
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
