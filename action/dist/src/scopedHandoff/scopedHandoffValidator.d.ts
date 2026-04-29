/**
 * P17e: Scoped Handoff Validator
 *
 * 15-point validation for ScopedImplementationBoundaryPackage.
 * Ensures protocol integrity, coverage, and quality of exported rules.
 *
 * ref: P17
 */
import type { ScopedImplementationBoundaryPackage, ValidationResult, ScopedHandoffReport } from "./types.js";
export declare function validateScopedImplementationBoundaryPackage(pkg: ScopedImplementationBoundaryPackage, cursorRules?: string): ValidationResult;
export declare function buildScopedHandoffReport(pkg: ScopedImplementationBoundaryPackage, validation: ValidationResult, outputs: string[]): ScopedHandoffReport;
export declare function renderScopedHandoffReportMarkdown(report: ScopedHandoffReport): string;
