/**
 * Contract Definition Projector — Deterministic extraction from P10 artifacts
 *
 * ref: P11a-002
 *
 * Rules:
 *   - Mandatory term list is deterministic
 *   - kind / fields / enum_values are deterministic from block text
 *   - source_*_blocks are deterministic via keyword match
 *   - LLM may ONLY supplement definition text (not structure)
 *   - Unknown structural terms are emitted as gaps
 */
import type { Artifact } from "../types.js";
import type { ContractDefinition } from "./types.js";
export type ContractProjectionResult = {
    definitions: ContractDefinition[];
    unknown_structural_terms: string[];
    mandatory_coverage: {
        total: number;
        covered: number;
        missing: string[];
    };
};
export declare function projectContractDefinitions(architecture: Artifact, interfaceSpec: Artifact, moduleSpec: Artifact): ContractProjectionResult;
