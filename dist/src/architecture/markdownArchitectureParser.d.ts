/**
 * P30: Markdown Architecture Parser
 *
 * Pure deterministic markdown structure extraction.
 * Extracts headings, bullets, tables, code blocks, inline path patterns,
 * and structured hint blocks from architecture documentation.
 *
 * Structured hint blocks (`<!-- pantheon-arch ... -->`) provide
 * deterministic, high-confidence extraction without phrase rules.
 *
 * No LLM. No content interpretation. Only structural decomposition.
 *
 * ref: P30
 */
import type { ArchitectureStructuredHint } from "./architectureGlossary.js";
export type MarkdownSection = {
    readonly heading: string;
    readonly level: number;
    readonly lineStart: number;
    readonly lineEnd: number;
    readonly content: string;
    readonly bullets: readonly MarkdownBullet[];
    readonly codeBlocks: readonly MarkdownCodeBlock[];
    readonly tables: readonly MarkdownTable[];
    readonly inlinePaths: readonly string[];
    readonly structuredHints: readonly ArchitectureStructuredHint[];
};
export type { ArchitectureStructuredHint };
export type MarkdownBullet = {
    readonly text: string;
    readonly lineNumber: number;
    readonly indent: number;
};
export type MarkdownCodeBlock = {
    readonly language: string;
    readonly content: string;
    readonly lineStart: number;
    readonly lineEnd: number;
};
export type MarkdownTable = {
    readonly headers: readonly string[];
    readonly rows: readonly (readonly string[])[];
    readonly lineStart: number;
    readonly lineEnd: number;
};
/**
 * Parse a markdown document into structured sections.
 * Each section corresponds to a heading and its content until the next heading of equal or higher level.
 */
export declare function parseMarkdownArchitecture(content: string): MarkdownSection[];
