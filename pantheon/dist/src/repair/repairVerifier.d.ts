import type { GitDiffSummary } from "../diffWorkflow/types.js";
import type { RepairCheck, RepairCheckFinding, RepairContract, RepairFeedback } from "./types.js";
export declare function verifyRepairDiff(input: {
    contract: RepairContract;
    diff: GitDiffSummary;
}): {
    check: RepairCheck;
    feedback: RepairFeedback;
};
export declare function deriveRepairVerdictFromFindings(findings: readonly RepairCheckFinding[]): RepairCheck["verdict"];
export declare function buildRepairFeedbackFromCheck(check: RepairCheck): RepairFeedback;
