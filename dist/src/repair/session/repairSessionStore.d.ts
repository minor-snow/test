import type { RepairSession, RepairSessionIndex, RepairSessionScopeSummary, RepairSessionStatus } from "./repairSessionTypes.js";
export declare function createRepairSession(input: {
    repoRoot: string;
    agentId?: string;
    source: RepairSession["source"];
    status: RepairSessionStatus;
}): RepairSession;
export declare function loadRepairSession(repoRoot: string, repairId: string): RepairSession;
export declare function saveRepairSession(repoRoot: string, session: RepairSession): void;
export declare function updateRepairSession(repoRoot: string, repairId: string, updater: (session: RepairSession) => RepairSession): RepairSession;
export declare function closeRepairSession(input: {
    repoRoot: string;
    repairId: string;
    status: "closed" | "abandoned";
    reason: string;
}): RepairSession;
export declare function loadRepairSessionIndex(repoRoot: string): RepairSessionIndex;
export declare function listRepairSessions(repoRoot: string): RepairSessionIndex;
export declare function loadLatestRepairId(repoRoot: string): string | null;
export declare function withRepairIndexLock<T>(repoRoot: string, operation: string, fn: () => T): T;
export declare function withRepairSessionLock<T>(repoRoot: string, repairId: string, operation: string, fn: () => T): T;
export declare function emptyScopeSummary(): RepairSessionScopeSummary;
export declare function updateSessionFromContract(input: {
    repoRoot: string;
    repairId: string;
    revision: number;
    status: RepairSessionStatus;
    scopeSummary: RepairSessionScopeSummary;
    riskLevel: RepairSession["risk_level"];
    baseSha: string | null | undefined;
}): RepairSession;
