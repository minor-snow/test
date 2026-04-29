/**
 * Deterministic Linter – Test Suite
 *
 * ref: 执行宪法 v0.2 §17 Day 4
 * ref: §18 criteria #4, #5
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lintArtifact,
  lintBlockWithRule,
  collectDefinedTerms,
  extractPotentialTerms,
  resetIssueCounter,
  type LinterContext,
} from "../src/linter.js";
import { computeBlockContentHash } from "../src/hash.js";
import type { Artifact, CommitmentBlock } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetIssueCounter();
});

function makeBlock(overrides: Partial<CommitmentBlock> = {}): CommitmentBlock {
  const block: CommitmentBlock = {
    block_id: "b_test_001",
    type: "invariant",
    text: "This is a valid block text.",
    rationale: "Test rationale.",
    terms: ["quarantine"],
    status: "draft",
    content_hash: "",
    ...overrides,
  };
  block.content_hash = computeBlockContentHash(block);
  return block;
}

function makeArtifact(blocks: CommitmentBlock[]): Artifact {
  return {
    artifact_id: "arch_001",
    artifact_type: "ArchitectureDraft",
    schema_version: "architecture_draft@0.1.0",
    revision_id: "rev_001",
    sections: [
      {
        section_id: "sec_01",
        title: "Test Section",
        commitments: blocks,
      },
    ],
    metadata: {},
  };
}

function makeCtx(artifact: Artifact): LinterContext {
  const allBlocks: { block: CommitmentBlock; section_id: string }[] = [];
  for (const section of artifact.sections) {
    for (const block of section.commitments) {
      allBlocks.push({ block, section_id: section.section_id });
    }
  }
  return {
    artifact_id: artifact.artifact_id,
    base_revision_id: artifact.revision_id,
    artifact_type: artifact.artifact_type,
    definedTerms: collectDefinedTerms(artifact),
    allBlocks,
  };
}

// ===========================================================================
// Term extraction
// ===========================================================================

describe("collectDefinedTerms", () => {
  it("collects terms from all blocks", () => {
    const artifact = makeArtifact([
      makeBlock({ terms: ["quarantine", "canonical"] }),
      makeBlock({ block_id: "b_002", terms: ["evidence", "audit"] }),
    ]);

    const terms = collectDefinedTerms(artifact);
    expect(terms.has("quarantine")).toBe(true);
    expect(terms.has("canonical")).toBe(true);
    expect(terms.has("evidence")).toBe(true);
    expect(terms.has("audit")).toBe(true);
  });

  it("handles blocks without terms", () => {
    const artifact = makeArtifact([
      makeBlock({ terms: undefined }),
    ]);
    const terms = collectDefinedTerms(artifact);
    expect(terms.size).toBe(0);
  });

  it("normalizes to lowercase", () => {
    const artifact = makeArtifact([
      makeBlock({ terms: ["Quarantine", "CANONICAL"] }),
    ]);
    const terms = collectDefinedTerms(artifact);
    expect(terms.has("quarantine")).toBe(true);
    expect(terms.has("canonical")).toBe(true);
  });
});

describe("extractPotentialTerms", () => {
  it("extracts backtick-quoted terms", () => {
    const terms = extractPotentialTerms("Must pass `quarantine gate` first.");
    expect(terms).toContain("quarantine gate");
  });

  it("extracts snake_case tokens", () => {
    const terms = extractPotentialTerms("The quarantine_gate is required.");
    expect(terms).toContain("quarantine_gate");
  });

  it("extracts camelCase tokens", () => {
    const terms = extractPotentialTerms("Call applyPatch before commit.");
    expect(terms).toContain("applypatch");
  });

  it("deduplicates terms", () => {
    const terms = extractPotentialTerms(
      "`quarantine_gate` and quarantine_gate again"
    );
    const count = terms.filter((t) => t === "quarantine_gate").length;
    expect(count).toBe(1);
  });

  it("returns empty array for plain text", () => {
    const terms = extractPotentialTerms("This is plain English text.");
    expect(terms).toEqual([]);
  });
});

// ===========================================================================
// Rule 1: unsafe_canonical_commit
// ===========================================================================

describe("Rule: unsafe_canonical_commit", () => {
  it('detects "instantly committed"', () => {
    const block = makeBlock({
      text: "All entries are instantly committed.",
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("unsafe_canonical_commit", block, ctx);

    expect(issues.length).toBe(1);
    expect(issues[0].issue_type).toBe("unsafe_canonical_commit");
    expect(issues[0].severity).toBe("high");
    expect(issues[0].target_block_id).toBe("b_test_001");
  });

  it('detects "committed instantly" (reversed order)', () => {
    const block = makeBlock({
      text: "Data is committed instantly to the store.",
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("unsafe_canonical_commit", block, ctx);
    expect(issues.length).toBe(1);
  });

  it("case-insensitive", () => {
    const block = makeBlock({
      text: "All entries are INSTANTLY COMMITTED.",
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("unsafe_canonical_commit", block, ctx);
    expect(issues.length).toBe(1);
  });

  it("no issue for safe text", () => {
    const block = makeBlock({
      text: "Entries must pass quarantine before canonical commit.",
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("unsafe_canonical_commit", block, ctx);
    expect(issues.length).toBe(0);
  });
});

// ===========================================================================
// Rule 2: undefined_term
// ===========================================================================

describe("Rule: undefined_term", () => {
  it("flags undefined backtick terms", () => {
    const block = makeBlock({
      text: "Must pass `quarantine gate` first.",
      terms: ["quarantine"],
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("undefined_term", block, ctx);

    expect(issues.length).toBe(1);
    expect(issues[0].issue_type).toBe("undefined_term");
    expect(issues[0].message).toContain("quarantine gate");
  });

  it("no issue when term is defined", () => {
    const block = makeBlock({
      text: "Must pass `quarantine` first.",
      terms: ["quarantine"],
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("undefined_term", block, ctx);
    expect(issues.length).toBe(0);
  });

  it("flags snake_case undefined terms", () => {
    const block = makeBlock({
      text: "The quarantine_gate is required.",
      terms: [],
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("undefined_term", block, ctx);
    expect(issues.some((i) => i.message.includes("quarantine_gate"))).toBe(true);
  });

  it("no issue for plain text without technical terms", () => {
    const block = makeBlock({
      text: "All data entries must pass review.",
      terms: [],
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("undefined_term", block, ctx);
    expect(issues.length).toBe(0);
  });

  it("term defined in another block is considered defined", () => {
    const block1 = makeBlock({
      block_id: "b_001",
      text: "Uses `evidence` for verification.",
      terms: [],
    });
    const block2 = makeBlock({
      block_id: "b_002",
      text: "Evidence is validated data.",
      terms: ["evidence"],
    });
    const artifact = makeArtifact([block1, block2]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("undefined_term", block1, ctx);
    expect(issues.length).toBe(0);
  });
});

// ===========================================================================
// Rule 3: empty_block_text
// ===========================================================================

describe("Rule: empty_block_text", () => {
  it("flags empty text", () => {
    const block = makeBlock({ text: "" });
    block.content_hash = computeBlockContentHash(block);
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("empty_block_text", block, ctx);

    expect(issues.length).toBe(1);
    expect(issues[0].issue_type).toBe("empty_block_text");
    expect(issues[0].severity).toBe("high");
  });

  it("flags whitespace-only text", () => {
    const block = makeBlock({ text: "   \n  \t  " });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("empty_block_text", block, ctx);
    expect(issues.length).toBe(1);
  });

  it("no issue for non-empty text", () => {
    const block = makeBlock({ text: "Valid content." });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("empty_block_text", block, ctx);
    expect(issues.length).toBe(0);
  });
});

// ===========================================================================
// lintArtifact – full artifact scan
// ===========================================================================

describe("lintArtifact", () => {
  it("§18-#4: deterministic linter generates issues", () => {
    const artifact = makeArtifact([
      makeBlock({
        block_id: "b_mem_001",
        text: "All entries are committed instantly.",
        rationale: "Initial naive design.",
        terms: [],
      }),
    ]);

    const issues = lintArtifact(artifact);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.issue_type === "unsafe_canonical_commit")).toBe(
      true
    );
  });

  it("returns Issue objects with correct structure", () => {
    const artifact = makeArtifact([
      makeBlock({
        text: "All entries are committed instantly.",
      }),
    ]);

    const issues = lintArtifact(artifact);
    for (const issue of issues) {
      expect(issue.issue_id).toMatch(/^issue_\d{3}$/);
      expect(issue.artifact_id).toBe("arch_001");
      expect(issue.base_revision_id).toBe("rev_001");
      expect(issue.target_block_id).toBeTruthy();
      expect(issue.issue_type).toBeTruthy();
      expect(issue.severity).toBeTruthy();
      expect(issue.message).toBeTruthy();
    }
  });

  it("scans all blocks across sections", () => {
    const artifact: Artifact = {
      artifact_id: "arch_001",
      artifact_type: "ArchitectureDraft",
      schema_version: "architecture_draft@0.1.0",
      revision_id: "rev_001",
      sections: [
        {
          section_id: "sec_01",
          title: "Section 1",
          commitments: [
            makeBlock({
              block_id: "b_001",
              text: "All entries are committed instantly.",
            }),
          ],
        },
        {
          section_id: "sec_02",
          title: "Section 2",
          commitments: [
            makeBlock({
              block_id: "b_002",
              text: "Data is committed instantly too.",
            }),
          ],
        },
      ],
      metadata: {},
    };

    const issues = lintArtifact(artifact);
    const targetBlocks = issues
      .filter((i) => i.issue_type === "unsafe_canonical_commit")
      .map((i) => i.target_block_id);

    expect(targetBlocks).toContain("b_001");
    expect(targetBlocks).toContain("b_002");
  });

  it("returns empty array for clean artifact", () => {
    const artifact = makeArtifact([
      makeBlock({
        text: "Entries must pass quarantine before canonical commit.",
        terms: ["quarantine", "canonical"],
      }),
    ]);

    const issues = lintArtifact(artifact);
    expect(issues.length).toBe(0);
  });
});
