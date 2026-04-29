/**
 * Domain Relevance Linter Rule – Tests
 *
 * ref: P4-001
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lintArtifact,
  lintBlockWithRule,
  collectDefinedTerms,
  resetIssueCounter,
  type LinterContext,
} from "../src/linter.js";
import { computeBlockContentHash } from "../src/hash.js";
import type { Artifact, CommitmentBlock } from "../src/types.js";

beforeEach(() => resetIssueCounter());

function makeBlock(overrides: Partial<CommitmentBlock> = {}): CommitmentBlock {
  const block: CommitmentBlock = {
    block_id: "b_test_001",
    type: "invariant",
    text: "This system uses a validation pipeline.",
    terms: [],
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
      { section_id: "sec_01", title: "Test", commitments: blocks },
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

describe("Rule: domain_irrelevant_content (P4-001)", () => {
  it("no issue for text with architecture domain keywords", () => {
    const block = makeBlock({
      text: "The pipeline validates all input through the gate system before commit.",
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("domain_irrelevant_content", block, ctx);
    expect(issues.length).toBe(0);
  });

  it("flags text with zero domain-relevant keywords", () => {
    const block = makeBlock({
      text:
        "The trial must be conducted in a manner that respects " +
        "the dignity and well-being of all participants involved.",
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("domain_irrelevant_content", block, ctx);

    expect(issues.length).toBe(1);
    expect(issues[0].issue_type).toBe("domain_irrelevant_content");
    expect(issues[0].severity).toBe("medium");
  });

  it("skips empty blocks (handled by empty_block_text)", () => {
    const block = makeBlock({ text: "" });
    block.content_hash = computeBlockContentHash(block);
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("domain_irrelevant_content", block, ctx);
    expect(issues.length).toBe(0);
  });

  it("skips very short blocks (<= 20 chars)", () => {
    const block = makeBlock({ text: "Short text." });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("domain_irrelevant_content", block, ctx);
    expect(issues.length).toBe(0);
  });

  it("passes if ANY keyword matches (conservative)", () => {
    const block = makeBlock({
      text:
        "The beauty of nature inspires us, but the system must remain deterministic.",
    });
    const artifact = makeArtifact([block]);
    const ctx = makeCtx(artifact);
    const issues = lintBlockWithRule("domain_irrelevant_content", block, ctx);
    // "system" is a domain keyword → should pass
    expect(issues.length).toBe(0);
  });

  it("lintArtifact catches domain-irrelevant blocks in full scan", () => {
    const cleanBlock = makeBlock({
      block_id: "b_clean",
      text: "The pipeline validates all inputs.",
      terms: ["pipeline"],
    });
    const badBlock = makeBlock({
      block_id: "b_bad",
      text:
        "We believe in creating meaningful experiences that enrich lives " +
        "and foster genuine connections between people.",
    });
    const artifact = makeArtifact([cleanBlock, badBlock]);
    const issues = lintArtifact(artifact);
    const domainIssues = issues.filter(
      (i) => i.issue_type === "domain_irrelevant_content"
    );
    expect(domainIssues.length).toBe(1);
    expect(domainIssues[0].target_block_id).toBe("b_bad");
  });
});
