/**
 * Handoff Test Evaluator — Checks model output against handoff package constraints
 *
 * ref: P11.2-004
 *
 * Input: handoff_package.json + model output text
 * Output: structured violation report
 */
import type { ImplementationHandoffPackage } from "./types.js";
export type HandoffViolation = {
    type: string;
    message: string;
    evidence: string;
};
export type HandoffTestResult = {
    model_name: string;
    status: "pass" | "pass_with_warnings" | "fail";
    critical_violations: HandoffViolation[];
    warnings: HandoffViolation[];
    metrics: {
        invented_fields: number;
        invented_states: number;
        clinical_lww_violations: number;
        missing_required_fields: number;
        missing_conflict_tests: number;
        forbidden_assumption_violations: number;
        vector_clock_omissions: number;
        audit_required_omissions: number;
    };
    evaluated_at: string;
};
export declare function evaluateHandoffTestOutput(modelName: string, output: string, pkg: ImplementationHandoffPackage): HandoffTestResult;
