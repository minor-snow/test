/**
 * P19b: Change Contract Builder Tests
 *
 * Tests buildChangeContract() — the bridge from P15/P17 pipeline outputs
 * to a ChangeContract in "draft" status.
 *
 * ref: P19b
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { buildChangeContract } from "../../src/changeContract/changeContractBuilder.js";
import type { BuildChangeContractInput } from "../../src/changeContract/changeContractBuilder.js";
import type { BlastRadiusReport } from "../../src/boundary/blastRadius.js";
import type { ScopedImplementationBoundaryPackage } from "../../src/scopedHandoff/types.js";
import type { ChangeIntent } from "../../src/changeContract/types.js";

function hashStr(s: string): string {
  return "sha256:" + createHash("sha256").update(s).digest("hex");
}

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

function makeBlastRadiusReport(overrides?: Partial<BlastRadiusReport>): BlastRadiusReport {
  return {
    request: {
      changed_nodes: ["blk:arch:b_conflict_001"],
      change_description: "Update conflict policy",
      graph: { nodes: [], edges: [] },
    },
    generated_at: "2026-04-27T00:00:00Z",
    graph_hash: "sha256:graphhash000",
    warnings: [],
    invalid_nodes: [],
    summary: {
      changed_nodes: 1,
      valid_changed_nodes: 1,
      direct_impact: 3,
      total_downstream: 12,
      affected_files: 4,
      affected_symbols: 6,
      affected_tests: 3,
      highest_risk_level: "high",
      risk_amplification_count: 1,
    },
    by_layer: {
      architecture: ["blk:arch:b_conflict_001"],
      interface: [],
      module: [],
      handoff: [],
      generated_files: ["ConflictPolicy.kt", "ConflictPolicyRegistry.kt"],
      generated_symbols: ["ConflictPolicyRegistry", "resolveConflict"],
      tests: ["ConflictPolicyTests.kt"],
    },
    risk_amplification: [],
    critical_paths: [],
    paths_truncated: false,
    total_critical_paths_found: 0,
    markdown: "# Blast Radius Report",
    ...overrides,
  } as BlastRadiusReport;
}

function makeScopedPackage(
  overrides?: Partial<ScopedImplementationBoundaryPackage>,
): ScopedImplementationBoundaryPackage {
  return {
    scope_id: "scope_test_001",
    created_at: "2026-04-27T00:00:00Z",
    source: {
      handoff_package_hash: "sha256:handoff123",
      boundary_graph_hash: "sha256:graphhash000",
      blast_radius_report_hash: "sha256:blast123",
      locale: "en",
      generator_version: "p17.0",
    },
    request: {
      changed_nodes: ["blk:arch:b_conflict_001"],
      change_description: "Update conflict policy",
    },
    summary: {
      risk_level: "high",
      must_require_human_review: true,
      downstream_nodes: 12,
      affected_files: 4,
      affected_symbols: 6,
      affected_tests: 3,
    },
    allowed_files: [
      {
        path: "billing/ConflictPolicy.kt",
        origin: "blast_radius_generated" as const,
        reason: "Downstream of changed node",
        source_nodes: ["blk:arch:b_conflict_001"],
        allowed_operations: ["read", "modify"],
      },
      {
        path: "billing/ConflictPolicyRegistry.kt",
        origin: "blast_radius_generated" as const,
        reason: "Downstream of changed node",
        source_nodes: ["blk:arch:b_conflict_001"],
        allowed_operations: ["modify", "regenerate"],
      },
    ],
    forbidden_files: [
      { pattern: ".pantheon/**", reason: "Protocol files" },
      { pattern: ".cursor/**", reason: "Adapter files" },
    ],
    required_tests: [
      {
        test_id: "test_conflict_001",
        test_name: "ConflictPolicyTests",
        file_path: "billing/ConflictPolicyTests.kt",
        requirement: "must_run" as const,
        reason: "Directly tests changed policy",
        source_nodes: ["blk:arch:b_conflict_001"],
      },
    ],
    affected_symbols: [],
    must_preserve: [
      {
        constraint_id: "cst_001",
        statement: "LWW must not be used for clinical data",
        severity: "high" as const,
        source_nodes: ["blk:arch:b_conflict_001"],
        enforced_by: [],
      },
    ],
    forbidden_assumptions: [
      {
        assumption_id: "FA-001",
        statement: "No clinical LWW",
        reason: "Patient data integrity",
        source_nodes: ["blk:arch:b_conflict_001"],
        enforced_by: [],
      },
    ],
    risk_amplification: [],
    reverse_issue_required_if: [
      {
        trigger_id: "ri_001",
        condition: "Modifying shared interface",
        required_action: "Create reverse implementation issue",
        example_command: "pantheon issue create --type=contract_mismatch",
      },
    ],
    implementation_context: "Context here",
    human_readable_summary: "Summary here",
    ...overrides,
  } as ScopedImplementationBoundaryPackage;
}

function makeInput(overrides?: Partial<BuildChangeContractInput>): BuildChangeContractInput {
  const report = overrides?.blastRadiusReport ?? makeBlastRadiusReport();
  const blastHash = hashStr(JSON.stringify(report));
  const pkg = overrides?.scopedPackage ?? makeScopedPackage({
    source: {
      handoff_package_hash: "sha256:handoff123",
      boundary_graph_hash: report.graph_hash,
      blast_radius_report_hash: blastHash,
      locale: "en",
      generator_version: "p17.0",
    },
  });
  // Ensure package source hashes match the report
  if (!overrides?.scopedPackage) {
    pkg.source.boundary_graph_hash = report.graph_hash;
    pkg.source.blast_radius_report_hash = blastHash;
  }
  return {
    intent: overrides?.intent ?? makeIntent(),
    canonical_revisions: overrides?.canonical_revisions ?? [
      { artifact_id: "art_arch", revision_id: "rev_001" },
    ],
    blastRadiusReport: overrides?.blastRadiusReport ?? report,
    scopedPackage: overrides?.scopedPackage ?? pkg,
    timestamp: overrides?.timestamp ?? "2026-04-27T00:00:00Z",
    ...(overrides?.adapter !== undefined ? { adapter: overrides.adapter } : {}),
  };
}

// ---------------------------------------------------------------------------
// Core Builder Tests
// ---------------------------------------------------------------------------

describe("buildChangeContract", () => {
  it("produces a valid draft contract", () => {
    const { contract, diagnostics } = buildChangeContract(makeInput());

    expect(contract.lifecycle_status).toBe("draft");
    expect(contract.contract_id).toMatch(/^cc_[a-f0-9]{12}$/);
    expect(contract.created_at).toBe("2026-04-27T00:00:00Z");
    expect(contract.updated_at).toBe("2026-04-27T00:00:00Z");
    expect(diagnostics).toEqual([]);
  });

  it("generates deterministic contract_id from same inputs", () => {
    const input = makeInput();
    const r1 = buildChangeContract(input);
    const r2 = buildChangeContract(input);

    expect(r1.contract.contract_id).toBe(r2.contract.contract_id);
  });

  it("generates different contract_id for different intents", () => {
    const r1 = buildChangeContract(makeInput({ intent: makeIntent({ intent: "Change A" }) }));
    const r2 = buildChangeContract(makeInput({ intent: makeIntent({ intent: "Change B" }) }));

    expect(r1.contract.contract_id).not.toBe(r2.contract.contract_id);
  });
});

// ---------------------------------------------------------------------------
// Impact Extraction
// ---------------------------------------------------------------------------

describe("impact extraction", () => {
  it("maps P15 blast radius to impact fields", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.impact.changed_nodes).toEqual(["blk:arch:b_conflict_001"]);
    expect(contract.impact.risk_level).toBe("high");
    expect(contract.impact.impacted_files).toEqual([
      "ConflictPolicy.kt",
      "ConflictPolicyRegistry.kt",
    ]);
    expect(contract.impact.impacted_symbols).toEqual([
      "ConflictPolicyRegistry",
      "resolveConflict",
    ]);
    expect(contract.impact.impacted_tests).toEqual(["ConflictPolicyTests.kt"]);
    expect(contract.impact.impact_summary).toContain("12 downstream");
  });
});

// ---------------------------------------------------------------------------
// Scope Extraction
// ---------------------------------------------------------------------------

describe("scope extraction", () => {
  it("maps P17 scope package to scope fields", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.scope.allowed_files).toEqual([
      { path: "billing/ConflictPolicy.kt", allowed_operations: ["modify", "read"] },
      { path: "billing/ConflictPolicyRegistry.kt", allowed_operations: ["modify", "regenerate"] },
    ]);
    expect(contract.scope.forbidden_paths).toEqual([
      ".pantheon/**",
      ".cursor/**",
    ]);
    expect(contract.scope.required_tests).toEqual([
      {
        test_id: "test_conflict_001",
        test_name: "ConflictPolicyTests",
        file_path: "billing/ConflictPolicyTests.kt",
        requirement: "must_run",
      },
    ]);
    expect(contract.scope.forbidden_assumptions).toEqual([
      "FA-001: No clinical LWW",
    ]);
    expect(contract.scope.escalation_rules).toEqual([
      "Modifying shared interface",
    ]);
    expect(contract.scope.must_require_human_review).toBe(true);
  });

  it("generates scope_hash", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.scope.scope_hash).toMatch(/^scope_[a-f0-9]{16}$/);
  });

  it("produces same scope_hash for same inputs", () => {
    const r1 = buildChangeContract(makeInput());
    const r2 = buildChangeContract(makeInput());

    expect(r1.contract.scope.scope_hash).toBe(r2.contract.scope.scope_hash);
  });

  it("scope_hash changes when required_test requirement flips", () => {
    const base = buildChangeContract(makeInput());
    const report = makeBlastRadiusReport();
    const altPkg = makeScopedPackage({
      source: {
        handoff_package_hash: "sha256:handoff123",
        boundary_graph_hash: report.graph_hash,
        blast_radius_report_hash: hashStr(JSON.stringify(report)),
        locale: "en",
        generator_version: "p17.0",
      },
      required_tests: [
        {
          test_id: "test_conflict_001",
          test_name: "ConflictPolicyTests",
          file_path: "billing/ConflictPolicyTests.kt",
          requirement: "must_update_if_behavior_changes" as const,
          reason: "Directly tests changed policy",
          source_nodes: ["blk:arch:b_conflict_001"],
        },
      ],
    });
    const alt = buildChangeContract(makeInput({ blastRadiusReport: report, scopedPackage: altPkg }));

    expect(alt.contract.scope.scope_hash).not.toBe(base.contract.scope.scope_hash);
  });

  it("scope_hash changes when forbidden assumption statement changes", () => {
    const base = buildChangeContract(makeInput());
    const report = makeBlastRadiusReport();
    const altPkg = makeScopedPackage({
      source: {
        handoff_package_hash: "sha256:handoff123",
        boundary_graph_hash: report.graph_hash,
        blast_radius_report_hash: hashStr(JSON.stringify(report)),
        locale: "en",
        generator_version: "p17.0",
      },
      forbidden_assumptions: [
        {
          assumption_id: "FA-001",
          statement: "CHANGED: clinical LWW is now allowed",
          reason: "Patient data integrity",
          source_nodes: ["blk:arch:b_conflict_001"],
          enforced_by: [],
        },
      ],
    });
    const alt = buildChangeContract(makeInput({ blastRadiusReport: report, scopedPackage: altPkg }));

    expect(alt.contract.scope.scope_hash).not.toBe(base.contract.scope.scope_hash);
  });

  it("scope_hash changes when escalation trigger condition changes", () => {
    const base = buildChangeContract(makeInput());
    const report = makeBlastRadiusReport();
    const altPkg = makeScopedPackage({
      source: {
        handoff_package_hash: "sha256:handoff123",
        boundary_graph_hash: report.graph_hash,
        blast_radius_report_hash: hashStr(JSON.stringify(report)),
        locale: "en",
        generator_version: "p17.0",
      },
      reverse_issue_required_if: [
        {
          trigger_id: "ri_001",
          condition: "CHANGED: modifying private interface",
          required_action: "Create reverse implementation issue",
          example_command: "pantheon issue create --type=contract_mismatch",
        },
      ],
    });
    const alt = buildChangeContract(makeInput({ blastRadiusReport: report, scopedPackage: altPkg }));

    expect(alt.contract.scope.scope_hash).not.toBe(base.contract.scope.scope_hash);
  });
});

// ---------------------------------------------------------------------------
// Refs (hash-linked)
// ---------------------------------------------------------------------------

describe("refs", () => {
  it("links to upstream hashes", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.refs.handoff_hash).toBe("sha256:handoff123");
    expect(contract.refs.boundary_graph_hash).toBe("sha256:graphhash000");
    expect(contract.refs.blast_radius_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(contract.refs.scoped_handoff_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(contract.refs.canonical_revisions).toEqual([
      { artifact_id: "art_arch", revision_id: "rev_001" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Verification Obligations
// ---------------------------------------------------------------------------

describe("verification obligations", () => {
  it("always includes scope_diff obligation", () => {
    const { contract } = buildChangeContract(makeInput());
    const scopeDiff = contract.verification.obligations.find(o => o.type === "scope_diff");

    expect(scopeDiff).toBeDefined();
    expect(scopeDiff!.required).toBe(true);
    expect(scopeDiff!.status).toBe("pending");
  });

  it("includes human_review when must_require_human_review is true", () => {
    const { contract } = buildChangeContract(makeInput());
    const humanReview = contract.verification.obligations.find(o => o.type === "human_review");

    expect(humanReview).toBeDefined();
    expect(humanReview!.required).toBe(true);
    expect(humanReview!.status).toBe("pending");
  });

  it("omits human_review when must_require_human_review is false", () => {
    const report = makeBlastRadiusReport();
    const pkg = makeScopedPackage({
      source: {
        handoff_package_hash: "sha256:handoff123",
        boundary_graph_hash: report.graph_hash,
        blast_radius_report_hash: hashStr(JSON.stringify(report)),
        locale: "en",
        generator_version: "p17.0",
      },
      summary: {
        risk_level: "high",
        must_require_human_review: false,
        downstream_nodes: 2,
        affected_files: 1,
        affected_symbols: 1,
        affected_tests: 1,
      },
    });
    const { contract } = buildChangeContract(makeInput({ blastRadiusReport: report, scopedPackage: pkg }));
    const humanReview = contract.verification.obligations.find(o => o.type === "human_review");

    expect(humanReview).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

describe("agent", () => {
  it("defaults to manual adapter", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.agent.adapter).toBe("manual");
    expect(contract.agent.exported).toBe(false);
  });

  it("uses specified adapter", () => {
    const { contract } = buildChangeContract(makeInput({ adapter: "cursor" }));

    expect(contract.agent.adapter).toBe("cursor");
  });

  it("generates constraints summary", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.agent.constraints_summary.length).toBeGreaterThan(0);
    expect(contract.agent.constraints_summary.some(s => s.includes("Allowed:"))).toBe(true);
    expect(contract.agent.constraints_summary.some(s => s.includes("Forbidden:"))).toBe(true);
    expect(contract.agent.constraints_summary.some(s => s.includes("Requires human review"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe("initial events", () => {
  it("includes contract_created event", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.result_events).toHaveLength(1);
    expect(contract.result_events[0].event_type).toBe("contract_created");
    expect(contract.result_events[0].status).toBe("ok");
    expect(contract.result_events[0].event_id).toMatch(/^evt_[a-f0-9]{12}$/);
  });

  it("contract_created event refs include blast_radius_hash", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.result_events[0].refs).toBeDefined();
    expect(contract.result_events[0].refs!.blast_radius_hash).toMatch(/^sha256:/);
  });
});

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

describe("initial decision", () => {
  it("starts with pending decision", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.current_decision.decision).toBe("pending");
  });

  it("includes human_review_required action when scope requires it", () => {
    const { contract } = buildChangeContract(makeInput());

    expect(contract.current_decision.required_actions).toContain("human_review_required");
  });

  it("omits human_review_required when not needed", () => {
    const report = makeBlastRadiusReport();
    const pkg = makeScopedPackage({
      source: {
        handoff_package_hash: "sha256:handoff123",
        boundary_graph_hash: report.graph_hash,
        blast_radius_report_hash: hashStr(JSON.stringify(report)),
        locale: "en",
        generator_version: "p17.0",
      },
      summary: {
        risk_level: "high",
        must_require_human_review: false,
        downstream_nodes: 2,
        affected_files: 1,
        affected_symbols: 1,
        affected_tests: 1,
      },
    });
    const { contract } = buildChangeContract(makeInput({ blastRadiusReport: report, scopedPackage: pkg }));

    expect(contract.current_decision.required_actions).not.toContain("human_review_required");
  });
});

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

describe("diagnostics", () => {
  it("reports risk level mismatch between P15 and P17", () => {
    const report = makeBlastRadiusReport({
      summary: {
        changed_nodes: 1,
        valid_changed_nodes: 1,
        direct_impact: 1,
        total_downstream: 2,
        affected_files: 1,
        affected_symbols: 1,
        affected_tests: 1,
        highest_risk_level: "medium",
        risk_amplification_count: 0,
      },
    });
    const { diagnostics } = buildChangeContract(makeInput({
      blastRadiusReport: report,
    }));

    expect(diagnostics.some(d => d.includes("Risk level mismatch"))).toBe(true);
    expect(diagnostics.some(d => d.includes("medium") && d.includes("high"))).toBe(true);
  });

  it("reports P15 warnings", () => {
    const report = makeBlastRadiusReport({
      warnings: ["Node X not found", "Edge Y dangling"],
    });
    const { diagnostics } = buildChangeContract(makeInput({
      blastRadiusReport: report,
    }));

    expect(diagnostics.some(d => d.includes("2 warning(s)"))).toBe(true);
  });

  it("produces no diagnostics when P15/P17 are consistent", () => {
    const { diagnostics } = buildChangeContract(makeInput());

    expect(diagnostics).toEqual([]);
  });

  it("reports risk mismatch and uses P17 value in impact", () => {
    const report = makeBlastRadiusReport({
      summary: {
        changed_nodes: 1,
        valid_changed_nodes: 1,
        direct_impact: 1,
        total_downstream: 2,
        affected_files: 1,
        affected_symbols: 1,
        affected_tests: 1,
        highest_risk_level: "medium",
        risk_amplification_count: 0,
      },
    });
    const { contract, diagnostics } = buildChangeContract(makeInput({
      blastRadiusReport: report,
    }));

    // P17 says high, P15 says medium → contract stores P17's value
    expect(contract.impact.risk_level).toBe("high");
    expect(diagnostics.some(d => d.includes("Using P17 value in impact.risk_level"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Upstream Consistency
// ---------------------------------------------------------------------------

describe("upstream consistency", () => {
  it("throws when graph_hash differs between P15 and P17", () => {
    const report = makeBlastRadiusReport({ graph_hash: "sha256:different_graph" });
    const pkg = makeScopedPackage({
      source: {
        handoff_package_hash: "sha256:handoff123",
        boundary_graph_hash: "sha256:original_graph",
        blast_radius_report_hash: hashStr(JSON.stringify(report)),
        locale: "en",
        generator_version: "p17.0",
      },
    });

    expect(() => buildChangeContract(makeInput({
      blastRadiusReport: report,
      scopedPackage: pkg,
    }))).toThrow("P15/P17 upstream mismatch: boundary_graph_hash differs");
  });

  it("throws when blast_radius_report_hash differs", () => {
    const report = makeBlastRadiusReport();
    const pkg = makeScopedPackage({
      source: {
        handoff_package_hash: "sha256:handoff123",
        boundary_graph_hash: report.graph_hash,
        blast_radius_report_hash: "sha256:wrong_hash",
        locale: "en",
        generator_version: "p17.0",
      },
    });

    expect(() => buildChangeContract(makeInput({
      blastRadiusReport: report,
      scopedPackage: pkg,
    }))).toThrow("P15/P17 upstream mismatch: blast_radius_report_hash differs");
  });

  it("passes when hashes match", () => {
    // Default makeInput() produces consistent hashes
    expect(() => buildChangeContract(makeInput())).not.toThrow();
  });
});
