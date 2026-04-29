/**
 * P19d: Change Contract Verifier Tests
 *
 * Tests verifyChangeContract() — the bridge from P18 scope diff report
 * to ChangeContract verification state updates.
 *
 * ref: P19d
 */

import { describe, it, expect } from "vitest";
import { verifyChangeContract } from "../../src/changeContract/changeContractVerifier.js";
import type { VerifyChangeContractInput } from "../../src/changeContract/changeContractVerifier.js";
import type { ChangeContract } from "../../src/changeContract/types.js";
import type { ScopeDiffReport } from "../../src/scopeDiff/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeExportedContract(overrides?: Partial<ChangeContract>): ChangeContract {
  return {
    contract_id: "cc_aabbccddee00",
    created_at: "2026-04-27T00:00:00Z",
    updated_at: "2026-04-27T01:00:00Z",
    lifecycle_status: "exported",

    change: {
      intent: "Update conflict policy for offline sync",
      source_request: "Change b_conflict_001",
    },

    refs: {
      canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_001" }],
      handoff_hash: "sha256:handoff123",
      boundary_graph_hash: "sha256:graph123",
      blast_radius_hash: "sha256:blast123",
      scoped_handoff_hash: "sha256:scope123",
    },

    impact: {
      changed_nodes: ["blk:arch:b_conflict_001"],
      risk_level: "high",
      impacted_files: ["ConflictPolicy.kt"],
      impacted_symbols: ["resolveConflict"],
      impacted_tests: ["ConflictPolicyTests.kt"],
      impact_summary: "1 node, risk: high",
    },

    scope: {
      scope_hash: "scope_aabb112233445566",
      allowed_files: [
        { path: "billing/ConflictPolicy.kt", allowed_operations: ["modify", "read"] },
      ],
      forbidden_paths: [".pantheon/**"],
      required_tests: [
        {
          test_id: "test_conflict_001",
          test_name: "ConflictPolicyTests",
          requirement: "must_run",
        },
      ],
      forbidden_assumptions: [],
      escalation_rules: [],
      must_require_human_review: false,
    },

    agent: {
      adapter: "cursor",
      exported: true,
      instructions_path: ".cursor/rules/pantheon-boundaries.md",
      constraints_summary: ["Allowed: 1 file(s)"],
    },

    verification: {
      obligations: [
        {
          obligation_id: "obl_scope_diff_001",
          type: "scope_diff",
          required: true,
          status: "pending",
          description: "P18 scope diff verification must pass before close.",
        },
      ],
    },

    result_events: [
      {
        event_id: "evt_created_001",
        event_type: "contract_created",
        status: "ok",
        created_at: "2026-04-27T00:00:00Z",
        summary: "Contract created",
      },
      {
        event_id: "evt_exported_001",
        event_type: "agent_scope_exported",
        status: "ok",
        created_at: "2026-04-27T01:00:00Z",
        summary: "Scope exported",
      },
    ],

    current_decision: {
      decision: "pending",
      required_actions: [],
    },

    ...overrides,
  };
}

function makePassReport(overrides?: Partial<ScopeDiffReport>): ScopeDiffReport {
  return {
    generated_at: "2026-04-27T02:00:00Z",
    scope_id: "scope_test_001",
    status: "pass",
    source: {
      scope_path: ".pantheon/scope.json",
      required_tests_path: ".pantheon/required-tests.json",
      scope_hash: "scope_aabb112233445566",
      required_tests_hash: "sha256:tests123",
    },
    summary: {
      changed_files: 1,
      allowed_files_modified: 1,
      outside_scope_files: 0,
      forbidden_files_modified: 0,
      protocol_files_modified: 0,
      generated_boundary_files_modified: 0,
      required_tests: 1,
      required_tests_passed: 1,
      required_tests_failed: 0,
      required_tests_missing: 0,
      reverse_issue_triggers: 0,
    },
    blocking_reasons: [],
    violations: [],
    warnings: [],
    required_actions: [],
    ...overrides,
  };
}

function makeFailReport(overrides?: Partial<ScopeDiffReport>): ScopeDiffReport {
  return makePassReport({
    status: "fail",
    summary: {
      changed_files: 3,
      allowed_files_modified: 1,
      outside_scope_files: 2,
      forbidden_files_modified: 0,
      protocol_files_modified: 0,
      generated_boundary_files_modified: 0,
      required_tests: 1,
      required_tests_passed: 0,
      required_tests_failed: 1,
      required_tests_missing: 0,
      reverse_issue_triggers: 0,
    },
    blocking_reasons: ["2 files outside allowed scope", "1 required test failed"],
    violations: [
      {
        violation_id: "v_001",
        violation_type: "outside_allowed_files",
        severity: "high",
        file_path: "auth/Login.kt",
        message: "File outside allowed scope",
        required_action: "Remove or get approval",
      },
      {
        violation_id: "v_002",
        violation_type: "required_test_failed",
        severity: "high",
        test_id: "test_conflict_001",
        message: "Required test failed",
        required_action: "Fix test",
      },
    ],
    required_actions: ["Remove out-of-scope files", "Fix failing tests"],
    ...overrides,
  });
}

