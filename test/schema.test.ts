/**
 * Schema Registry – Test Suite
 *
 * ref: 执行宪法 v0.2 §17 Day 2 测试要求
 *
 * Tests:
 *   1. 老 revision 用自己的 schema 读取
 *   2. 新写入必须过 current schema
 *   3. 未知 schema_version 失败
 */

import { describe, it, expect } from "vitest";
import {
  validateForWrite,
  validateForRead,
  getSchema,
  getCurrentVersion,
  findMigration,
  registerMigration,
  schemaRegistry,
  currentVersions,
} from "../src/schemaRegistry.js";
import { computeBlockContentHash } from "../src/hash.js";
import type { CommitmentBlock } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidArtifact(overrides: Record<string, unknown> = {}) {
  const block: CommitmentBlock = {
    block_id: "b_test_001",
    type: "invariant",
    text: "All entries must pass quarantine.",
    rationale: "Safety first.",
    terms: ["quarantine"],
    status: "draft",
    content_hash: "",
  };
  block.content_hash = computeBlockContentHash(block);

  return {
    artifact_id: "arch_001",
    artifact_type: "ArchitectureDraft",
    schema_version: "architecture_draft@0.1.0",
    revision_id: "rev_001",
    sections: [
      {
        section_id: "sec_01",
        title: "Core Layer",
        commitments: [block],
      },
    ],
    metadata: {
      created_by: "test",
      created_at: "2026-04-25T00:00:00Z",
    },
    ...overrides,
  };
}

function makeValidIssue(overrides: Record<string, unknown> = {}) {
  return {
    issue_id: "issue_001",
    artifact_id: "arch_001",
    base_revision_id: "rev_001",
    target_block_id: "b_test_001",
    issue_type: "unsafe_canonical_commit",
    severity: "high",
    message: "Canonical writes must not happen instantly.",
    schema_version: "issue@0.1.0",
    ...overrides,
  };
}

function makeValidPatchProposal(overrides: Record<string, unknown> = {}) {
  return {
    proposal_id: "proposal_001",
    artifact_id: "arch_001",
    base_revision_id: "rev_001",
    source_issue_ids: ["issue_001"],
    operations: [
      {
        op: "replace_block",
        target_block_id: "b_test_001",
        replacement_text: "Entries must pass quarantine before commit.",
      },
    ],
    schema_version: "patch_proposal@0.1.0",
    ...overrides,
  };
}

function makeValidOverridePatch(overrides: Record<string, unknown> = {}) {
  return {
    override_id: "ovr_001",
    artifact_id: "arch_001",
    base_revision_id: "rev_001",
    override_type: "accept_with_known_risk",
    operator: { type: "human", id: "operator_001" },
    failed_gates: ["undefined_term"],
    affected_issue_ids: ["issue_001"],
    rationale: "Accepted for MVP.",
    risk_acceptance: {
      accepted_risks: ["Undefined term"],
      mitigation_plan: "Add glossary later.",
    },
    timestamp: "2026-04-25T00:00:00Z",
    schema_version: "override_patch@0.1.0",
    ...overrides,
  };
}

// ===========================================================================
// Schema Registry structure
// ===========================================================================

describe("schemaRegistry", () => {
  it("contains all four schema versions", () => {
    expect(schemaRegistry).toHaveProperty("architecture_draft@0.1.0");
    expect(schemaRegistry).toHaveProperty("issue@0.1.0");
    expect(schemaRegistry).toHaveProperty("patch_proposal@0.1.0");
    expect(schemaRegistry).toHaveProperty("override_patch@0.1.0");
  });

  it("currentVersions maps all four types", () => {
    expect(currentVersions).toHaveProperty("architecture_draft");
    expect(currentVersions).toHaveProperty("issue");
    expect(currentVersions).toHaveProperty("patch_proposal");
    expect(currentVersions).toHaveProperty("override_patch");
  });
});

// ===========================================================================
// getSchema / getCurrentVersion
// ===========================================================================

describe("getSchema", () => {
  it("returns schema for known version", () => {
    expect(getSchema("architecture_draft@0.1.0")).toBeDefined();
  });

  it("returns undefined for unknown version", () => {
    expect(getSchema("architecture_draft@9.9.9")).toBeUndefined();
  });
});

describe("getCurrentVersion", () => {
  it("returns version for known type", () => {
    expect(getCurrentVersion("architecture_draft")).toBe(
      "architecture_draft@0.1.0"
    );
  });

  it("returns undefined for unknown type", () => {
    expect(getCurrentVersion("unknown_type")).toBeUndefined();
  });
});

// ===========================================================================
// validateForWrite – ref: S-02 "Write path strict"
// ===========================================================================

