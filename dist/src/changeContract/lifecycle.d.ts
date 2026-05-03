/**
 * P19a: Change Contract Lifecycle
 *
 * State machine and transition logic for ChangeContract.
 *
 * Design invariants:
 *   - Allowed transitions are explicit; all others throw.
 *   - escalated → verified requires scope_diff_verified event.
 *   - closed requires contract_closed event.
 *   - invalid requires contract_invalidated event.
 *   - Events are append-only: prior events are never mutated.
 *   - contract_id is deterministic from intent + canonical refs.
 *   - Some events are "annotations" (e.g. human_review_recorded) that
 *     append to the ledger without changing lifecycle status.
 *
 * ref: P19a
 */
import type { ChangeContract, ChangeContractLifecycleStatus, ChangeContractRefs, ChangeIntent, ChangeResultEvent } from "./types.js";
/**
 * Generates a deterministic contract_id from intent + canonical refs.
 * Same inputs always produce the same ID.
 */
export declare function generateContractId(intent: ChangeIntent, canonicalRefs: ChangeContractRefs["canonical_revisions"]): string;
/**
 * Transitions a ChangeContract to a new lifecycle status.
 *
 * Returns a new contract with updated status, appended event, and
 * refreshed updated_at. The original contract is not mutated.
 *
 * @throws if the transition is not allowed or required event guards fail.
 */
export declare function transitionChangeContract(contract: ChangeContract, nextStatus: ChangeContractLifecycleStatus, event: ChangeResultEvent): ChangeContract;
/**
 * Records an in-state annotation event on a ChangeContract.
 *
 * Unlike `transitionChangeContract`, this does NOT change lifecycle status.
 * It appends the event to the ledger and may update the decision.
 *
 * Use this for events like `human_review_recorded` that represent
 * completed actions, not state transitions.
 *
 * @throws if the contract is in a terminal state or the event type
 *         is not a valid annotation event.
 */
export declare function recordContractEvent(contract: ChangeContract, event: ChangeResultEvent): ChangeContract;
/**
 * Creates a ChangeResultEvent with a deterministic event_id.
 */
export declare function createResultEvent(eventType: ChangeResultEvent["event_type"], status: string, summary: string, refs?: Record<string, string>, timestamp?: string): ChangeResultEvent;
/** Check if the contract is in a terminal state. */
export declare function isTerminal(contract: ChangeContract): boolean;
/** Get allowed next statuses for the current lifecycle status. */
export declare function getAllowedTransitions(status: ChangeContractLifecycleStatus): ChangeContractLifecycleStatus[];
