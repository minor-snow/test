/**
 * P17c: Reverse Issue Instructions Renderer
 *
 * Renders .pantheon/reverse-issue.md with structured instructions
 * for downstream agents to escalate boundary gaps.
 *
 * ref: P17
 */
import type { ScopedImplementationBoundaryPackage } from "./types.js";
/**
 * Render the reverse issue instruction document.
 */
export declare function renderReverseIssueInstructions(pkg: ScopedImplementationBoundaryPackage): string;
/**
 * Render the .pantheon/README.md
 */
export declare function renderPantheonReadme(): string;
/**
 * Render .pantheon/forbidden-assumptions.md
 */
export declare function renderForbiddenAssumptions(pkg: ScopedImplementationBoundaryPackage): string;
