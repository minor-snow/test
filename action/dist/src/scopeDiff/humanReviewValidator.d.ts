/**
 * P18: Human Review Validator
 *
 * Validates human review requirements for high-risk scopes.
 *
 * ref: P18
 */
import type { ScopedImplementationBoundaryPackage } from "../scopedHandoff/types.js";
import type { HumanReviewInput, ScopeDiffViolation, ScopeDiffWarning } from "./types.js";
export declare function validateHumanReview(scope: ScopedImplementationBoundaryPackage, review?: HumanReviewInput): {
    violations: ScopeDiffViolation[];
    warnings: ScopeDiffWarning[];
};
