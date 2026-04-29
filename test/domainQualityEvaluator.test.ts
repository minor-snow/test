/**
 * Domain Quality Evaluator — Tests
 *
 * ref: P9-002
 */

import { describe, it, expect } from "vitest";
import {
  evaluateDraftQuality,
  computeConceptCoverage,
  type DraftQualityReport,
} from "../src/domainQualityEvaluator.js";
import type { Artifact } from "../src/types.js";
import type { DomainProfile } from "../src/domainProfile.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function minimalProfile(): DomainProfile {
  return {
    profile_id: "test_profile",
    artifact_type: "ArchitectureDraft",
    domain_name: "Test Domain",
    allowed_concepts: ["database", "API", "cache", "queue", "pipeline"],
    required_concepts: [
      { concept: "source of truth", aliases: ["canonical source"], required: true },
      { concept: "failure mode", aliases: ["error handling"], required: true },
      { concept: "audit trail", aliases: ["audit log"], required: true },
    ],
    forbidden_generic_phrases: [
      "enhance user experience",
      "leverage cutting-edge technology",
    ],
    required_sections: [
      { title: "Core Principles", aliases: ["Core Architecture"] },
      { title: "Failure Modes", aliases: ["Error Handling"] },
    ],
    preferred_block_types: ["invariant", "mechanism", "constraint"],
    quality_rubric: {
      min_sections: 2,
      min_blocks: 5,
      max_blocks: 30,
      min_required_concept_coverage: 0.8,
    },
  };
}

function goodArtifact(): Artifact {
  return {
    artifact_id: "test_good",
    artifact_type: "ArchitectureDraft",
    schema_version: "architecture_draft@0.1.0",
    revision_id: "rev_test_good",
    sections: [
      {
        section_id: "sec_core",
        title: "Core Principles",
        commitments: [
          {
            block_id: "b_001",
            type: "invariant",
            text: "The database is the single source of truth for all canonical state.",
            terms: ["source of truth", "database"],
            status: "draft",
            content_hash: "sha256:test1",
          },
          {
            block_id: "b_002",
            type: "mechanism",
            text: "All writes pass through a validation pipeline before reaching the API.",
            terms: ["pipeline", "API"],
            status: "draft",
            content_hash: "sha256:test2",
          },
          {
            block_id: "b_003",
            type: "constraint",
            text: "Every state change is recorded in the audit trail for traceability.",
            terms: ["audit trail"],
            status: "draft",
            content_hash: "sha256:test3",
          },
        ],
      },
      {
        section_id: "sec_failure",
        title: "Failure Modes",
        commitments: [
          {
            block_id: "b_004",
            type: "risk",
            text: "If the database becomes unavailable, the system enters read-only degradation mode. All writes are queued for retry.",
            terms: ["failure mode", "database", "queue"],
            status: "draft",
            content_hash: "sha256:test4",
          },
          {
            block_id: "b_005",
            type: "mechanism",
            text: "Error handling follows a circuit breaker pattern with configurable thresholds per endpoint.",
            terms: ["error handling", "circuit breaker"],
            status: "draft",
            content_hash: "sha256:test5",
          },
        ],
      },
    ],
    metadata: { created_by: "test" },
  };
}

function badArtifact(): Artifact {
  return {
    artifact_id: "test_bad",
    artifact_type: "ArchitectureDraft",
    schema_version: "architecture_draft@0.1.0",
    revision_id: "rev_test_bad",
    sections: [
      {
        section_id: "sec_intro",
        title: "Introduction",
        commitments: [
          {
            block_id: "b_bad_001",
            type: "invariant",
            text: "The system should be reliable and scalable and robust and efficient.",
            status: "draft",
            content_hash: "sha256:bad1",
          },
          {
            block_id: "b_bad_002",
            type: "mechanism",
            text: "We leverage cutting-edge technology to enhance user experience.",
            status: "draft",
            content_hash: "sha256:bad2",
          },
          {
            block_id: "b_bad_003",
            type: "decision",
            text: "Failure mode is not applicable. TBD for future work.",
            status: "draft",
            content_hash: "sha256:bad3",
          },
        ],
      },
    ],
    metadata: { created_by: "test" },
  };
}

