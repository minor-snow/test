/**
 * State Machine Projector — Deterministic state/transition definitions
 *
 * ref: P11a-005
 *
 * 3 state machines: PendingReportState, SyncOperationState, ConflictResolutionState
 * All states, transitions, and forbidden transitions are deterministic.
 */
import type { Artifact } from "../types.js";
import type { StateMachineSpec } from "./types.js";
export type StateMachineProjectionResult = {
    machines: StateMachineSpec[];
    total_states: number;
    total_transitions: number;
    total_forbidden: number;
    orphan_states: string[];
};
export declare function projectStateMachines(architecture: Artifact, interfaceSpec: Artifact, moduleSpec: Artifact): StateMachineProjectionResult;
