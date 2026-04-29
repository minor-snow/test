/**
 * Redundancy Detection Linter Rule – Tests
 *
 * ref: P4-003
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lintArtifact,
  extract3Grams,
  gramOverlapRatio,
  resetIssueCounter,
} from "../src/linter.js";
import { computeBlockContentHash } from "../src/hash.js";
import type { Artifact, CommitmentBlock } from "../src/types.js";

beforeEach(() => resetIssueCounter());

function makeBlock(overrides: Partial<CommitmentBlock> = {}): CommitmentBlock {
  const block: CommitmentBlock = {
    block_id: "b_test_001",
    type: "invariant",
    text: "Default test text about the system pipeline validation gate.",
    terms: ["pipeline", "gate"],
    status: "draft",
    content_hash: "",
    ...overrides,
  };
  block.content_hash = computeBlockContentHash(block);
  return block;
}

describe("extract3Grams", () => {
  it("extracts 3-grams from text", () => {
    const grams = extract3Grams("the pipeline validates all input data");
    // After stop word removal: "pipeline validates input data"
    // 3-grams: "pipeline validates input", "validates input data"
    expect(grams.size).toBeGreaterThan(0);
  });

  it("removes stop words", () => {
    const grams = extract3Grams("the and of is are to in for on");
    expect(grams.size).toBe(0);
  });

  it("handles empty text", () => {
    const grams = extract3Grams("");
    expect(grams.size).toBe(0);
  });

  it("handles text shorter than 3 content words", () => {
    const grams = extract3Grams("pipeline validates");
    expect(grams.size).toBe(0);
  });
});

describe("gramOverlapRatio", () => {
  it("returns 0 for empty sets", () => {
    expect(gramOverlapRatio(new Set(), new Set())).toBe(0);
    expect(gramOverlapRatio(new Set(["a"]), new Set())).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    const s = new Set(["a b c", "d e f"]);
    expect(gramOverlapRatio(s, s)).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    const a = new Set(["a b c"]);
    const b = new Set(["x y z"]);
    expect(gramOverlapRatio(a, b)).toBe(0);
  });

  it("returns correct ratio for partial overlap", () => {
    const a = new Set(["a b c", "d e f"]);
    const b = new Set(["a b c", "x y z"]);
    // overlap=1, smaller=2, ratio=0.5
    expect(gramOverlapRatio(a, b)).toBe(0.5);
  });
});

describe("Rule: redundant_narrative (P4-003)", () => {
  it("no issue for blocks with different content in different sections", () => {
    const artifact: Artifact = {
      artifact_id: "arch_001",
      artifact_type: "ArchitectureDraft",
      schema_version: "architecture_draft@0.1.0",
      revision_id: "rev_001",
      sections: [
        {
          section_id: "sec_01",
          title: "Core",
          commitments: [
            makeBlock({
              block_id: "b_001",
              text: "The pipeline validates all system input through the gate before commit.",
              terms: ["pipeline", "gate"],
            }),
          ],
        },
        {
          section_id: "sec_02",
          title: "Store",
          commitments: [
            makeBlock({
              block_id: "b_002",
              text: "Revisions are immutable once written to the artifact store directory.",
              terms: ["revision", "artifact_store"],
            }),
          ],
        },
      ],
      metadata: {},
    };

    const issues = lintArtifact(artifact);
    const redundancy = issues.filter(
      (i) => i.issue_type === "redundant_narrative"
    );
    expect(redundancy.length).toBe(0);
  });

  it("flags near-duplicate blocks in different sections", () => {
    const sharedText =
      "In legacy mode patch results were committed to the canonical store " +
      "without gating verification or quarantine checks in place.";

    const artifact: Artifact = {
      artifact_id: "arch_001",
      artifact_type: "ArchitectureDraft",
      schema_version: "architecture_draft@0.1.0",
      revision_id: "rev_001",
      sections: [
        {
          section_id: "sec_01",
          title: "Core",
          commitments: [
            makeBlock({
              block_id: "b_001",
              text: sharedText,
              terms: ["canonical"],
            }),
          ],
        },
        {
          section_id: "sec_02",
          title: "Gates",
          commitments: [
            makeBlock({
              block_id: "b_002",
              text: sharedText, // exact duplicate
              terms: ["canonical"],
            }),
          ],
        },
      ],
      metadata: {},
    };

    const issues = lintArtifact(artifact);
    const redundancy = issues.filter(
      (i) => i.issue_type === "redundant_narrative"
    );
    expect(redundancy.length).toBe(1);
    expect(redundancy[0].target_block_id).toBe("b_002"); // reported on the later block
    expect(redundancy[0].severity).toBe("low");
  });

  it("does NOT flag similar blocks within the SAME section", () => {
    const sharedText =
      "In legacy mode patch results were committed to the canonical store without gating.";

    const artifact: Artifact = {
      artifact_id: "arch_001",
      artifact_type: "ArchitectureDraft",
      schema_version: "architecture_draft@0.1.0",
      revision_id: "rev_001",
      sections: [
        {
          section_id: "sec_01",
          title: "Core",
          commitments: [
            makeBlock({ block_id: "b_001", text: sharedText, terms: ["canonical"] }),
            makeBlock({ block_id: "b_002", text: sharedText, terms: ["canonical"] }),
          ],
        },
      ],
      metadata: {},
    };

    const issues = lintArtifact(artifact);
    const redundancy = issues.filter(
      (i) => i.issue_type === "redundant_narrative"
    );
    expect(redundancy.length).toBe(0);
  });

  it("skips short blocks", () => {
    const artifact: Artifact = {
      artifact_id: "arch_001",
      artifact_type: "ArchitectureDraft",
      schema_version: "architecture_draft@0.1.0",
      revision_id: "rev_001",
      sections: [
        {
          section_id: "sec_01",
          title: "Core",
          commitments: [makeBlock({ block_id: "b_001", text: "Short." })],
        },
        {
          section_id: "sec_02",
          title: "Store",
          commitments: [makeBlock({ block_id: "b_002", text: "Short." })],
        },
      ],
      metadata: {},
    };

    const issues = lintArtifact(artifact);
    const redundancy = issues.filter(
      (i) => i.issue_type === "redundant_narrative"
    );
    expect(redundancy.length).toBe(0);
  });
});
