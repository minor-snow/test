/**
 * P30: Architecture Contract Renderer
 *
 * Renders `architecture_contract.md` — the human-readable summary
 * of the active architecture contract.
 *
 * ref: P30
 */
import type { ArchitectureContract } from "./types.js";
/**
 * Render an architecture contract as human-readable markdown.
 */
export declare function renderArchitectureContract(contract: ArchitectureContract): string;
