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

import { shortStableId } from "../deterministic.js";
import { stableSerialize } from "../stableSerialize.js";
import type {
  ChangeContract,
  ChangeContractLifecycleStatus,
  ChangeContractRefs,
  ChangeDecision,
  ChangeDecisionVerdict,
  ChangeIntent,
  ChangeResultEvent,
} from "./types.js";

// ---------------------------------------------------------------------------
// Transition Matrix
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<
  ChangeContractLifecycleStatus,
  ChangeContractLifecycleStatus[]
> = {
  draft:     ["scoped", "invalid"],
  scoped:    ["exported", "invalid"],
  exported:  ["verified", "escalated", "invalid"],
  verified:  ["closed", "escalated", "invalid"],
  escalated: ["verified", "closed", "invalid"],
  closed:    [],
  invalid:   [],
};

// ---------------------------------------------------------------------------
// Deterministic Contract ID
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic contract_id from intent + canonical refs.
 * Same inputs always produce the same ID.
 */
export function generateContractId(
  intent: ChangeIntent,
  canonicalRefs: ChangeContractRefs["canonical_revisions"],
): string {
  return shortStableId("cc", {
    intent: normalize(intent.intent),
    source_request: normalize(intent.source_request),
    canonical_refs: [...canonicalRefs].sort((a, b) => a.artifact_id.localeCompare(b.artifact_id)),
  }, 16);
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function stableJsonRefs(
  refs: ChangeContractRefs["canonical_revisions"],
): string {
  const sorted = [...refs].sort((a, b) =>
    a.artifact_id.localeCompare(b.artifact_id),
  );
  return stableSerialize(sorted);
}

// ---------------------------------------------------------------------------
// Transition Function
// ---------------------------------------------------------------------------

/**
 * Transitions a ChangeContract to a new lifecycle status.
 *
 * Returns a new contract with updated status, appended event, and
 * refreshed updated_at. The original contract is not mutated.
 *
 * @throws if the transition is not allowed or required event guards fail.
 */
export function transitionChangeContract(
  contract: ChangeContract,
  nextStatus: ChangeContractLifecycleStatus,
  event: ChangeResultEvent,
): ChangeContract {
  const from = contract.lifecycle_status;
  const allowed = ALLOWED_TRANSITIONS[from];

  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Invalid ChangeContract transition: ${from} → ${nextStatus}. ` +
      `Allowed from '${from}': [${allowed.join(", ")}]`,
    );
  }

  // --- Guarded transitions ---

  // Annotation events must not drive lifecycle transitions.
  if (ANNOTATION_EVENTS.has(event.event_type)) {
    throw new Error(
      `Event type '${event.event_type}' is an annotation event and cannot drive ` +
      `lifecycle transitions. Use recordContractEvent() instead.`,
    );
  }

  // ALL paths into 'verified' require scope_diff_verified evidence.
  // This is the core verification gate — no event type can substitute for it.
  if (nextStatus === "verified") {
    if (event.event_type !== "scope_diff_verified") {
      throw new Error(
        `Transition to 'verified' requires a scope_diff_verified event, ` +
        `got '${event.event_type}'. (from: '${from}')`,
      );
    }
  }

  if (nextStatus === "closed") {
    if (event.event_type !== "contract_closed") {
      throw new Error(
        "Transition to 'closed' requires a contract_closed event, " +
        `got '${event.event_type}'.`,
      );
    }
  }

  if (nextStatus === "invalid") {
    if (event.event_type !== "contract_invalidated") {
      throw new Error(
        "Transition to 'invalid' requires a contract_invalidated event, " +
        `got '${event.event_type}'.`,
      );
    }
  }

  // --- Build updated decision ---

  const updatedDecision = deriveDecision(contract.current_decision, nextStatus, event);

  return {
    ...contract,
    lifecycle_status: nextStatus,
    updated_at: event.created_at,
    result_events: [...contract.result_events, event],
    current_decision: updatedDecision,
  };
}

// ---------------------------------------------------------------------------
// In-State Annotations (no lifecycle transition)
// ---------------------------------------------------------------------------

/**
 * Event types that are ledger annotations — they record facts
 * without changing lifecycle status.
 */
const ANNOTATION_EVENTS: Set<ChangeResultEvent["event_type"]> = new Set([
  "human_review_recorded",
]);

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
export function recordContractEvent(
  contract: ChangeContract,
  event: ChangeResultEvent,
): ChangeContract {
  if (isTerminal(contract)) {
    throw new Error(
      `Cannot record event on terminal contract (status: '${contract.lifecycle_status}').`,
    );
  }

  if (!ANNOTATION_EVENTS.has(event.event_type)) {
    throw new Error(
      `Event type '${event.event_type}' is not an annotation event. ` +
      `Use transitionChangeContract() for lifecycle transitions. ` +
      `Valid annotation events: [${[...ANNOTATION_EVENTS].join(", ")}]`,
    );
  }

  // Per-event state restrictions.
  // human_review_recorded: only valid after scope-diff has been evaluated
  // (i.e. in verified or escalated states).
  if (event.event_type === "human_review_recorded") {
    const REVIEW_ALLOWED_STATES: Set<ChangeContractLifecycleStatus> = new Set([
      "verified",
      "escalated",
    ]);
    if (!REVIEW_ALLOWED_STATES.has(contract.lifecycle_status)) {
      throw new Error(
        `human_review_recorded can only be recorded in [verified, escalated] states, ` +
        `but contract is in '${contract.lifecycle_status}'. ` +
        `Scope-diff verification must complete before recording human review.`,
      );
    }
  }

  const updatedDecision = deriveAnnotationDecision(contract.current_decision, event);

  return {
    ...contract,
    updated_at: event.created_at,
    result_events: [...contract.result_events, event],
    current_decision: updatedDecision,
  };
}

// ---------------------------------------------------------------------------
// Decision Derivation
// ---------------------------------------------------------------------------

function mapScopeDiffVerdict(eventStatus: string): ChangeDecisionVerdict {
  if (eventStatus === "pass") return "pass";
  if (eventStatus === "requires_human_review") return "requires_human_review";
  return "fail";
}

function deriveDecision(
  current: ChangeDecision,
  nextStatus: ChangeContractLifecycleStatus,
  event: ChangeResultEvent,
): ChangeDecision {
  const statusToDecision: Partial<Record<ChangeContractLifecycleStatus, ChangeDecisionVerdict>> = {
    closed: "closed",
    invalid: "invalid",
  };

  // Terminal statuses have fixed decisions.
  if (statusToDecision[nextStatus]) {
    return {
      decision: statusToDecision[nextStatus]!,
      required_actions: [],
      latest_report_hash: current.latest_report_hash,
    };
  }

  // Event-driven decision updates (transition events only).
  const eventToDecision: Partial<Record<string, ChangeDecisionVerdict>> = {
    scope_diff_verified: mapScopeDiffVerdict(event.status),
    reverse_issue_required: "requires_reverse_issue",
  };

  const verdict = eventToDecision[event.event_type];
  if (verdict) {
    return {
      decision: verdict,
      required_actions: current.required_actions,
      latest_report_hash: event.refs?.report_hash ?? current.latest_report_hash,
    };
  }

  // No decision change for other events.
  return { ...current };
}

/**
 * Decision derivation for annotation events (no lifecycle change).
 *
 * human_review_recorded = "review completed" → clears any pending review
 * requirement. The *request* for review is driven by
 * scope.must_require_human_review, not by a ledger event.
 */
function deriveAnnotationDecision(
  current: ChangeDecision,
  event: ChangeResultEvent,
): ChangeDecision {
  if (event.event_type === "human_review_recorded") {
    // Remove human review from required_actions if present.
    const filteredActions = current.required_actions.filter(
      a => a !== "human_review_required",
    );
    return {
      ...current,
      required_actions: filteredActions,
      latest_report_hash: event.refs?.report_hash ?? current.latest_report_hash,
    };
  }
  return { ...current };
}

// ---------------------------------------------------------------------------
// Event Factory Helper
// ---------------------------------------------------------------------------

/**
 * Creates a ChangeResultEvent with a deterministic event_id.
 */
export function createResultEvent(
  eventType: ChangeResultEvent["event_type"],
  status: string,
  summary: string,
  refs?: Record<string, string>,
  timestamp?: string,
): ChangeResultEvent {
  const created_at = timestamp ?? new Date().toISOString();
  const eventId = shortStableId("evt", {
    event_type: eventType,
    status,
    created_at,
    summary,
    refs: refs ?? null,
  }, 12);

  return {
    event_id: eventId,
    event_type: eventType,
    status,
    created_at,
    refs,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Query Helpers
// ---------------------------------------------------------------------------

/** Check if the contract is in a terminal state. */
export function isTerminal(contract: ChangeContract): boolean {
  return contract.lifecycle_status === "closed" || contract.lifecycle_status === "invalid";
}

/** Get allowed next statuses for the current lifecycle status. */
export function getAllowedTransitions(
  status: ChangeContractLifecycleStatus,
): ChangeContractLifecycleStatus[] {
  return [...ALLOWED_TRANSITIONS[status]];
}
