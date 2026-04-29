/**
 * Gate Validators – Test Suite
 *
 * ref: 执行宪法 v0.2 §8, §9.1
 * ref: §18 criteria #5 — issue quarantine → evidence
 */

import { describe, it, expect } from "vitest";
import {
  schemaGate,
  sourceReferenceGate,
  capabilityGate,
  typeSpecificInvariantGate,
  validateSkillOutput,
  getSkillCapability,
} from "../src/validators.js";
import { computeBlockContentHash } from "../src/hash.js";
import type { Artifact, CommitmentBlock } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock(overrides: Partial<CommitmentBlock> = {}): CommitmentBlock {
  const block: CommitmentBlock = {
    block_id: "b_test_001",
    type: "invariant",
    text: "All entries must pass quarantine.",
    status: "draft",
    content_hash: "",
    ...overrides,
  };
  block.content_hash = computeBlockContentHash(block);
  return block;
}

function makeArtifact(): Artifact {
  return {
    artifact_id: "arch_001",
    artifact_type: "ArchitectureDraft",
    schema_version: "architecture_draft@0.1.0",
    revision_id: "rev_001",
    sections: [
      {
        section_id: "sec_01",
        title: "Core",
        commitments: [makeBlock()],
      },
    ],
    metadata: {},
  };
}

function makeValidIssueJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    issue_id: "issue_001",
    artifact_id: "arch_001",
    base_revision_id: "rev_001",
    target_block_id: "b_test_001",
    issue_type: "unsafe_canonical_commit",
    severity: "high",
    message: "Canonical writes must not happen instantly.",
    schema_version: "issue@0.1.0",
    ...overrides,
  });
}

// ===========================================================================
// G-01: Schema Gate
// ===========================================================================

