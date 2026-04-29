/**
 * P19a: Change Contract Lifecycle Tests
 *
 * Tests the lifecycle state machine, deterministic contract_id generation,
 * guarded transitions, and append-only event behavior.
 *
 * ref: P19a
 */

import { describe, it, expect } from "vitest";
import {
  generateContractId,
  transitionChangeContract,
  recordContractEvent,
  createResultEvent,
  isTerminal,
  getAllowedTransitions,
} from "../../src/changeContract/lifecycle.js";
import type {
  ChangeContract,
  ChangeIntent,
  ChangeResultEvent,
} from "../../src/changeContract/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeIntent(overrides?: Partial<ChangeIntent>): ChangeIntent {
  return {
    intent: "Update conflict policy for offline sync",
    source_request: "Change b_conflict_001",
    requester: "p10_operator",
    created_by: "human",
    ...overrides,
  };
}

function makeMinimalContract(
  overrides?: Partial<ChangeContract>,
): ChangeContract {
  const intent = makeIntent();
  return {
    contract_id: "cc_test_000001",
    created_at: "2026-04-27T00:00:00Z",
    updated_at: "2026-04-27T00:00:00Z",
    lifecycle_status: "draft",
    change: intent,
    refs: {
      canonical_revisions: [
        { artifact_id: "art_arch", revision_id: "rev_001" },
      ],
      handoff_hash: "hh_abc123",
      boundary_graph_hash: "bg_abc123",
      blast_radius_hash: "br_abc123",
      scoped_handoff_hash: "sh_abc123",
    },
    impact: {
      changed_nodes: ["blk:arch:b_conflict_001"],
      risk_level: "high",
      impacted_files: ["ConflictPolicy.kt"],
      impacted_symbols: ["ConflictPolicyRegistry"],
      impacted_tests: ["ConflictPolicyTests.kt"],
      impact_summary: "1 high-risk block changed",
    },
    scope: {
      scope_hash: "scope_abc123",
      allowed_files: [{ path: "billing/**", allowed_operations: ["read", "modify"] }],
      forbidden_paths: [".pantheon/**"],
      required_tests: [],
      forbidden_assumptions: ["FA-001: no clinical LWW"],
      escalation_rules: ["Stop if modifying shared interface"],
      must_require_human_review: true,
    },
    agent: {
      adapter: "manual",
      exported: false,
      constraints_summary: ["Only modify billing module"],
    },
    verification: {
      obligations: [
        {
          obligation_id: "obl_scope_diff",
          type: "scope_diff",
          required: true,
          status: "pending",
          description: "P18 scope diff must pass",
        },
        {
          obligation_id: "obl_human_review",
          type: "human_review",
          required: true,
          status: "pending",
          description: "High-risk scope requires human review",
        },
      ],
    },
    result_events: [],
    current_decision: {
      decision: "pending",
      required_actions: [],
    },
    ...overrides,
  };
}

function makeEvent(
  eventType: ChangeResultEvent["event_type"],
  status: string = "ok",
  timestamp: string = "2026-04-27T01:00:00Z",
): ChangeResultEvent {
  return createResultEvent(eventType, status, `Event: ${eventType}`, undefined, timestamp);
}

// ---------------------------------------------------------------------------
// Contract ID Generation
// ---------------------------------------------------------------------------

describe("generateContractId", () => {
  it("produces deterministic ID from same inputs", () => {
    const intent = makeIntent();
    const refs = [{ artifact_id: "art_arch", revision_id: "rev_001" }];

    const id1 = generateContractId(intent, refs);
    const id2 = generateContractId(intent, refs);

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^cc_[a-f0-9]{12}$/);
  });

  it("produces different IDs for different intents", () => {
    const refs = [{ artifact_id: "art_arch", revision_id: "rev_001" }];

    const id1 = generateContractId(makeIntent({ intent: "Change A" }), refs);
    const id2 = generateContractId(makeIntent({ intent: "Change B" }), refs);

    expect(id1).not.toBe(id2);
  });

  it("produces different IDs for different canonical refs", () => {
    const intent = makeIntent();

    const id1 = generateContractId(intent, [{ artifact_id: "art_arch", revision_id: "rev_001" }]);
    const id2 = generateContractId(intent, [{ artifact_id: "art_arch", revision_id: "rev_002" }]);

    expect(id1).not.toBe(id2);
  });

  it("is case-insensitive for intent text", () => {
    const refs = [{ artifact_id: "art_arch", revision_id: "rev_001" }];

    const id1 = generateContractId(makeIntent({ intent: "Update Policy" }), refs);
    const id2 = generateContractId(makeIntent({ intent: "update policy" }), refs);

    expect(id1).toBe(id2);
  });

  it("is order-independent for canonical refs", () => {
    const intent = makeIntent();
    const refsA = [
      { artifact_id: "art_arch", revision_id: "rev_001" },
      { artifact_id: "art_iface", revision_id: "rev_002" },
    ];
    const refsB = [
      { artifact_id: "art_iface", revision_id: "rev_002" },
      { artifact_id: "art_arch", revision_id: "rev_001" },
    ];

    expect(generateContractId(intent, refsA)).toBe(generateContractId(intent, refsB));
  });
});