function makeVerifyInput(overrides?: Partial<VerifyChangeContractInput>): VerifyChangeContractInput {
  return {
    contract: makeExportedContract(),
    scopeDiffReport: makePassReport(),
    timestamp: "2026-04-27T02:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Core Verification — PASS
// ---------------------------------------------------------------------------

describe("verifyChangeContract — pass", () => {
  it("transitions to verified on pass", () => {
    const { contract, passed } = verifyChangeContract(makeVerifyInput());

    expect(contract.lifecycle_status).toBe("verified");
    expect(passed).toBe(true);
  });

  it("appends scope_diff_verified event", () => {
    const { contract } = verifyChangeContract(makeVerifyInput());

    expect(contract.result_events).toHaveLength(3);
    expect(contract.result_events[2].event_type).toBe("scope_diff_verified");
    expect(contract.result_events[2].status).toBe("pass");
  });

  it("event refs include report_hash and scope_id", () => {
    const { contract, report_hash } = verifyChangeContract(makeVerifyInput());
    const event = contract.result_events[2];

    expect(event.refs).toBeDefined();
    expect(event.refs!.report_hash).toBe(report_hash);
    expect(event.refs!.scope_id).toBe("scope_test_001");
  });

  it("updates scope_diff obligation to passed", () => {
    const { contract } = verifyChangeContract(makeVerifyInput());
    const obl = contract.verification.obligations.find(o => o.type === "scope_diff");

    expect(obl).toBeDefined();
    expect(obl!.status).toBe("passed");
  });

  it("records report hash in refs", () => {
    const { contract, report_hash } = verifyChangeContract(makeVerifyInput());

    expect(contract.refs.scope_diff_report_hash).toBe(report_hash);
  });

  it("records report hash in decision", () => {
    const { contract, report_hash } = verifyChangeContract(makeVerifyInput());

    expect(contract.current_decision.latest_report_hash).toBe(report_hash);
  });

  it("returns empty blocking_reasons", () => {
    const { blocking_reasons } = verifyChangeContract(makeVerifyInput());

    expect(blocking_reasons).toEqual([]);
  });

  it("produces deterministic report_hash", () => {
    const input = makeVerifyInput();
    const r1 = verifyChangeContract(input);
    const r2 = verifyChangeContract(input);

    expect(r1.report_hash).toBe(r2.report_hash);
  });

  it("sets decision to pass", () => {
    const { contract } = verifyChangeContract(makeVerifyInput());

    expect(contract.current_decision.decision).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// Core Verification — FAIL
// ---------------------------------------------------------------------------

describe("verifyChangeContract — fail", () => {
  it("transitions to escalated on fail", () => {
    const { contract, passed } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: makeFailReport(),
    }));

    expect(contract.lifecycle_status).toBe("escalated");
    expect(passed).toBe(false);
  });

  it("updates scope_diff obligation to failed", () => {
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: makeFailReport(),
    }));
    const obl = contract.verification.obligations.find(o => o.type === "scope_diff");

    expect(obl!.status).toBe("failed");
  });

  it("returns blocking_reasons from report", () => {
    const { blocking_reasons } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: makeFailReport(),
    }));

    expect(blocking_reasons.length).toBe(2);
    expect(blocking_reasons).toContain("2 files outside allowed scope");
  });

  it("records report hash even on fail", () => {
    const { contract, report_hash } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: makeFailReport(),
    }));

    expect(contract.refs.scope_diff_report_hash).toBe(report_hash);
  });

  it("sets decision to fail", () => {
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: makeFailReport(),
    }));

    expect(contract.current_decision.decision).toBe("fail");
  });

  it("uses scope_diff_verified event with fail status", () => {
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: makeFailReport(),
    }));

    expect(contract.result_events[2].event_type).toBe("scope_diff_verified");
    expect(contract.result_events[2].status).toBe("fail");
  });

  it("propagates required_actions from report into decision", () => {
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: makeFailReport(),
    }));

    expect(contract.current_decision.required_actions).toEqual([
      "Remove out-of-scope files",
      "Fix failing tests",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Requires Reverse Issue
// ---------------------------------------------------------------------------

describe("verifyChangeContract — requires_reverse_issue", () => {
  it("transitions to escalated", () => {
    const report = makePassReport({
      status: "requires_reverse_issue",
      blocking_reasons: ["Trigger: shared interface modified"],
      violations: [{
        violation_id: "v_ri_001",
        violation_type: "reverse_issue_required",
        severity: "high",
        message: "Reverse issue required",
        required_action: "Create reverse issue",
      }],
    });
    const { contract, passed } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: report,
    }));

    expect(contract.lifecycle_status).toBe("escalated");
    expect(passed).toBe(false);
  });

  it("uses reverse_issue_required event type", () => {
    const report = makePassReport({
      status: "requires_reverse_issue",
      blocking_reasons: ["Trigger: shared interface modified"],
      violations: [{
        violation_id: "v_ri_001",
        violation_type: "reverse_issue_required",
        severity: "high",
        message: "Reverse issue required",
        required_action: "Create reverse issue",
      }],
    });
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: report,
    }));

    expect(contract.result_events[2].event_type).toBe("reverse_issue_required");
  });

  it("sets decision to requires_reverse_issue", () => {
    const report = makePassReport({
      status: "requires_reverse_issue",
      blocking_reasons: ["Trigger: shared interface modified"],
      violations: [{
        violation_id: "v_ri_001",
        violation_type: "reverse_issue_required",
        severity: "high",
        message: "Reverse issue required",
        required_action: "Create reverse issue",
      }],
    });
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: report,
    }));

    expect(contract.current_decision.decision).toBe("requires_reverse_issue");
  });
});

