import type { HumanAuditDecision, RepairAuditDecisionType, RepairAuditGate } from "./types.js";
export declare function buildHumanAuditDecision(input: {
    repairId: string;
    targetRevision: number;
    gate: RepairAuditGate;
    decision: RepairAuditDecisionType;
    operatorId: string;
    reason: string;
    addReview?: readonly string[];
    addForbid?: readonly string[];
    addMustPreserve?: readonly string[];
}): HumanAuditDecision;
export declare function writeHumanAuditDecision(repoRoot: string, decision: HumanAuditDecision): string;