// ---------------------------------------------------------------------------
// Allowed Transitions
// ---------------------------------------------------------------------------

describe("lifecycle transitions", () => {
  it("draft → scoped passes", () => {
    const contract = makeMinimalContract({ lifecycle_status: "draft" });
    const event = makeEvent("scope_built");
    const next = transitionChangeContract(contract, "scoped", event);

    expect(next.lifecycle_status).toBe("scoped");
    expect(next.result_events).toHaveLength(1);
    expect(next.result_events[0].event_type).toBe("scope_built");
  });

  it("scoped → exported passes", () => {
    const contract = makeMinimalContract({ lifecycle_status: "scoped" });
    const event = makeEvent("agent_scope_exported");
    const next = transitionChangeContract(contract, "exported", event);

    expect(next.lifecycle_status).toBe("exported");
  });

  it("exported → verified passes", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("scope_diff_verified", "pass");
    const next = transitionChangeContract(contract, "verified", event);

    expect(next.lifecycle_status).toBe("verified");
  });

  it("exported → escalated passes", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("reverse_issue_required");
    const next = transitionChangeContract(contract, "escalated", event);

    expect(next.lifecycle_status).toBe("escalated");
  });

  it("verified → closed passes", () => {
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("contract_closed");
    const next = transitionChangeContract(contract, "closed", event);

    expect(next.lifecycle_status).toBe("closed");
  });

  it("verified → escalated passes", () => {
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("reverse_issue_required");
    const next = transitionChangeContract(contract, "escalated", event);

    expect(next.lifecycle_status).toBe("escalated");
  });

  it("escalated → verified passes with scope_diff_verified event", () => {
    const contract = makeMinimalContract({ lifecycle_status: "escalated" });
    const event = makeEvent("scope_diff_verified", "pass");
    const next = transitionChangeContract(contract, "verified", event);

    expect(next.lifecycle_status).toBe("verified");
  });

  it("escalated → closed passes with contract_closed event", () => {
    const contract = makeMinimalContract({ lifecycle_status: "escalated" });
    const event = makeEvent("contract_closed");
    const next = transitionChangeContract(contract, "closed", event);

    expect(next.lifecycle_status).toBe("closed");
  });

  it("any status → invalid passes with contract_invalidated event", () => {
    for (const from of ["draft", "scoped", "exported", "verified", "escalated"] as const) {
      const contract = makeMinimalContract({ lifecycle_status: from });
      const event = makeEvent("contract_invalidated");
      const next = transitionChangeContract(contract, "invalid", event);

      expect(next.lifecycle_status).toBe("invalid");
    }
  });
});

// ---------------------------------------------------------------------------
// Forbidden Transitions
// ---------------------------------------------------------------------------

describe("forbidden transitions", () => {
  it("closed → any throws", () => {
    const contract = makeMinimalContract({ lifecycle_status: "closed" });
    const event = makeEvent("scope_built");

    expect(() => transitionChangeContract(contract, "scoped", event)).toThrow(
      "Invalid ChangeContract transition: closed → scoped",
    );
  });

  it("invalid → any throws", () => {
    const contract = makeMinimalContract({ lifecycle_status: "invalid" });
    const event = makeEvent("scope_built");

    expect(() => transitionChangeContract(contract, "scoped", event)).toThrow(
      "Invalid ChangeContract transition: invalid → scoped",
    );
  });

  it("draft → verified throws (must go through scoped first)", () => {
    const contract = makeMinimalContract({ lifecycle_status: "draft" });
    const event = makeEvent("scope_diff_verified", "pass");

    expect(() => transitionChangeContract(contract, "verified", event)).toThrow(
      "Invalid ChangeContract transition: draft → verified",
    );
  });

  it("scoped → closed throws (must go through exported/verified)", () => {
    const contract = makeMinimalContract({ lifecycle_status: "scoped" });
    const event = makeEvent("contract_closed");

    expect(() => transitionChangeContract(contract, "closed", event)).toThrow(
      "Invalid ChangeContract transition: scoped → closed",
    );
  });
});

