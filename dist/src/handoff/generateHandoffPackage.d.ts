/**
 * Handoff Package Generator — Orchestrates all projectors
 *
 * ref: P11a-009
 *
 * Reads P10 canonical artifacts and assembles the handoff package.
 * Also generates HANDOFF.md (human-readable rendering).
 */
import type { Artifact } from "../types.js";
import type { ImplementationHandoffPackage } from "./types.js";
import type { StructuralTermClosureReport } from "./structuralTermResolver.js";
import { type ContractProjectionResult } from "./contractProjector.js";
import { type ConflictProjectionResult } from "./conflictProjector.js";
import { type DataModelProjectionResult } from "./dataModelProjector.js";
import { type StateMachineProjectionResult } from "./stateMachineProjector.js";
export type RiskRegisterEntry = {
    risk_id: string;
    severity: string;
    why_accepted: string;
    mitigation?: string;
    block_id: string;
};
export type GenerationResult = {
    pkg: ImplementationHandoffPackage;
    contracts: ContractProjectionResult;
    conflicts: ConflictProjectionResult;
    dataModels: DataModelProjectionResult;
    stateMachines: StateMachineProjectionResult;
    /** Call with optional closure to get markdown string */
    renderMarkdown: (closure?: StructuralTermClosureReport) => string;
};
export declare function generateHandoffPackage(architecture: Artifact, interfaceSpec: Artifact, moduleSpec: Artifact, risks: RiskRegisterEntry[]): GenerationResult;
