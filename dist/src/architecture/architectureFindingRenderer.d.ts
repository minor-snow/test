/**
 * P30-11B: Architecture Finding Renderer
 *
 * Pure, platform-neutral renderer for formatting ArchitectureFinding objects
 * into human-readable text (Markdown or Plain Text).
 *
 * This serves as the single source of truth for architecture wording, ensuring
 * that CLI, Review Queues, and GitHub PR comments remain consistent.
 *
 * ref: P30
 */
import type { ArchitectureFinding } from "./types.js";
export type RenderArchitectureFindingsInput = {
    readonly findings: readonly ArchitectureFinding[];
    readonly contract_summary?: {
        readonly architecture_contract_id: string;
        readonly revision: number;
    };
    readonly format?: "markdown" | "plain";
    readonly audience?: "cli" | "github" | "review_request";
};
export type RenderedArchitectureFindings = {
    readonly markdown: string;
    readonly plain: string;
    readonly blocking_count: number;
    readonly review_count: number;
    readonly info_count: number;
};
/**
 * Render a list of architecture findings into formatted text.
 * Strictly groups by severity and enforces wording safeguards.
 */
export declare function renderArchitectureFindings(input: RenderArchitectureFindingsInput): RenderedArchitectureFindings;
