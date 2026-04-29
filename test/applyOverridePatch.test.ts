/**
 * Override Patch – Test Suite
 *
 * ref: 执行宪法 v0.2 §14, C-08, §17 Day 6
 * ref: §18 criteria #10 — Human Override generates new revision + updates canonical
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  applyOverridePatch,
  hasNonOverridableGates,
} from "../src/applyOverridePatch.js";
import {
  createArtifact,
  loadCanonicalPointer,
  loadRevision,
  loadAuditLog,
  type StoreConfig,
} from "../src/artifactStore.js";
import { computeBlockContentHash } from "../src/hash.js";
import type {
  Artifact,
  OverridePatch,
  CommitmentBlock,
} from "../src/types.js";

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

const TEST_DATA_DIR = join(process.cwd(), "data", "_test_override_tmp");

let config: StoreConfig;

beforeEach(async () => {
  config = { dataDir: TEST_DATA_DIR };
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
});

afterEach(async () => {
  await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock(overrides: Partial<CommitmentBlock> = {}): CommitmentBlock {
  const block: CommitmentBlock = {
    block_id: "b_mem_001",
    type: "invariant",
    text: "All entries are committed instantly.",
    rationale: "Initial naive design.",
    terms: [],
    status: "draft",
    content_hash: "",
    ...overrides,
  };
  block.content_hash = computeBlockContentHash(block);
  return block;
}

async function createTestArtifact(): Promise<Artifact> {
  return createArtifact(config, {
    artifact_id: "arch_001",
    artifact_type: "ArchitectureDraft",
    schema_version: "architecture_draft@0.1.0",
    revision_id: "rev_placeholder",
    sections: [
      {
        section_id: "sec_memory",
        title: "Memory Layer",
        commitments: [makeBlock()],
      },
    ],
    metadata: { created_by: "test" },
  });
}

function makeOverride(
  artifact: Artifact,
  overrides: Partial<OverridePatch> = {}
): OverridePatch {
  return {
    override_id: "ovr_001",
    artifact_id: artifact.artifact_id,
    base_revision_id: artifact.revision_id,
    override_type: "accept_with_known_risk",
    operator: { type: "human", id: "operator_001" },
    failed_gates: ["undefined_term"],
    affected_issue_ids: ["issue_001"],
    rationale: "Accepted for MVP; glossary to be added.",
    risk_acceptance: {
      accepted_risks: ["Undefined term: quarantine gate"],
      mitigation_plan: "Add glossary definition before implementation.",
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ===========================================================================
// hasNonOverridableGates
// ===========================================================================

describe("hasNonOverridableGates", () => {
  it("identifies non-overridable gates", () => {
    const blocked = hasNonOverridableGates([
      "undefined_term",
      "schema_gate",
      "constraint_deletion",
    ]);
    expect(blocked).toEqual(["schema_gate"]);
  });

  it("returns empty for all-overridable gates", () => {
    const blocked = hasNonOverridableGates([
      "undefined_term",
      "constraint_deletion",
    ]);
    expect(blocked).toEqual([]);
  });

  it("catches multiple non-overridable gates", () => {
    const blocked = hasNonOverridableGates([
      "schema_gate",
      "json_parse",
      "expected_old_hash_match",
    ]);
    expect(blocked.length).toBe(3);
  });
});

// ===========================================================================
// applyOverridePatch – accept_with_known_risk
// ===========================================================================

describe("applyOverridePatch – accept_with_known_risk", () => {
  it("§18-#10: generates new revision and updates canonical", async () => {
    const artifact = await createTestArtifact();
    const override = makeOverride(artifact);

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("applied");

    if (result.status === "applied") {
      // New revision exists
      expect(result.new_revision.revision_id).not.toBe(artifact.revision_id);
      expect(result.new_revision.parent_revision_id).toBe(
        artifact.revision_id
      );

      // Canonical pointer updated
      const pointer = await loadCanonicalPointer(config, "arch_001");
      expect(pointer!.current_revision_id).toBe(
        result.new_revision.revision_id
      );

      // New revision loadable
      const loaded = await loadRevision(
        config,
        "arch_001",
        result.new_revision.revision_id
      );
      expect(loaded).not.toBeNull();
    }
  });

  it("creates audit entry with override details", async () => {
    const artifact = await createTestArtifact();
    const override = makeOverride(artifact);
    await applyOverridePatch(config, artifact, override);

    const log = await loadAuditLog(config, "arch_001");
    // First entry is artifact_created, second is override_applied
    const overrideEntry = log.find((e) => e.entry_type === "override_applied");
    expect(overrideEntry).toBeDefined();
    expect(overrideEntry!.details).toHaveProperty("override_id", "ovr_001");
    expect(overrideEntry!.details).toHaveProperty(
      "override_type",
      "accept_with_known_risk"
    );
    expect(overrideEntry!.details).toHaveProperty("rationale");
    expect(overrideEntry!.details).toHaveProperty("risk_acceptance");
    expect(overrideEntry!.details).toHaveProperty("failed_gates");
  });
});

// ===========================================================================
// applyOverridePatch – defer_issue
// ===========================================================================

describe("applyOverridePatch – defer_issue", () => {
  it("creates revision for deferred issue", async () => {
    const artifact = await createTestArtifact();
    const override = makeOverride(artifact, {
      override_type: "defer_issue",
      rationale: "Not critical for MVP, deferring to next sprint.",
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("applied");

    if (result.status === "applied") {
      expect(result.audit_entry.details).toHaveProperty(
        "override_type",
        "defer_issue"
      );
    }
  });
});

// ===========================================================================
// applyOverridePatch – manual_replace_block
// ===========================================================================

describe("applyOverridePatch – manual_replace_block", () => {
  it("applies human-specified block replacement", async () => {
    const artifact = await createTestArtifact();

    const newBlock = makeBlock({
      text: "Entries must pass quarantine gate before canonical commit.",
    });

    const override = makeOverride(artifact, {
      override_type: "manual_replace_block",
      operations: [
        {
          op: "replace_block",
          target_block_id: "b_mem_001",
          expected_old_hash:
            artifact.sections[0].commitments[0].content_hash,
          new_block: newBlock,
        },
      ],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("applied");

    if (result.status === "applied") {
      expect(result.new_revision.sections[0].commitments[0].text).toBe(
        "Entries must pass quarantine gate before canonical commit."
      );
    }
  });

  it("rejects manual_replace_block with no operations", async () => {
    const artifact = await createTestArtifact();
    const override = makeOverride(artifact, {
      override_type: "manual_replace_block",
      operations: [],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("rejected");
  });
});

// ===========================================================================
// HARD-001: manual_replace_block mechanical integrity
// ===========================================================================

describe("HARD-001: manual_replace_block mechanical integrity", () => {
  it("rejects when target_block_id does not exist", async () => {
    const artifact = await createTestArtifact();

    const newBlock = makeBlock({
      block_id: "b_ghost",
      text: "This targets a non-existent block.",
    });

    const override = makeOverride(artifact, {
      override_type: "manual_replace_block",
      operations: [
        {
          op: "replace_block",
          target_block_id: "b_ghost",
          expected_old_hash: "sha256:whatever",
          new_block: newBlock,
        },
      ],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("b_ghost");
      expect(result.reason).toContain("does not exist");
      expect(result.reason).toContain("mechanical integrity");
    }
  });

  it("rejects when expected_old_hash does not match", async () => {
    const artifact = await createTestArtifact();

    const newBlock = makeBlock({
      text: "Updated text.",
    });

    const override = makeOverride(artifact, {
      override_type: "manual_replace_block",
      operations: [
        {
          op: "replace_block",
          target_block_id: "b_mem_001",
          expected_old_hash: "sha256:stale_or_tampered_hash",
          new_block: newBlock,
        },
      ],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("expected_old_hash mismatch");
      expect(result.reason).toContain("sha256:stale_or_tampered_hash");
      expect(result.reason).toContain("mechanical integrity");
    }
  });

  it("rejects when new_block.block_id !== target_block_id", async () => {
    const artifact = await createTestArtifact();

    // new_block has block_id "b_sneaky" but targets "b_mem_001"
    const newBlock = makeBlock({
      block_id: "b_sneaky",
      text: "Trying to substitute block ID.",
    });

    const override = makeOverride(artifact, {
      override_type: "manual_replace_block",
      operations: [
        {
          op: "replace_block",
          target_block_id: "b_mem_001",
          expected_old_hash:
            artifact.sections[0].commitments[0].content_hash,
          new_block: newBlock,
        },
      ],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("b_sneaky");
      expect(result.reason).toContain("b_mem_001");
      expect(result.reason).toContain("Block ID substitution is forbidden");
    }
  });

  it("rejects duplicate target_block_id in same override", async () => {
    const artifact = await createTestArtifact();

    const newBlock1 = makeBlock({ text: "First replacement." });
    const newBlock2 = makeBlock({ text: "Second replacement for same block." });

    const override = makeOverride(artifact, {
      override_type: "manual_replace_block",
      operations: [
        {
          op: "replace_block",
          target_block_id: "b_mem_001",
          expected_old_hash:
            artifact.sections[0].commitments[0].content_hash,
          new_block: newBlock1,
        },
        {
          op: "replace_block",
          target_block_id: "b_mem_001",
          expected_old_hash:
            artifact.sections[0].commitments[0].content_hash,
          new_block: newBlock2,
        },
      ],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("Duplicate target_block_id");
      expect(result.reason).toContain("b_mem_001");
    }
  });

  it("still passes valid manual_replace_block after hardening", async () => {
    // Regression: existing happy-path must still work
    const artifact = await createTestArtifact();

    const newBlock = makeBlock({
      text: "Properly updated text.",
    });

    const override = makeOverride(artifact, {
      override_type: "manual_replace_block",
      operations: [
        {
          op: "replace_block",
          target_block_id: "b_mem_001",
          expected_old_hash:
            artifact.sections[0].commitments[0].content_hash,
          new_block: newBlock,
        },
      ],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      expect(result.new_revision.sections[0].commitments[0].text).toBe(
        "Properly updated text."
      );
    }
  });
});

// ===========================================================================
// Rejection cases
// ===========================================================================

describe("applyOverridePatch – rejections", () => {
  it("rejects override of non-overridable gates (ref: C-08)", async () => {
    const artifact = await createTestArtifact();
    const override = makeOverride(artifact, {
      failed_gates: ["schema_gate", "undefined_term"],
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("mechanical integrity");
      expect(result.reason).toContain("schema_gate");
    }
  });

  it("rejects when base_revision_id doesn't match", async () => {
    const artifact = await createTestArtifact();
    const override = makeOverride(artifact, {
      base_revision_id: "rev_wrong",
    });

    const result = await applyOverridePatch(config, artifact, override);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("base_revision_id");
    }
  });
});

// ===========================================================================
// Parent chain integrity
// ===========================================================================

describe("revision chain integrity", () => {
  it("maintains parent chain through multiple overrides", async () => {
    const artifact = await createTestArtifact();
    const rev0 = artifact.revision_id;

    // First override
    const override1 = makeOverride(artifact, {
      override_id: "ovr_001",
    });
    const result1 = await applyOverridePatch(config, artifact, override1);
    expect(result1.status).toBe("applied");

    if (result1.status !== "applied") return;
    const rev1 = result1.new_revision.revision_id;

    // Second override (based on first override's revision)
    const override2 = makeOverride(result1.new_revision, {
      override_id: "ovr_002",
    });
    const result2 = await applyOverridePatch(
      config,
      result1.new_revision,
      override2
    );
    expect(result2.status).toBe("applied");

    if (result2.status !== "applied") return;
    const rev2 = result2.new_revision.revision_id;

    // Verify chain: rev2.parent = rev1, rev1.parent = rev0
    expect(result2.new_revision.parent_revision_id).toBe(rev1);
    expect(result1.new_revision.parent_revision_id).toBe(rev0);

    // All three revisions are different
    expect(new Set([rev0, rev1, rev2]).size).toBe(3);

    // All loadable
    expect(await loadRevision(config, "arch_001", rev0)).not.toBeNull();
    expect(await loadRevision(config, "arch_001", rev1)).not.toBeNull();
    expect(await loadRevision(config, "arch_001", rev2)).not.toBeNull();

    // Canonical points to latest
    const pointer = await loadCanonicalPointer(config, "arch_001");
    expect(pointer!.current_revision_id).toBe(rev2);
  });
});
