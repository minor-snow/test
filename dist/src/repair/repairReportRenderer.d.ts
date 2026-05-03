import type { RepairCheck, RepairContract, RepairSourceReport } from "./types.js";
export declare function renderRepairReportMarkdown(input: {
    report: RepairSourceReport;
    contract: RepairContract;
    check: RepairCheck;
}): string;
