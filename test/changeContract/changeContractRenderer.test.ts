/**
 * P19.1: Change Contract Renderer Tests
 *
 * Tests renderChangeContractMarkdown() — structure, ordering, content.
 *
 * ref: P19.1
 */

import { describe, it, expect } from "vitest";
import { renderChangeContractMarkdown } from "../../src/changeContract/changeContractRenderer.js";
import type { ChangeContract } from "../../src/changeContract/types.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeContract(overrides?: Partial<ChangeContract>): ChangeContract {
  return {
    contract_id: "cc_render_test_01",
    created_at: "2026-04-27T00:00:00Z",
    updated_at: "2026-04-27T02:00:00Z",
    lifecycle_status: "escalated",

    change: {
      intent: "Update offline conflict policy for pet triage sync",
      source_request: "ARCH-1234",
    },

    refs: {
      canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
      handoff_hash: "sha256:handoff_aabb",
      boundary_graph_hash: "sha256:graph_ccdd",
      blast_radius_hash: "sha256:blast_eeff",
      scoped_handoff_hash: "sha256:scope_0011",
      scope_diff_report_hash: "sha256:report_2233",
    },

    impact: {
      changed_nodes: ["blk:arch:b_conflict"],
      risk_level: "high",
      impacted_files: ["ConflictPolicy.kt"],
      impacted_symbols: ["resolveConflict"],
      impacted_tests: ["ConflictPolicyTest.kt"],
      impact_summary: "1 node, risk: high",
    },

    scope: {
      scope_hash: "scope_render_test_hash",
      allowed_files: [
        { path: "ConflictPolicy.kt", allowed_operations: ["modify", "read"] },
        { path: "Dtos.kt", allowed_operations: ["modify"] },
      ],
      forbidden_paths: [".pantheon/**", ".cursor/**"],
      required_tests: [
        {
          test_id: "test_conflict",
          test_name: "ConflictPolicyTest",
          requirement: "must_run",
        },
        {
          test_id: "test_dto",
          test_name: "DtoTest",
          requirement: "must_update_if_behavior_changes",
        },
      ],
      forbidden_assumptions: ["Network is always available"],
      escalation_rules: ["Adding new conflict strategy requires architecture review"],
      must_require_human_review: true,
    },

    agent: {
      adapter: "cursor",
      exported: true,
      instructions_path: ".cursor/rules/pantheon-boundaries.md",
      constraints_summary: ["Allowed: 2 file(s)", "Requires human review"],
    },

    verification: {
      obligations: [
        {
          obligation_id: "obl_scope_diff_001",
          type: "scope_diff",
          required: true,
          status: "failed",
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

    result_events: [
      {
        event_id: "evt_created",
        event_type: "contract_created",
        status: "ok",
        created_at: "2026-04-27T00:00:00Z",
        summary: "Contract created from P15+P17",
      },
      {
        event_id: "evt_exported",
        event_type: "agent_scope_exported",
        status: "ok",
        created_at: "2026-04-27T01:00:00Z",
        summary: "Scope exported to .cursor/rules/",
      },
      {
        event_id: "evt_escalated",
        event_type: "scope_diff_verified",
        status: "fail",
        created_at: "2026-04-27T02:00:00Z",
        summary: "Scope diff fail",
        refs: {
          blocking_reasons: "File outside scope; Test failed",
          violations: "2",
        },
      },
    ],

    current_decision: {
      decision: "fail",
      required_actions: [
        "Remove out-of-scope file changes",
        "Fix ConflictPolicyTest",
      ],
    },

    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Structure tests
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — structure", () => {
  it("starts with Pantheon Change Contract heading", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md.startsWith("# Pantheon Change Contract")).toBe(true);
  });

  it("renders Decision Summary before Intent", () => {
    const md = renderChangeContractMarkdown(makeContract());
    const decisionIdx = md.indexOf("## Decision Summary");
    const intentIdx = md.indexOf("## Intent");
    expect(decisionIdx).toBeLessThan(intentIdx);
  });

  it("renders Required Actions before Intent", () => {
    const md = renderChangeContractMarkdown(makeContract());
    const actionsIdx = md.indexOf("### Required Actions");
    const intentIdx = md.indexOf("## Intent");
    expect(actionsIdx).toBeLessThan(intentIdx);
  });

  it("renders Projection Notice last", () => {
    const md = renderChangeContractMarkdown(makeContract());
    const noticeIdx = md.indexOf("## Projection Notice");
    const refsIdx = md.indexOf("## References");
    expect(noticeIdx).toBeGreaterThan(refsIdx);
  });

  it("includes projection notice text", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("read-only projection");
    expect(md).toContain("change_contract.json");
  });
});

