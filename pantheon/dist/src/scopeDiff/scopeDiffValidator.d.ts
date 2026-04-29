/**
 * P18: Scope Diff Validator
 *
 * Core orchestrator: classifies files, validates tests, validates human review,
 * detects reverse issue triggers, and produces a ScopeDiffReport.
 *
 * ref: P18
 */
import type { ScopedImplementationBoundaryPackage, RequiredTestsFile } from "../scopedHandoff/types.js";
import type { ScopeDiffRequest, ScopeDiffReport } from "./types.js";
export declare function validateScopeDiff(input: {
    scope: ScopedImplementationBoundaryPackage;
    requiredTestsFile: RequiredTestsFile;
    request: ScopeDiffRequest;
    scopeHash: string;
    requiredTestsHash: string;
}): ScopeDiffReport;
