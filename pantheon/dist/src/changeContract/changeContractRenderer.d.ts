/**
 * P19.1: Change Contract Markdown Renderer
 *
 * Renders a ChangeContract into human-readable Markdown.
 *
 * Design invariants:
 *   - Input: ChangeContract object ONLY (never Markdown, never raw reports)
 *   - Output: Read-only Markdown projection (JSON is authoritative)
 *   - Structure: Decision Summary first, Projection Notice last
 *   - Technical IDs preserved for traceability
 *
 * ref: P19.1
 */
import type { ChangeContract } from "./types.js";
/**
 * Render a ChangeContract into Markdown.
 *
 * Consumes ChangeContract object only.
 * Does NOT consume Markdown, raw P15/P17/P18 reports, or disk files.
 */
export declare function renderChangeContractMarkdown(contract: ChangeContract): string;
