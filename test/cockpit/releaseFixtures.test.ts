/**
 * Release Decision Fixtures — Tests
 *
 * ref: P5-004
 *
 * Validates:
 *   - All 15 fixtures have consistent decision constraints
 *   - Backlog generation for accepted_with_residual_issues
 *   - Rejected scenarios cannot generate backlogs
 *   - Decision validation catches bad inputs
 */

import { describe, it, expect } from "vitest";
import { RELEASE_FIXTURES, type ReleaseFixture } from "../../test/fixtures/release/index.js";
import {
  generateBacklogItems,
  validateReleaseDecision,
} from "../../src/cockpit/backlogExport.js";
import type { ReleaseDecision } from "../../src/cockpit/types.js";

// ---------------------------------------------------------------------------
// Helper: build a decision from fixture
// ---------------------------------------------------------------------------

function buildDecision(fixture: ReleaseFixture): ReleaseDecision {
  const backlogItems =
    fixture.expected_decision === "accepted_with_residual_issues"
      ? generateBacklogItems(fixture.residual, "rev_fixture", `dec_${fixture.id}`)
      : [];

  return {
    decision_id: `dec_${fixture.id}`,
    decision: fixture.expected_decision,
    canonical_revision_id: "rev_fixture",
    artifact_id: "arch_fixture",
    operator_id: "fixture_operator",
    timestamp: new Date().toISOString(),
    rationale: `Fixture ${fixture.id}: ${fixture.description}`,
    final_coherence_note: fixture.three_layer.document_coherent
      ? "Document remains coherent and suitable for maintenance."
      : "Document coherence compromised — requires review.",
    three_layer_status: fixture.three_layer,
    residual_snapshot: fixture.residual,
    backlog_items: backlogItems,
  };
}

// ---------------------------------------------------------------------------
// Structural checks
// ---------------------------------------------------------------------------

describe("P5-004: Release Fixtures", () => {
  it("has exactly 15 fixtures", () => {
    expect(RELEASE_FIXTURES).toHaveLength(15);
  });

  it("all fixture IDs are unique", () => {
    const ids = RELEASE_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(15);
  });

  it("covers all three decision types", () => {
    const decisions = new Set(RELEASE_FIXTURES.map((f) => f.expected_decision));
    expect(decisions.has("accepted_clean")).toBe(true);
    expect(decisions.has("accepted_with_residual_issues")).toBe(true);
    expect(decisions.has("rejected_requires_cleanup")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Decision constraint validation per fixture
// ---------------------------------------------------------------------------

describe("P5-004: Decision Constraints", () => {
  for (const fixture of RELEASE_FIXTURES) {
    describe(`[${fixture.id}] ${fixture.name}`, () => {
      it("passes validation when correctly decided", () => {
        const decision = buildDecision(fixture);
        const result = validateReleaseDecision(decision);

        // Special case: rf10 integrity corrupt + rf07 domain irrelevant —
        // these have no high residuals but are rejected for other reasons.
        // The validator only checks structural constraints, not contextual ones.
        if (fixture.id === "rf10_integrity_corrupt") {
          // No residuals, rejected → valid (no backlog, has rationale)
          expect(result.valid).toBe(true);
        } else if (fixture.id === "rf07_domain_irrelevant") {
          // domain_irrelevant is medium, rejected → need to handle this
          // Validator doesn't enforce "medium = must reject" — that's operator judgment
          // But rejected_requires_cleanup should have no backlog
          expect(result.valid).toBe(true);
        } else {
          expect(result.valid).toBe(true);
        }
      });

      if (fixture.expected_decision === "accepted_clean") {
        it("has zero residuals", () => {
          expect(fixture.residual.total).toBe(0);
        });
      }

      if (fixture.expected_decision === "accepted_with_residual_issues") {
        it("generates backlog items matching residual count", () => {
          const items = generateBacklogItems(
            fixture.residual, "rev_test", `dec_${fixture.id}`
          );
          expect(items.length).toBe(fixture.residual.total);
        });

        it("has no high-severity residuals", () => {
          const highCount = fixture.residual.by_severity["high"] ?? 0;
          expect(highCount).toBe(0);
        });
      }

      if (fixture.expected_decision === "rejected_requires_cleanup") {
        it("has a blocking condition", () => {
          // Either has high residuals, integrity corrupt, or domain_irrelevant
          const hasHigh = (fixture.residual.by_severity["high"] ?? 0) > 0;
          const integrityBroken = !fixture.three_layer.integrity_clean;
          const hasIrrelevant = (fixture.residual.by_type["domain_irrelevant_content"] ?? 0) > 0;
          expect(hasHigh || integrityBroken || hasIrrelevant).toBe(true);
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Fatigue resistance: decisions should NOT degrade to empty rationale
// ---------------------------------------------------------------------------

describe("P5-004: Fatigue Resistance", () => {
  it("all fixtures produce decisions with non-trivial rationale", () => {
    for (const fixture of RELEASE_FIXTURES) {
      const decision = buildDecision(fixture);
      expect(decision.rationale.length).toBeGreaterThan(10);
      expect(decision.final_coherence_note.length).toBeGreaterThan(10);
    }
  });

  it("each fixture has expected rationale keywords", () => {
    for (const fixture of RELEASE_FIXTURES) {
      expect(fixture.expected_rationale_keywords.length).toBeGreaterThan(0);
    }
  });
});