// ---------------------------------------------------------------------------
// Requires Human Review
// ---------------------------------------------------------------------------

describe("verifyChangeContract — requires_human_review", () => {
  it("transitions to escalated", () => {
    const report = makePassReport({
      status: "requires_human_review",
      blocking_reasons: ["Human review not provided"],
      violations: [{
        violation_id: "v_hr_001",
        violation_type: "human_review_missing",
        severity: "high",
        message: "Human review required but not provided",
        required_action: "Provide human review",
      }],
    });
    const { contract, passed } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: report,
    }));

    expect(contract.lifecycle_status).toBe("escalated");
    expect(passed).toBe(false);
  });

  it("keeps scope_diff obligation as pending", () => {
    const report = makePassReport({
      status: "requires_human_review",
      blocking_reasons: ["Human review not provided"],
      violations: [{
        violation_id: "v_hr_001",
        violation_type: "human_review_missing",
        severity: "high",
        message: "Human review required but not provided",
        required_action: "Provide human review",
      }],
    });
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: report,
    }));
    const obl = contract.verification.obligations.find(o => o.type === "scope_diff");

    expect(obl!.status).toBe("pending");
  });

  it("sets decision to fail for human_review escalation", () => {
    const report = makePassReport({
      status: "requires_human_review",
      blocking_reasons: ["Human review not provided"],
      violations: [{
        violation_id: "v_hr_001",
        violation_type: "human_review_missing",
        severity: "high",
        message: "Human review required but not provided",
        required_action: "Provide human review",
      }],
    });
    const { contract } = verifyChangeContract(makeVerifyInput({
      scopeDiffReport: report,
    }));

    expect(contract.current_decision.decision).toBe("requires_human_review");
  });
});

// ---------------------------------------------------------------------------
// Re-verification from escalated
// ---------------------------------------------------------------------------

describe("verifyChangeContract — re-verify from escalated", () => {
  it("can verify an escalated contract", () => {
    const escalated = makeExportedContract({ lifecycle_status: "escalated" });
    const { contract, passed } = verifyChangeContract(makeVerifyInput({
      contract: escalated,
    }));

    expect(contract.lifecycle_status).toBe("verified");
    expect(passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

describe("verification guards", () => {
  it("throws for draft contract", () => {
    expect(() => verifyChangeContract(makeVerifyInput({
      contract: makeExportedContract({ lifecycle_status: "draft" }),
    }))).toThrow("Cannot verify contract: status is 'draft'");
  });

  it("throws for scoped contract", () => {
    expect(() => verifyChangeContract(makeVerifyInput({
      contract: makeExportedContract({ lifecycle_status: "scoped" }),
    }))).toThrow("Cannot verify contract: status is 'scoped'");
  });

  it("throws for verified contract", () => {
    expect(() => verifyChangeContract(makeVerifyInput({
      contract: makeExportedContract({ lifecycle_status: "verified" }),
    }))).toThrow("Cannot verify contract: status is 'verified'");
  });

  it("throws for closed contract", () => {
    expect(() => verifyChangeContract(makeVerifyInput({
      contract: makeExportedContract({ lifecycle_status: "closed" }),
    }))).toThrow("Cannot verify contract: status is 'closed'");
  });

  it("throws when scope_hash doesn't match", () => {
    const report = makePassReport({
      source: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        scope_hash: "scope_different_hash_00",
        required_tests_hash: "sha256:tests123",
      },
    });

    expect(() => verifyChangeContract(makeVerifyInput({
      scopeDiffReport: report,
    }))).toThrow("Scope hash mismatch");
  });
});

// ---------------------------------------------------------------------------
// Obligation preservation
// ---------------------------------------------------------------------------

describe("obligation updates", () => {
  it("preserves human_review obligation when updating scope_diff", () => {
    const contract = makeExportedContract({
      verification: {
        obligations: [
          {
            obligation_id: "obl_scope_diff_001",
            type: "scope_diff",
            required: true,
            status: "pending",
            description: "Scope diff verification.",
          },
          {
            obligation_id: "obl_human_review_001",
            type: "human_review",
            required: true,
            status: "pending",
            description: "Human review required.",
          },
        ],
      },
    });

    const { contract: verified } = verifyChangeContract(makeVerifyInput({ contract }));

    const scopeObl = verified.verification.obligations.find(o => o.type === "scope_diff");
    const humanObl = verified.verification.obligations.find(o => o.type === "human_review");

    expect(scopeObl!.status).toBe("passed");
    expect(humanObl!.status).toBe("pending"); // unchanged
  });
});
