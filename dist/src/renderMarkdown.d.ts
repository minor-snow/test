/**
 * Markdown Renderer
 *
 * ref: C-01 — Markdown is a read-only projection of JSON Artifact.
 *
 * This module converts a structured Artifact into human-readable Markdown.
 * It is a one-way projection: Markdown → JSON parsing is explicitly
 * forbidden by the constitution.
 *
 * The output is intended for:
 *   - Human review in the Override Cockpit
 *   - Documentation export
 *   - Diff view rendering
 */
import type { Artifact } from "./types.js";
/**
 * Render an Artifact as Markdown.
 *
 * ref: C-01 — This is a read-only projection. The source of truth
 * is the JSON Artifact, not this Markdown output.
 */
export declare function renderMarkdown(artifact: Artifact): string;