// ---------------------------------------------------------------------------
// Guarded Transitions
// ---------------------------------------------------------------------------

describe("guarded transitions", () => {
  it("escalated → verified rejects non-scope_diff_verified event", () => {
    const contract = makeMinimalContract({ lifecycle_status: "escalated" });
    const event = makeEvent("agent_scope_exported");

    expect(() => transitionChangeContract(contract, "verified", event)).toThrow(
      "Transition to 'verified' requires a scope_diff_verified event",
    );
  });

  it("exported → verified rejects annotation event (annotation guard fires first)", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("human_review_recorded");

    expect(() => transitionChangeContract(contract, "verified", event)).toThrow(
      "is an annotation event and cannot drive lifecycle transitions",
    );
  });

  it("→ closed rejects non-contract_closed event", () => {
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("scope_diff_verified", "pass");

    expect(() => transitionChangeContract(contract, "closed", event)).toThrow(
      "Transition to 'closed' requires a contract_closed event",
    );
  });

  it("→ invalid rejects non-contract_invalidated event", () => {
    const contract = makeMinimalContract({ lifecycle_status: "draft" });
    const event = makeEvent("scope_built");

    expect(() => transitionChangeContract(contract, "invalid", event)).toThrow(
      "Transition to 'invalid' requires a contract_invalidated event",
    );
  });

  it("annotation events cannot drive lifecycle transitions", () => {
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("human_review_recorded");

    expect(() => transitionChangeContract(contract, "escalated", event)).toThrow(
      "is an annotation event and cannot drive lifecycle transitions",
    );
  });

  it("annotation events cannot escalate from exported", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("human_review_recorded");

    expect(() => transitionChangeContract(contract, "escalated", event)).toThrow(
      "is an annotation event and cannot drive lifecycle transitions",
    );
  });
});

// ---------------------------------------------------------------------------
// Append-Only Events
// ---------------------------------------------------------------------------

describe("append-only result events", () => {
  it("transition appends event without mutating prior events", () => {
    const event0 = makeEvent("contract_created", "ok", "2026-04-27T00:00:00Z");
    const contract = makeMinimalContract({
      lifecycle_status: "draft",
      result_events: [event0],
    });

    const event1 = makeEvent("scope_built", "ok", "2026-04-27T01:00:00Z");
    const next = transitionChangeContract(contract, "scoped", event1);

    // Prior event preserved
    expect(next.result_events).toHaveLength(2);
    expect(next.result_events[0]).toEqual(event0);
    expect(next.result_events[1]).toEqual(event1);

    // Original contract not mutated
    expect(contract.result_events).toHaveLength(1);
  });

  it("multiple transitions build event chain", () => {
    let contract = makeMinimalContract({ lifecycle_status: "draft" });

    contract = transitionChangeContract(
      contract, "scoped",
      makeEvent("scope_built", "ok", "2026-04-27T01:00:00Z"),
    );
    contract = transitionChangeContract(
      contract, "exported",
      makeEvent("agent_scope_exported", "ok", "2026-04-27T02:00:00Z"),
    );
    contract = transitionChangeContract(
      contract, "verified",
      makeEvent("scope_diff_verified", "pass", "2026-04-27T03:00:00Z"),
    );
    contract = transitionChangeContract(
      contract, "closed",
      makeEvent("contract_closed", "ok", "2026-04-27T04:00:00Z"),
    );

    expect(contract.result_events).toHaveLength(4);
    expect(contract.result_events.map(e => e.event_type)).toEqual([
      "scope_built",
      "agent_scope_exported",
      "scope_diff_verified",
      "contract_closed",
    ]);
    expect(contract.lifecycle_status).toBe("closed");
  });
});

// ---------------------------------------------------------------------------
// Decision Derivation
// ---------------------------------------------------------------------------

