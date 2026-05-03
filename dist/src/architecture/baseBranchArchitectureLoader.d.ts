/**
 * P30-13: Base Branch Architecture Loader
 *
 * Reads the ArchitectureContract from a specific git SHA (base branch),
 * ensuring PR-modified architecture constraints do not self-authorize.
 */
import type { ArchitectureContract } from "./types.js";
export type BaseBranchArchitectureResult = {
    readonly status: "loaded" | "missing" | "parse_error";
    readonly contract: ArchitectureContract | null;
    readonly base_sha: string;
};
export declare function loadBaseArchitectureContract(repoRoot: string, baseSha: string): BaseBranchArchitectureResult;
