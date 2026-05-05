import type { RepairAuditGate } from "../../repair/types.js";
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