describe("G-01: Schema Gate", () => {
  it("passes valid issue", () => {
    const data = JSON.parse(makeValidIssueJson());
    const result = schemaGate(data);
    expect(result.passed).toBe(true);
    expect(result.gate).toBe("schema_gate");
  });

  it("fails invalid object", () => {
    const result = schemaGate({ schema_version: "issue@0.1.0" });
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("fails object without schema_version", () => {
    const result = schemaGate({ issue_id: "test" });
    expect(result.passed).toBe(false);
  });
});

// ===========================================================================
// G-02: Source Reference Gate
// ===========================================================================

describe("G-02: Source Reference Gate", () => {
  it("passes when target_block_id exists in artifact", () => {
    const data = { target_block_id: "b_test_001" };
    const result = sourceReferenceGate(data, makeArtifact());
    expect(result.passed).toBe(true);
  });

  it("fails when target_block_id does not exist", () => {
    const data = { target_block_id: "b_nonexistent" };
    const result = sourceReferenceGate(data, makeArtifact());
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("b_nonexistent");
  });

  it("checks operations[].target_block_id", () => {
    const data = {
      operations: [
        { target_block_id: "b_test_001" },
        { target_block_id: "b_ghost" },
      ],
    };
    const result = sourceReferenceGate(data, makeArtifact());
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("b_ghost");
  });

  it("passes when no artifact provided (skip check)", () => {
    const data = { target_block_id: "b_anything" };
    const result = sourceReferenceGate(data, null);
    expect(result.passed).toBe(true);
  });
});

// ===========================================================================
// G-03: Capability Gate
// ===========================================================================

describe("G-03: Capability Gate", () => {
  it("passes L1 skill producing Issue to quarantine", () => {
    const result = capabilityGate("document_linter", "Issue", "quarantine");
    expect(result.passed).toBe(true);
  });

  it("fails L1 skill trying to produce PatchProposal", () => {
    const result = capabilityGate(
      "document_linter",
      "PatchProposal",
      "quarantine"
    );
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("not allowed to produce");
  });

  it("fails L1 skill trying to write to canonical", () => {
    const result = capabilityGate("document_linter", "Issue", "canonical");
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("forbidden");
  });

  it("passes L2 skill producing PatchProposal to quarantine", () => {
    const result = capabilityGate(
      "blue_patch_agent",
      "PatchProposal",
      "quarantine"
    );
    expect(result.passed).toBe(true);
  });

  it("fails L2 skill trying to commit", () => {
    const result = capabilityGate(
      "blue_patch_agent",
      "PatchProposal",
      "commit"
    );
    expect(result.passed).toBe(false);
  });

  it("fails unknown skill", () => {
    const result = capabilityGate("unknown_skill", "Issue", "quarantine");
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("Unknown skill");
  });
});

// ===========================================================================
// G-04: Type-Specific Invariant Gate
// ===========================================================================

describe("G-04: Type-Specific Invariant Gate", () => {
  it("passes valid Issue", () => {
    const data = JSON.parse(makeValidIssueJson());
    const result = typeSpecificInvariantGate(data, "Issue", makeArtifact());
    expect(result.passed).toBe(true);
  });

  it("fails Issue with missing issue_id", () => {
    const data = JSON.parse(makeValidIssueJson({ issue_id: undefined }));
    delete data.issue_id;
    const result = typeSpecificInvariantGate(data, "Issue", makeArtifact());
    expect(result.passed).toBe(false);
  });

  it("fails Issue with wrong base_revision_id", () => {
    const data = JSON.parse(
      makeValidIssueJson({ base_revision_id: "rev_wrong" })
    );
    const result = typeSpecificInvariantGate(data, "Issue", makeArtifact());
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("base_revision_id");
  });

  it("fails Issue with invalid severity", () => {
    const data = JSON.parse(makeValidIssueJson({ severity: "catastrophic" }));
    const result = typeSpecificInvariantGate(data, "Issue", null);
    expect(result.passed).toBe(false);
  });

  it("passes valid PatchProposal", () => {
    const data = {
      source_issue_ids: ["issue_001"],
      operations: [
        { replacement_text: "New text here." },
      ],
    };
    const result = typeSpecificInvariantGate(data, "PatchProposal", null);
    expect(result.passed).toBe(true);
  });

  it("fails PatchProposal with empty source_issue_ids", () => {
    const data = {
      source_issue_ids: [],
      operations: [{ replacement_text: "New text." }],
    };
    const result = typeSpecificInvariantGate(data, "PatchProposal", null);
    expect(result.passed).toBe(false);
  });
});

// ===========================================================================
// Full validation pipeline  – ref: §9.1
// ===========================================================================

describe("validateSkillOutput", () => {
  it("§18-#5: validates issue through full pipeline", () => {
    const json = makeValidIssueJson();
    const result = validateSkillOutput(
      json,
      "document_linter",
      "Issue",
      "quarantine",
      makeArtifact()
    );
    expect(result.status).toBe("validated");
    expect(result.gates.length).toBe(4);
    expect(result.gates.every((g) => g.passed)).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = validateSkillOutput(
      "not json{{{",
      "document_linter",
      "Issue",
      "quarantine",
      null
    );
    expect(result.status).toBe("rejected");
    expect(result.gates[0].gate).toBe("json_parse");
  });

  it("rejects when capability gate fails", () => {
    const json = makeValidIssueJson();
    const result = validateSkillOutput(
      json,
      "document_linter",
      "PatchProposal", // L1 can't produce this
      "quarantine",
      makeArtifact()
    );
    expect(result.status).toBe("rejected");
    expect(result.errors.some((e) => e.includes("not allowed to produce"))).toBe(
      true
    );
  });

  it("rejects when source reference fails", () => {
    const json = makeValidIssueJson({ target_block_id: "b_nonexistent" });
    const result = validateSkillOutput(
      json,
      "document_linter",
      "Issue",
      "quarantine",
      makeArtifact()
    );
    expect(result.status).toBe("rejected");
    expect(
      result.errors.some((e) => e.includes("b_nonexistent"))
    ).toBe(true);
  });

  it("collects errors from all failing gates", () => {
    // Issue with wrong base_revision_id AND wrong target_block_id
    const json = makeValidIssueJson({
      base_revision_id: "rev_wrong",
      target_block_id: "b_ghost",
    });
    const result = validateSkillOutput(
      json,
      "document_linter",
      "Issue",
      "quarantine",
      makeArtifact()
    );
    expect(result.status).toBe("rejected");
    // Should have errors from both G-02 (source ref) and G-04 (invariant)
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// getSkillCapability
// ===========================================================================

describe("getSkillCapability", () => {
  it("returns capability for known skill", () => {
    const cap = getSkillCapability("document_linter");
    expect(cap).toBeDefined();
    expect(cap!.level).toBe("L1");
  });

  it("returns undefined for unknown skill", () => {
    expect(getSkillCapability("unknown")).toBeUndefined();
  });
});
