import { type BugFinding, type RepairSourceReport } from "./types.js";
export type ValidatedSourceBugReport = {
    readonly report: RepairSourceReport;
    readonly status: BugFinding["status"];
    readonly confirmedFacts: readonly string[];
    readonly unverifiedClaims: readonly string[];
    readonly invalidReferences: readonly string[];
    readonly evidenceQuality: BugFinding["evidence_quality"];
};
export declare function loadRepairSourceReport(path: string): RepairSourceReport;
export declare function parseRepairSourceReport(value: unknown): RepairSourceReport;
export declare function validateRepairSourceReport(report: RepairSourceReport, repoRoot: string): ValidatedSourceBugReport;