// ---------------------------------------------------------------------------
// Tests: Individual rules
// ---------------------------------------------------------------------------

describe("P9-002: Domain Quality Evaluator", () => {
  // Rule 1: missing_required_section
  it("detects missing required sections", () => {
    const report = evaluateDraftQuality(badArtifact(), minimalProfile());
    const missing = report.blocking_issues.filter(
      i => i.issue_type === "missing_required_section"
    );
    // "Introduction" doesn't match "Core Principles" or "Failure Modes"
    expect(missing.length).toBe(2);
  });

  it("matches sections via aliases", () => {
    const artifact = goodArtifact();
    artifact.sections[0].title = "Core Architecture"; // alias for "Core Principles"
    const report = evaluateDraftQuality(artifact, minimalProfile());
    const missing = report.blocking_issues.filter(
      i => i.issue_type === "missing_required_section"
    );
    expect(missing.length).toBe(0);
  });

  // Rule 2: missing_required_concept
  it("detects missing required concepts", () => {
    const report = evaluateDraftQuality(badArtifact(), minimalProfile());
    const missing = report.improvement_issues.filter(
      i => i.issue_type === "missing_required_concept"
    );
    // "source of truth" and "audit trail" are missing from bad artifact
    expect(missing.length).toBeGreaterThanOrEqual(1);
  });

  it("matches concepts via aliases", () => {
    const artifact = goodArtifact();
    // Replace "source of truth" with alias "canonical source"
    artifact.sections[0].commitments[0].text =
      "The database is the canonical source for all state.";
    const coverage = computeConceptCoverage(artifact, minimalProfile());
    const sot = coverage.details.find(d => d.concept === "source of truth");
    expect(sot?.matched).toBe(true);
  });

  it("matches concepts via terms[]", () => {
    const artifact = goodArtifact();
    // Remove concept from text but keep in terms
    artifact.sections[0].commitments[0].text = "The database stores all state.";
    artifact.sections[0].commitments[0].terms = ["source of truth"];
    const coverage = computeConceptCoverage(artifact, minimalProfile());
    const sot = coverage.details.find(d => d.concept === "source of truth");
    expect(sot?.matched).toBe(true);
    expect(sot?.matched_by).toContain("terms[]");
  });

  // Rule 3: generic_filler
  it("detects forbidden generic phrases", () => {
    const report = evaluateDraftQuality(badArtifact(), minimalProfile());
    const filler = report.improvement_issues.filter(
      i => i.issue_type === "generic_filler"
    );
    expect(filler.length).toBeGreaterThanOrEqual(1);
    expect(filler[0].message).toContain("forbidden generic phrase");
  });

  // Rule 4: vague_commitment
  it("detects vague commitments", () => {
    const report = evaluateDraftQuality(badArtifact(), minimalProfile());
    const vague = report.improvement_issues.filter(
      i => i.issue_type === "vague_commitment"
    );
    // "reliable and scalable and robust and efficient" is vague
    expect(vague.length).toBeGreaterThanOrEqual(1);
  });

  // Rule 6: placeholder_concept
  it("detects placeholder/TBD blocks", () => {
    const report = evaluateDraftQuality(badArtifact(), minimalProfile());
    const placeholders = report.blocking_issues.filter(
      i => i.issue_type === "placeholder_concept"
    );
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });

  it("excludes placeholder blocks from concept coverage", () => {
    const profile = minimalProfile();
    const artifact = badArtifact();
    const coverage = computeConceptCoverage(artifact, profile);
    // "failure mode" appears only in placeholder block — should NOT count
    const fm = coverage.details.find(d => d.concept === "failure mode");
    expect(fm?.matched).toBe(false);
    expect(fm?.excluded_placeholder).toBe(true);
  });

  // Rule 7: domain_irrelevant_content (profile-aware)
  it("detects blocks with no domain concepts", () => {
    const report = evaluateDraftQuality(badArtifact(), minimalProfile());
    const irrelevant = report.improvement_issues.filter(
      i => i.issue_type === "domain_irrelevant_content"
    );
    expect(irrelevant.length).toBeGreaterThanOrEqual(1);
  });

  // Good artifact should have few issues
  it("good artifact scores well", () => {
    const report = evaluateDraftQuality(goodArtifact(), minimalProfile());
    expect(report.score).toBeGreaterThanOrEqual(70);
    expect(report.recommendation).toBe("accept_as_seed");
    expect(report.required_concept_coverage).toBeGreaterThanOrEqual(0.6);
  });
});

