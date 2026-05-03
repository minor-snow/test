/**
 * P17b: Cursor Rules Renderer
 *
 * Renders .cursor/rules/pantheon-boundaries.md from a ScopedImplementationBoundaryPackage.
 * Every rule references concrete files, tests, constraints, or triggers.
 * Generic advice phrases are forbidden.
 *
 * ref: P17
 */
import type { ScopedImplementationBoundaryPackage } from "./types.js";
/**
 * Render Cursor adapter rules markdown from a scoped package.
 * The output is consumed by .cursor/rules/ directory.
 */
export declare function renderCursorRules(pkg: ScopedImplementationBoundaryPackage): string;