describe("validateForWrite", () => {
  it("accepts valid architecture draft with current schema", () => {
    const result = validateForWrite("architecture_draft", makeValidArtifact());
    expect(result.valid).toBe(true);
  });

  it("accepts valid issue with current schema", () => {
    const result = validateForWrite("issue", makeValidIssue());
    expect(result.valid).toBe(true);
  });

  it("accepts valid patch proposal with current schema", () => {
    const result = validateForWrite("patch_proposal", makeValidPatchProposal());
    expect(result.valid).toBe(true);
  });

  it("accepts valid override patch with current schema", () => {
    const result = validateForWrite("override_patch", makeValidOverridePatch());
    expect(result.valid).toBe(true);
  });

  it("Day2-Test-2: rejects write with non-current schema_version", () => {
    const oldData = makeValidArtifact({
      schema_version: "architecture_draft@0.0.1",
    });
    const result = validateForWrite("architecture_draft", oldData);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("current schema version");
    }
  });

  it("rejects unknown object type", () => {
    const result = validateForWrite("nonexistent_type", {});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("Unknown object type");
    }
  });

  it("rejects artifact missing required fields", () => {
    const result = validateForWrite("architecture_draft", {
      schema_version: "architecture_draft@0.1.0",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects artifact with empty artifact_id", () => {
    const result = validateForWrite(
      "architecture_draft",
      makeValidArtifact({ artifact_id: "" })
    );
    expect(result.valid).toBe(false);
  });

  it("rejects artifact with invalid artifact_type", () => {
    const result = validateForWrite(
      "architecture_draft",
      makeValidArtifact({ artifact_type: "InvalidType" })
    );
    expect(result.valid).toBe(false);
  });

  it("rejects issue with invalid severity", () => {
    const result = validateForWrite(
      "issue",
      makeValidIssue({ severity: "catastrophic" })
    );
    expect(result.valid).toBe(false);
  });

  it("rejects patch proposal with empty operations", () => {
    const result = validateForWrite(
      "patch_proposal",
      makeValidPatchProposal({ operations: [] })
    );
    expect(result.valid).toBe(false);
  });

  it("rejects patch proposal with replacement_text exceeding 10000 chars", () => {
    const result = validateForWrite(
      "patch_proposal",
      makeValidPatchProposal({
        operations: [
          {
            op: "replace_block",
            target_block_id: "b_test_001",
            replacement_text: "x".repeat(10001),
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  it("rejects override patch with missing rationale", () => {
    const result = validateForWrite(
      "override_patch",
      makeValidOverridePatch({ rationale: "" })
    );
    expect(result.valid).toBe(false);
  });
});

// ===========================================================================
// validateForRead – ref: S-02 "Read path tolerant"
// ===========================================================================

describe("validateForRead", () => {
  it("Day2-Test-1: validates old revision against its own schema_version", () => {
    // This artifact has schema_version "architecture_draft@0.1.0"
    // Even if a newer version existed, it should be validated against 0.1.0
    const artifact = makeValidArtifact();
    const result = validateForRead(artifact);
    expect(result.valid).toBe(true);
  });

  it("Day2-Test-3: rejects unknown schema_version", () => {
    const data = makeValidArtifact({
      schema_version: "architecture_draft@9.9.9",
    });
    const result = validateForRead(data);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("Unknown schema_version");
    }
  });

  it("rejects data without schema_version", () => {
    const data = { artifact_id: "arch_001" };
    const result = validateForRead(data);
    expect(result.valid).toBe(false);
  });

  it("rejects null input", () => {
    const result = validateForRead(null);
    expect(result.valid).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = validateForRead("not an object");
    expect(result.valid).toBe(false);
  });

  it("validates issue against its own schema", () => {
    const result = validateForRead(makeValidIssue());
    expect(result.valid).toBe(true);
  });

  it("validates patch proposal against its own schema", () => {
    const result = validateForRead(makeValidPatchProposal());
    expect(result.valid).toBe(true);
  });

  it("validates override patch against its own schema", () => {
    const result = validateForRead(makeValidOverridePatch());
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// Migration interface – ref: S-04
// ===========================================================================

describe("Migration interface", () => {
  it("findMigration returns undefined when no migration exists", () => {
    const result = findMigration(
      "architecture_draft@0.1.0",
      "architecture_draft@0.2.0"
    );
    expect(result).toBeUndefined();
  });

  it("registerMigration + findMigration round-trip works", () => {
    registerMigration({
      from: "test_type@0.1.0",
      to: "test_type@0.2.0",
      migrate: (input) => ({ ...(input as object), migrated: true }),
    });

    const migration = findMigration("test_type@0.1.0", "test_type@0.2.0");
    expect(migration).toBeDefined();
    expect(migration!.from).toBe("test_type@0.1.0");
    expect(migration!.to).toBe("test_type@0.2.0");

    const result = migration!.migrate({ x: 1 }) as Record<string, unknown>;
    expect(result.migrated).toBe(true);
    expect(result.x).toBe(1);
  });
});
