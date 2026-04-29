/**
 * P24: User-facing Markdown Renderers
 *
 * Product-quality markdown projections for external users.
 * NO internal terminology: no ChangeContract, no violation_hints,
 * no scope_id, no observation_hash.
 *
 * Four renderers: task, scope, report, feedback.
 */
import type { PantheonCheckPublic } from "./types.js";
export declare function renderPublicTaskMarkdown(input: {
    intent: string;
    allowedFiles: readonly string[];
    requiredTests: readonly string[];
    forbiddenPatterns: readonly {
        pattern: string;
        reason: string;
    }[];
    reviewRequiredFiles: readonly string[];
    sensitiveWarnings?: string;
    suggestedTests?: string;
}): string;
export declare function renderPublicScopeMarkdown(input: {
    intent: string;
    allowedFiles: readonly string[];
    requiredTests: readonly string[];
    forbiddenPatterns: readonly {
        pattern: string;
        reason: string;
    }[];
    reviewRequiredFiles: readonly string[];
    repoLabel: string;
    headCommit: string | null;
}): string;
export declare function renderPublicReportMarkdown(check: PantheonCheckPublic & {
    attempt?: number;
}): string;
export declare function renderPublicFeedbackMarkdown(check: PantheonCheckPublic & {
    attempt?: number;
}): string;
/**
 * Group file paths by their top-level directory for readable summaries.
 * Collapses paths sharing a common prefix into directory groups.
 */
export declare function groupByDirectory(files: readonly string[]): Array<{
    dir: string;
    count: number;
}>;
