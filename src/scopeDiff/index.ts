/**
 * P18: Scope Diff Validator — Public API
 *
 * Barrel export for the scopeDiff subsystem.
 * Consumers should import from this index rather than individual files.
 *
 * ref: P18
 */

// Core validator
export { validateScopeDiff } from "./scopeDiffValidator.js";

// Sub-validators (for unit testing / advanced use)
export { classifyChangedFile, classifyChangedFiles, normalizePath } from "./fileClassifier.js";
export { extractChangedFilesFromDiff } from "./diffParser.js";
export { validateRequiredTests } from "./testResultValidator.js";
export { validateHumanReview } from "./humanReviewValidator.js";
export { detectReverseIssueTriggers } from "./reverseIssueDetector.js";

// Report renderer
export { renderScopeDiffReportMarkdown } from "./scopeDiffReportRenderer.js";

// Types
export type {
  ScopeDiffRequest,
  ScopeDiffReport,
  ScopeDiffViolation,
  ScopeDiffWarning,
  ScopeDiffStatus,
  ScopeDiffViolationType,
  ScopeDiffWarningType,
  ScopeDiffOptions,
  ClassifiedChangedFile,
  TestResult,
  TestResultStatus,
  HumanReviewInput,
} from "./types.js";
