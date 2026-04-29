/**
 * Draft Validator — Tests
 *
 * ref: P8-001
 */

import { describe, it, expect } from "vitest";
import { validateDraft, type DraftValidationResult } from "../src/draftValidator.js";
import { computeBlockContentHash } from "../src/hash.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validDraft(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    artifact_id: "test_draft",
    artifact_type: "ArchitectureDraft",
    sections: [
      {
        section_id: "sec_core",
        title: "Core Architecture",
        commitments: [
          {
            block_id: "b_001",
            type: "invariant",
            text: "The system must store all data in a single SQLite database.",
            status: "draft",
            terms: ["sqlite"],
          },
          {
            block_id: "b_002",
            type: "mechanism",
            text: "The API gateway validates all incoming requests against a JSON schema.",
            status: "draft",
          },
        ],
      },
      {
        section_id: "sec_security",
        title: "Security Constraints",
        commitments: [
          {
            block_id: "b_003",
            type: "constraint",
            text: "All API endpoints require authentication via JWT tokens.",
            status: "draft",
          },
        ],
      },
    ],
    ...overrides,
  };
}

function expectRejected(result: DraftValidationResult, errorSubstring: string) {
  expect(result.status).toBe("rejected");
  if (result.status === "rejected") {
    const hasError = result.errors.some(e => e.includes(errorSubstring));
    expect(hasError, `Expected error containing "${errorSubstring}" in: ${JSON.stringify(result.errors)}`).toBe(true);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("P8-001: DraftValidator", () => {
  // Check 1
  it("rejects non-object input", () => {
    expectRejected(validateDraft(null), "not_an_object");
    expectRejected(validateDraft("string"), "not_an_object");
    expectRejected(validateDraft([1, 2]), "not_an_object");
    expectRejected(validateDraft(42), "not_an_object");
  });

  // Check 2
  it("rejects invalid artifact_type", () => {
    expectRejected(validateDraft(validDraft({ artifact_type: "BadType" })), "invalid_artifact_type");
    expectRejected(validateDraft(validDraft({ artifact_type: undefined })), "invalid_artifact_type");
  });

  // Check 3
  it("warns about wrong schema_version and host overrides", () => {
    const result = validateDraft(validDraft({ schema_version: "wrong@1.0" }));
    expect(result.status).toBe("accepted");
    expect(result.warnings.some(w => w.includes("schema_version_override"))).toBe(true);
    if (result.status === "accepted") {
      expect(result.artifact.schema_version).toBe("architecture_draft@0.1.0");
    }
  });

  // Check 4
  it("rejects missing artifact_id", () => {
    expectRejected(validateDraft(validDraft({ artifact_id: "" })), "missing_artifact_id");
    expectRejected(validateDraft(validDraft({ artifact_id: undefined })), "missing_artifact_id");
  });

  it("rejects invalid artifact_id format", () => {
    expectRejected(validateDraft(validDraft({ artifact_id: "Bad-Name" })), "invalid_artifact_id");
    expectRejected(validateDraft(validDraft({ artifact_id: "ab" })), "invalid_artifact_id");
    expectRejected(validateDraft(validDraft({ artifact_id: "123start" })), "invalid_artifact_id");
  });

  // Check 5
  it("rejects artifact_id collision", () => {
    expectRejected(
      validateDraft(validDraft(), ["test_draft", "other_artifact"]),
      "artifact_id_collision"
    );
  });

  // Check 6
  it("rejects empty sections", () => {
    expectRejected(validateDraft(validDraft({ sections: [] })), "empty_sections");
    expectRejected(validateDraft(validDraft({ sections: "not_array" })), "empty_sections");
  });

  // Check 7
  it("rejects duplicate section_id", () => {
    const draft = validDraft();
    (draft.sections as any[])[1].section_id = "sec_core"; // dup
    expectRejected(validateDraft(draft), "duplicate_section_id");
  });

  // Check 8
  it("rejects missing section title", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].title = "";
    expectRejected(validateDraft(draft), "missing_section_title");
  });

  // Check 9
  it("rejects section with no blocks", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].commitments = [];
    expectRejected(validateDraft(draft), "empty_section");
  });

  // Check 10
  it("rejects duplicate block_id", () => {
    const draft = validDraft();
    (draft.sections as any[])[1].commitments[0].block_id = "b_001"; // dup
    expectRejected(validateDraft(draft), "duplicate_block_id");
  });

  // Check 11
  it("rejects invalid block type", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].commitments[0].type = "invalid_type";
    expectRejected(validateDraft(draft), "invalid_block_type");
  });

  // Check 12
  it("rejects empty block text", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].commitments[0].text = "";
    expectRejected(validateDraft(draft), "empty_block_text");
  });

  // Check 13
  it("rejects invalid initial status", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].commitments[0].status = "approved";
    expectRejected(validateDraft(draft), "invalid_initial_status");
  });

  // Check 14
  it("warns about LLM-provided revision_id", () => {
    const result = validateDraft(validDraft({ revision_id: "rev_llm_fake" }));
    expect(result.status).toBe("accepted");
    expect(result.warnings.some(w => w.includes("revision_id_override"))).toBe(true);
  });

  // Valid draft accepted and finalized
  it("accepts valid draft and finalizes with host hashes", () => {
    const result = validateDraft(validDraft());
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") return;

    const artifact = result.artifact;

    // Host-generated fields
    expect(artifact.revision_id).toMatch(/^rev_/);
    expect(artifact.schema_version).toBe("architecture_draft@0.1.0");
    expect(artifact.metadata.created_by).toBe("draft_agent");
    expect(artifact.metadata.created_at).toBeTruthy();

    // All content_hash values recomputed by host
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        expect(block.content_hash).toBe(computeBlockContentHash(block));
        expect(block.content_hash).toMatch(/^sha256:/);
      }
    }

    // Structure preserved
    expect(artifact.sections.length).toBe(2);
    expect(artifact.sections[0].commitments.length).toBe(2);
    expect(artifact.sections[1].commitments.length).toBe(1);
  });

  // Deterministic
  it("produces deterministic output for same input", () => {
    const r1 = validateDraft(validDraft());
    const r2 = validateDraft(validDraft());
    if (r1.status !== "accepted" || r2.status !== "accepted") return;
    // revision_id depends on content which is identical
    expect(r1.artifact.revision_id).toBe(r2.artifact.revision_id);
    // All hashes match
    const hashes1 = r1.artifact.sections.flatMap(s => s.commitments.map(b => b.content_hash));
    const hashes2 = r2.artifact.sections.flatMap(s => s.commitments.map(b => b.content_hash));
    expect(hashes1).toEqual(hashes2);
  });

  // LLM-provided content_hash is never trusted
  it("overwrites LLM-provided content_hash", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].commitments[0].content_hash = "sha256:fake_hash_from_llm";
    const result = validateDraft(draft);
    expect(result.status).toBe("accepted");
    if (result.status !== "accepted") return;
    const block = result.artifact.sections[0].commitments[0];
    expect(block.content_hash).not.toBe("sha256:fake_hash_from_llm");
    expect(block.content_hash).toBe(computeBlockContentHash(block));
  });

  // Collision check works with empty existing list
  it("accepts when no collision exists", () => {
    const result = validateDraft(validDraft(), ["other_artifact"]);
    expect(result.status).toBe("accepted");
  });

  // Check 15: cross-artifact links are accepted (validated later by crossArtifactLinter)
  it("accepts draft with cross-artifact linked_architecture_blocks", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].commitments[0].linked_architecture_blocks = ["nonexistent_block_99"];
    const result = validateDraft(draft);
    // Cross-artifact refs are not validated here — they pass through
    expect(result.status).toBe("accepted");
  });

  it("accepts draft with cross-artifact linked_interface_blocks", () => {
    const draft = validDraft();
    (draft.sections as any[])[0].commitments[0].linked_interface_blocks = ["nonexistent_iface_99"];
    const result = validateDraft(draft);
    expect(result.status).toBe("accepted");
  });

  it("warns when linked_* fields reference blocks within the same artifact", () => {
    const draft = validDraft();
    // b_002 exists in the same artifact — unusual for cross-artifact link fields
    (draft.sections as any[])[0].commitments[0].linked_architecture_blocks = ["b_002"];
    const result = validateDraft(draft);
    expect(result.status).toBe("accepted");
    if (result.status === "accepted") {
      expect(result.warnings.some(w => w.includes("internal_self_link"))).toBe(true);
    }
  });

  it("accepts internal links without dangling error", () => {
    const draft = validDraft();
    // b_003 exists in sec_security — valid internal reference
    (draft.sections as any[])[0].commitments[0].linked_architecture_blocks = ["b_003"];
    const result = validateDraft(draft);
    // Should not be rejected (internal ref exists, but warned as self-link)
    expect(result.status).toBe("accepted");
  });
});
