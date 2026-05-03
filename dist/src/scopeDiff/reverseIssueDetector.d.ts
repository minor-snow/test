/**
 * P18: Reverse Issue Detector
 *
 * Detects whether any violations warrant a Pantheon Reverse Issue.
 * Aggregates into a single reverse_issue_required violation.
 *
 * ref: P18
 */
import type { ClassifiedChangedFile, ScopeDiffViolation } from "./types.js";
import type { ScopedImplementationBoundaryPackage } from "../scopedHandoff/types.js";
export declare function detectReverseIssueTriggers(input: {
    fileClassifications: ClassifiedChangedFile[];
    fileViolations: ScopeDiffViolation[];
    testViolations: ScopeDiffViolation[];
    humanReviewViolations: ScopeDiffViolation[];
    scope: ScopedImplementationBoundaryPackage;
}): ScopeDiffViolation[];
