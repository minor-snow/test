import type { BugFinding, RepairContract, RepairSourceReport } from "./types.js";
export declare function renderRepairTaskMarkdown(input: {
    report: RepairSourceReport;
    finding: BugFinding;
    contract: RepairContract;
}): string;
export declare function renderRepairScopeMarkdown(contract: RepairContract): string;
export declare function renderConsistencyChecklistMarkdown(contract: RepairContract): string;