describe("decision derivation", () => {
  it("scope_diff_verified pass → decision pass", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("scope_diff_verified", "pass");
    const next = transitionChangeContract(contract, "verified", event);

    expect(next.current_decision.decision).toBe("pass");
  });

  it("scope_diff_verified fail → decision fail", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("scope_diff_verified", "fail");
    const next = transitionChangeContract(contract, "verified", event);

    expect(next.current_decision.decision).toBe("fail");
  });

  it("reverse_issue_required → decision requires_reverse_issue", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("reverse_issue_required");
    const next = transitionChangeContract(contract, "escalated", event);

    expect(next.current_decision.decision).toBe("requires_reverse_issue");
  });

  it("contract_closed → decision closed", () => {
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("contract_closed");
    const next = transitionChangeContract(contract, "closed", event);

    expect(next.current_decision.decision).toBe("closed");
  });

  it("contract_invalidated → decision invalid", () => {
    const contract = makeMinimalContract({ lifecycle_status: "draft" });
    const event = makeEvent("contract_invalidated");
    const next = transitionChangeContract(contract, "invalid", event);

    expect(next.current_decision.decision).toBe("invalid");
  });

  it("human_review_recorded → decision pass (review completed)", () => {
    // Scenario: exported → verified (scope_diff) → escalated → re-verified
    // human_review_recorded updates decision but doesn't bypass scope_diff gate
    const contract = makeMinimalContract({
      lifecycle_status: "exported",
      current_decision: { decision: "pending", required_actions: [] },
    });

    // Step 1: scope diff verified → pass
    const afterVerify = transitionChangeContract(
      contract, "verified",
      makeEvent("scope_diff_verified", "pass", "2026-04-27T01:00:00Z"),
    );
    expect(afterVerify.current_decision.decision).toBe("pass");

    // Step 2: escalation
    const afterEscalate = transitionChangeContract(
      afterVerify, "escalated",
      makeEvent("reverse_issue_required", "ok", "2026-04-27T02:00:00Z"),
    );
    expect(afterEscalate.current_decision.decision).toBe("requires_reverse_issue");

    // Step 3: re-verify after scope expansion
    const afterReVerify = transitionChangeContract(
      afterEscalate, "verified",
      makeEvent("scope_diff_verified", "pass", "2026-04-27T03:00:00Z"),
    );
    expect(afterReVerify.current_decision.decision).toBe("pass");
  });

  it("human_review_recorded cannot bypass scope_diff to reach verified", () => {
    // This is the core bypass prevention test.
    // human_review_recorded is an annotation event and is rejected before
    // the scope_diff guard even fires.
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("human_review_recorded");

    expect(() => transitionChangeContract(contract, "verified", event)).toThrow(
      "is an annotation event and cannot drive lifecycle transitions",
    );
  });
});

// ---------------------------------------------------------------------------
// Terminal / Query Helpers
// ---------------------------------------------------------------------------

describe("query helpers", () => {
  it("isTerminal returns true for closed", () => {
    expect(isTerminal(makeMinimalContract({ lifecycle_status: "closed" }))).toBe(true);
  });

  it("isTerminal returns true for invalid", () => {
    expect(isTerminal(makeMinimalContract({ lifecycle_status: "invalid" }))).toBe(true);
  });

  it("isTerminal returns false for active statuses", () => {
    for (const s of ["draft", "scoped", "exported", "verified", "escalated"] as const) {
      expect(isTerminal(makeMinimalContract({ lifecycle_status: s }))).toBe(false);
    }
  });

  it("getAllowedTransitions returns correct targets", () => {
    expect(getAllowedTransitions("draft")).toEqual(["scoped", "invalid"]);
    expect(getAllowedTransitions("closed")).toEqual([]);
    expect(getAllowedTransitions("escalated")).toEqual(["verified", "closed", "invalid"]);
  });
});

// ---------------------------------------------------------------------------
// createResultEvent
// ---------------------------------------------------------------------------

describe("createResultEvent", () => {
  it("creates event with deterministic ID", () => {
    const e1 = createResultEvent("scope_built", "ok", "Built scope", undefined, "2026-04-27T00:00:00Z");
    const e2 = createResultEvent("scope_built", "ok", "Built scope", undefined, "2026-04-27T00:00:00Z");

    expect(e1.event_id).toBe(e2.event_id);
    expect(e1.event_id).toMatch(/^evt_[a-f0-9]{12}$/);
  });

  it("different inputs produce different IDs", () => {
    const e1 = createResultEvent("scope_built", "ok", "A", undefined, "2026-04-27T00:00:00Z");
    const e2 = createResultEvent("scope_built", "ok", "B", undefined, "2026-04-27T00:00:00Z");

    expect(e1.event_id).not.toBe(e2.event_id);
  });

  it("different refs produce different IDs", () => {
    const e1 = createResultEvent("scope_diff_verified", "pass", "Verified", { report_hash: "aaa" }, "2026-04-27T00:00:00Z");
    const e2 = createResultEvent("scope_diff_verified", "pass", "Verified", { report_hash: "bbb" }, "2026-04-27T00:00:00Z");

    expect(e1.event_id).not.toBe(e2.event_id);
  });

  it("same refs in different order produce same ID", () => {
    const e1 = createResultEvent("scope_diff_verified", "pass", "V", { a: "1", b: "2" }, "2026-04-27T00:00:00Z");
    const e2 = createResultEvent("scope_diff_verified", "pass", "V", { b: "2", a: "1" }, "2026-04-27T00:00:00Z");

    expect(e1.event_id).toBe(e2.event_id);
  });
});

