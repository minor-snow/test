import type { BugFinding, RepairSourceReport, UserBugReport } from "./types.js";
import type { ValidatedSourceBugReport } from "./agentBugReportValidator.js";
export declare function buildBugFinding(input: ValidatedSourceBugReport): BugFinding;
export declare function buildUserBugReport(input: {
    intent: string;
    suspectPaths: readonly string[];
    failingTests: readonly string[];
    mustPreserve: readonly string[];
    operatorId?: string;
}): UserBugReport;
export declare function getReportKind(report: RepairSourceReport): "agent_bug_report" | "user_bug_report";
