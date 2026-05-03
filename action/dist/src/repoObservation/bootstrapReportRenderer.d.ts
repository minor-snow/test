/**
 * P20a: Bootstrap Report Renderer
 *
 * Generates a human-readable Markdown report from observations + Lite contract.
 */
import type { RepoObservations } from "./types.js";
import type { ChangeContractLite } from "../changeContract/lite/types.js";
export declare function renderBootstrapReport(input: {
    observations: RepoObservations;
    contract: ChangeContractLite;
}): string;