// ---------------------------------------------------------------------------
// Decision Summary
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — decision summary", () => {
  it("renders contract ID", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`cc_render_test_01`");
  });

  it("renders lifecycle status", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`escalated`");
  });

  it("renders current decision", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`fail`");
  });

  it("renders risk level", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`HIGH`");
  });

  it("renders human review required when applicable", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("Human Review");
    expect(md).toContain("REQUIRED");
  });
});

// ---------------------------------------------------------------------------
// Required Actions + Blocking Reasons
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — actions & reasons", () => {
  it("renders required actions", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("Remove out-of-scope file changes");
    expect(md).toContain("Fix ConflictPolicyTest");
  });

  it("renders blocking reasons from event refs", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("File outside scope");
    expect(md).toContain("Test failed");
  });

  it("omits Required Actions when empty", () => {
    const md = renderChangeContractMarkdown(makeContract({
      current_decision: { decision: "pass", required_actions: [] },
    }));
    expect(md).not.toContain("### Required Actions");
  });
});

// ---------------------------------------------------------------------------
// Intent
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — intent", () => {
  it("renders intent text", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("Update offline conflict policy for pet triage sync");
  });

  it("renders source request", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("ARCH-1234");
  });
});

// ---------------------------------------------------------------------------
// Authorized Scope
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — scope", () => {
  it("renders allowed files with per-file operations", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`ConflictPolicy.kt`");
    expect(md).toContain("modify, read");
    expect(md).toContain("`Dtos.kt`");
  });

  it("renders forbidden patterns", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`.pantheon/**`");
    expect(md).toContain("`.cursor/**`");
  });

  it("renders forbidden assumptions", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("Network is always available");
  });

  it("renders required tests with requirement semantics", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`test_conflict`");
    expect(md).toContain("must run");
    expect(md).toContain("`test_dto`");
    expect(md).toContain("update if behavior changes");
  });

  it("renders escalation rules", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("Adding new conflict strategy");
  });
});

// ---------------------------------------------------------------------------
// Verification Obligations
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — obligations", () => {
  it("renders obligation table", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`obl_scope_diff_001`");
    expect(md).toContain("failed");
    expect(md).toContain("`obl_human_review_001`");
    expect(md).toContain("pending");
  });
});

// ---------------------------------------------------------------------------
// Result Events
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — events", () => {
  it("renders event table", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("contract_created");
    expect(md).toContain("agent_scope_exported");
    expect(md).toContain("scope_diff_verified");
  });
});

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — refs", () => {
  it("renders all hash refs", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`sha256:handoff_aabb`");
    expect(md).toContain("`sha256:graph_ccdd`");
    expect(md).toContain("`sha256:blast_eeff`");
    expect(md).toContain("`sha256:scope_0011`");
    expect(md).toContain("`sha256:report_2233`");
  });

  it("renders scope hash", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("`scope_render_test_hash`");
  });
});

// ---------------------------------------------------------------------------
// Technical IDs preserved
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — technical IDs", () => {
  it("preserves contract_id", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("cc_render_test_01");
  });

  it("preserves obligation IDs", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("obl_scope_diff_001");
    expect(md).toContain("obl_human_review_001");
  });

  it("preserves test IDs", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).toContain("test_conflict");
    expect(md).toContain("test_dto");
  });
});

// ---------------------------------------------------------------------------
// No artifact dumps
// ---------------------------------------------------------------------------

describe("renderChangeContractMarkdown — no dumps", () => {
  it("does not include full artifact content", () => {
    const md = renderChangeContractMarkdown(makeContract());
    expect(md).not.toContain("nodes:");
    expect(md).not.toContain("edges:");
    expect(md).not.toContain("diff_text");
  });
});