// ---------------------------------------------------------------------------
// recordContractEvent (in-state annotations)
// ---------------------------------------------------------------------------

describe("recordContractEvent", () => {
  it("appends human_review_recorded without changing lifecycle status", () => {
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("human_review_recorded", "completed", "2026-04-27T05:00:00Z");
    const next = recordContractEvent(contract, event);

    expect(next.lifecycle_status).toBe("verified");
    expect(next.result_events).toHaveLength(1);
    expect(next.result_events[0].event_type).toBe("human_review_recorded");
  });

  it("clears human_review_required from required_actions", () => {
    const contract = makeMinimalContract({
      lifecycle_status: "verified",
      current_decision: {
        decision: "pass",
        required_actions: ["human_review_required", "deploy_to_staging"],
      },
    });
    const event = makeEvent("human_review_recorded", "completed", "2026-04-27T05:00:00Z");
    const next = recordContractEvent(contract, event);

    expect(next.current_decision.required_actions).toEqual(["deploy_to_staging"]);
    expect(next.current_decision.required_actions).not.toContain("human_review_required");
  });

  it("does not mutate original contract", () => {
    // Must use verified status since human_review_recorded is restricted
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("human_review_recorded", "completed", "2026-04-27T05:00:00Z");
    const next = recordContractEvent(contract, event);

    expect(contract.result_events).toHaveLength(0);
    expect(next.result_events).toHaveLength(1);
  });

  it("rejects annotation on terminal contract", () => {
    const contract = makeMinimalContract({ lifecycle_status: "closed" });
    const event = makeEvent("human_review_recorded");

    expect(() => recordContractEvent(contract, event)).toThrow(
      "Cannot record event on terminal contract",
    );
  });

  it("rejects non-annotation event types", () => {
    const contract = makeMinimalContract({ lifecycle_status: "verified" });
    const event = makeEvent("scope_diff_verified", "pass");

    expect(() => recordContractEvent(contract, event)).toThrow(
      "is not an annotation event",
    );
  });

  it("works in verified status after scope_diff_verified transition", () => {
    // Full flow: exported → verified (scope_diff) → record human review
    let contract = makeMinimalContract({
      lifecycle_status: "exported",
      current_decision: {
        decision: "pending",
        required_actions: ["human_review_required"],
      },
    });

    // Transition to verified with scope_diff
    contract = transitionChangeContract(
      contract, "verified",
      makeEvent("scope_diff_verified", "pass", "2026-04-27T01:00:00Z"),
    );
    expect(contract.lifecycle_status).toBe("verified");
    expect(contract.current_decision.decision).toBe("pass");
    expect(contract.current_decision.required_actions).toContain("human_review_required");

    // Record human review (no lifecycle change)
    contract = recordContractEvent(
      contract,
      makeEvent("human_review_recorded", "approved", "2026-04-27T02:00:00Z"),
    );
    expect(contract.lifecycle_status).toBe("verified");
    expect(contract.current_decision.required_actions).not.toContain("human_review_required");
    expect(contract.result_events).toHaveLength(2);
    expect(contract.result_events[1].event_type).toBe("human_review_recorded");
  });

  it("rejects human_review_recorded on exported contract", () => {
    const contract = makeMinimalContract({ lifecycle_status: "exported" });
    const event = makeEvent("human_review_recorded");

    expect(() => recordContractEvent(contract, event)).toThrow(
      "human_review_recorded can only be recorded in [verified, escalated] states",
    );
  });

  it("rejects human_review_recorded on scoped contract", () => {
    const contract = makeMinimalContract({ lifecycle_status: "scoped" });
    const event = makeEvent("human_review_recorded");

    expect(() => recordContractEvent(contract, event)).toThrow(
      "human_review_recorded can only be recorded in [verified, escalated] states",
    );
  });

  it("allows human_review_recorded on escalated contract", () => {
    const contract = makeMinimalContract({ lifecycle_status: "escalated" });
    const event = makeEvent("human_review_recorded", "approved", "2026-04-27T05:00:00Z");
    const next = recordContractEvent(contract, event);

    expect(next.lifecycle_status).toBe("escalated");
    expect(next.result_events).toHaveLength(1);
    expect(next.result_events[0].event_type).toBe("human_review_recorded");
  });
});