// ---------------------------------------------------------------------------
// Tests: Score & recommendation
// ---------------------------------------------------------------------------

describe("P9-002: Score & Recommendation", () => {
  it("score formula is deterministic", () => {
    const r1 = evaluateDraftQuality(goodArtifact(), minimalProfile());
    const r2 = evaluateDraftQuality(goodArtifact(), minimalProfile());
    expect(r1.score).toBe(r2.score);
  });

  it("bad artifact gets reject_draft", () => {
    const report = evaluateDraftQuality(badArtifact(), minimalProfile());
    expect(report.recommendation).toBe("reject_draft");
  });

  it("missing required section forces reject_draft regardless of score", () => {
    const artifact = goodArtifact();
    // Remove the "Failure Modes" section
    artifact.sections = artifact.sections.filter(
      s => s.section_id !== "sec_failure"
    );
    const report = evaluateDraftQuality(artifact, minimalProfile());
    expect(report.recommendation).toBe("reject_draft");
  });

  it("score is capped at 100 and floored at 0", () => {
    const good = evaluateDraftQuality(goodArtifact(), minimalProfile());
    expect(good.score).toBeLessThanOrEqual(100);
    expect(good.score).toBeGreaterThanOrEqual(0);

    const bad = evaluateDraftQuality(badArtifact(), minimalProfile());
    expect(bad.score).toBeGreaterThanOrEqual(0);
  });

  it("report has correct block and section counts", () => {
    const report = evaluateDraftQuality(goodArtifact(), minimalProfile());
    expect(report.section_count).toBe(2);
    expect(report.block_count).toBe(5);
  });

  // BUG-12 regression: rubric violations must force reject_draft
  it("rejects draft below min_blocks", () => {
    const profile = minimalProfile();
    profile.quality_rubric.min_blocks = 10; // good artifact has 5
    const report = evaluateDraftQuality(goodArtifact(), profile);
    expect(report.recommendation).toBe("reject_draft");
    expect(report.blocking_issues.some(i => i.issue_type === "below_min_blocks")).toBe(true);
  });

  it("rejects draft below min_sections", () => {
    const profile = minimalProfile();
    profile.quality_rubric.min_sections = 5; // good artifact has 2
    const report = evaluateDraftQuality(goodArtifact(), profile);
    expect(report.recommendation).toBe("reject_draft");
    expect(report.blocking_issues.some(i => i.issue_type === "below_min_sections")).toBe(true);
  });

  it("rejects draft below min_required_concept_coverage", () => {
    const artifact = goodArtifact();
    // Remove blocks that cover "failure mode" and "error handling"
    artifact.sections[1].commitments = [];
    const profile = minimalProfile();
    profile.quality_rubric.min_required_concept_coverage = 1.0; // require 100%
    const report = evaluateDraftQuality(artifact, profile);
    expect(report.recommendation).toBe("reject_draft");
    expect(report.blocking_issues.some(i => i.issue_type === "below_min_concept_coverage")).toBe(true);
  });

  it("rejects draft above max_blocks", () => {
    const profile = minimalProfile();
    profile.quality_rubric.max_blocks = 3; // good artifact has 5
    const report = evaluateDraftQuality(goodArtifact(), profile);
    expect(report.issue_breakdown["above_max_blocks"]).toBe(1);
    expect(report.recommendation).toBe("reject_draft");
    expect(report.blocking_issues.some(i => i.issue_type === "above_max_blocks")).toBe(true);
  });
});
