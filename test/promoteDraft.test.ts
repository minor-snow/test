/**
 * Draft Promotion + Quarantine Isolation — Tests
 *
 * ref: P8 BUG-6 regression tests
 *
 * Verifies:
 *   1. runIdeaToDraft does NOT create canonical pointer
 *   2. runIdeaToDraft does NOT write canonical revision
 *   3. runIdeaToDraft does NOT append canonical audit
 *   4. promoteDraft creates canonical pointer after approval
 *   5. promoteDraft appends "draft_promoted" audit
 *   6. promoteDraft rejects missing quarantine items
 *   7. promoteDraft rejects invalid artifacts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { runIdeaToDraft } from "../src/ideaToDraft.js";
import { promoteDraft } from "../src/promoteDraft.js";
import {
  loadCanonicalPointer,
  loadAuditLog,
  loadCanonicalRevision,
} from "../src/artifactStore.js";
import type { LlmClient } from "../src/trial/llmClient.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return join(tmpdir(), `pantheon_test_promote_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

function mockClient(response: string): LlmClient {
  return { complete: async () => response };
}

const VALID_DRAFT_JSON = JSON.stringify({
  artifact_id: "test_promote_draft",
  artifact_type: "ArchitectureDraft",
  sections: [
    {
      section_id: "sec_core",
      title: "Core Architecture",
      commitments: [
        {
          block_id: "b_001",
          type: "invariant",
          text: "The system stores all events in an append-only log.",
          status: "draft",
        },
        {
          block_id: "b_002",
          type: "mechanism",
          text: "Event ingestion validates each payload against a JSON schema.",
          status: "draft",
        },
      ],
    },
    {
      section_id: "sec_api",
      title: "API Layer",
      commitments: [
        {
          block_id: "b_003",
          type: "interface",
          text: "GET /events returns a paginated list of events sorted by timestamp.",
          status: "draft",
        },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// Tests: Quarantine isolation (BUG-6 regression)
// ---------------------------------------------------------------------------

describe("P8 BUG-6 Regression: ideaToDraft quarantine isolation", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = makeTmpDir();
    await fs.mkdir(dataDir, { recursive: true });
  });

  it("does NOT create canonical pointer", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("success");

    // Canonical pointer must NOT exist
    const pointer = await loadCanonicalPointer(
      { dataDir },
      result.artifact!.artifact_id
    );
    expect(pointer).toBeNull();
  });

  it("does NOT write canonical revision", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("success");

    // No revision file should exist
    const canonical = await loadCanonicalRevision(
      { dataDir },
      result.artifact!.artifact_id
    );
    expect(canonical).toBeNull();
  });

  it("does NOT append canonical audit", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    const result = await runIdeaToDraft("Test idea", client, { dataDir });

    expect(result.status).toBe("success");

    // Audit log should not exist for this artifact
    const audit = await loadAuditLog(
      { dataDir },
      result.artifact!.artifact_id
    );
    expect(audit.length).toBe(0);
  });

  it("saves draft to quarantine directory", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    await runIdeaToDraft("Test idea", client, { dataDir });

    const quarantineDir = join(dataDir, "quarantine");
    const files = await fs.readdir(quarantineDir);
    const draftFiles = files.filter(f => f.startsWith("draft_"));
    expect(draftFiles.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: promoteDraft
// ---------------------------------------------------------------------------

describe("P8: promoteDraft", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = makeTmpDir();
    await fs.mkdir(dataDir, { recursive: true });
  });

  it("promotes quarantined draft to canonical", async () => {
    // Step 1: Create draft in quarantine
    const client = mockClient(VALID_DRAFT_JSON);
    const draftResult = await runIdeaToDraft("Test idea", client, { dataDir });
    expect(draftResult.status).toBe("success");

    // Find the quarantine file
    const quarantineDir = join(dataDir, "quarantine");
    const files = await fs.readdir(quarantineDir);
    const draftFile = files.find(f => f.startsWith("draft_"));
    const quarantineId = draftFile!.replace(".json", "");

    // Before promotion: no canonical
    const beforePointer = await loadCanonicalPointer(
      { dataDir },
      draftResult.artifact!.artifact_id
    );
    expect(beforePointer).toBeNull();

    // Step 2: Promote
    const promoteResult = await promoteDraft({ dataDir }, {
      quarantine_id: quarantineId,
      operator_id: "test_operator",
      rationale: "Draft passes review",
    });

    expect(promoteResult.status).toBe("promoted");
    if (promoteResult.status !== "promoted") return;

    // After promotion: canonical pointer exists
    const afterPointer = await loadCanonicalPointer(
      { dataDir },
      promoteResult.artifact.artifact_id
    );
    expect(afterPointer).not.toBeNull();
    expect(afterPointer!.current_revision_id).toBe(
      promoteResult.canonical_revision_id
    );
  });

  it("appends draft_promoted audit event", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    const draftResult = await runIdeaToDraft("Test idea", client, { dataDir });

    const quarantineDir = join(dataDir, "quarantine");
    const files = await fs.readdir(quarantineDir);
    const quarantineId = files.find(f => f.startsWith("draft_"))!.replace(".json", "");

    await promoteDraft({ dataDir }, {
      quarantine_id: quarantineId,
      operator_id: "test_operator",
      rationale: "Looks good",
    });

    const audit = await loadAuditLog(
      { dataDir },
      draftResult.artifact!.artifact_id
    );
    expect(audit.length).toBe(1);
    expect(audit[0].entry_type).toBe("draft_promoted");
    expect((audit[0].details as any).operator_id).toBe("test_operator");
    expect((audit[0].details as any).rationale).toBe("Looks good");
  });

  it("rejects missing quarantine item", async () => {
    const result = await promoteDraft({ dataDir }, {
      quarantine_id: "nonexistent_draft",
      operator_id: "op",
      rationale: "test",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("not found");
    }
  });

  it("rejects artifact that fails re-validation", async () => {
    // Write an invalid artifact to quarantine manually
    const quarantineDir = join(dataDir, "quarantine");
    await fs.mkdir(quarantineDir, { recursive: true });
    await fs.writeFile(
      join(quarantineDir, "bad_draft.json"),
      // Has artifact_id (passes structural check) but invalid type + empty sections
      JSON.stringify({ artifact_id: "bad_thing", artifact_type: "BadType", sections: [] }),
      "utf8"
    );

    const result = await promoteDraft({ dataDir }, {
      quarantine_id: "bad_draft",
      operator_id: "op",
      rationale: "test",
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toContain("Re-validation failed");
    }
  });

  it("detects collision with existing artifact IDs", async () => {
    const client = mockClient(VALID_DRAFT_JSON);
    await runIdeaToDraft("Test idea", client, { dataDir });

    const quarantineDir = join(dataDir, "quarantine");
    const files = await fs.readdir(quarantineDir);
    const quarantineId = files.find(f => f.startsWith("draft_"))!.replace(".json", "");

    // Promote first time — should succeed
    const first = await promoteDraft({ dataDir }, {
      quarantine_id: quarantineId,
      operator_id: "op",
      rationale: "first",
    });
    expect(first.status).toBe("promoted");

    // Promote again with collision check
    const second = await promoteDraft({ dataDir }, {
      quarantine_id: quarantineId,
      operator_id: "op",
      rationale: "second attempt",
      existing_artifact_ids: ["test_promote_draft"],
    });
    expect(second.status).toBe("rejected");
    if (second.status === "rejected") {
      expect(second.reason).toContain("collision");
    }
  });
});
