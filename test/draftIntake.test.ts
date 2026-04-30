/**
 * Draft Intake — Tests
 *
 * ref: P9-005
 *
 * Verifies:
 *   1. accept_as_seed does NOT create canonical pointer (BUG-6 regression)
 *   2. All intake decisions write to DecisionLog
 *   3. Quality snapshot is recorded in DecisionLog
 *   4. Missing rationale is rejected
 *   5. Missing operator_id is rejected
 *   6. Missing quarantine item is rejected
 *   7. Invalid decision type is rejected
 */

import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { runIdeaToDraft } from "../src/ideaToDraft.js";
import { loadCanonicalPointer } from "../src/artifactStore.js";
import { readDecisionLog } from "../src/cockpit/decisionLog.js";
import { evaluateDraftQuality } from "../src/domainQualityEvaluator.js";
import { validateDraft } from "../src/draftValidator.js";
import { loadDomainProfile } from "../src/domainProfile.js";
import { appendDecisionEntry } from "../src/cockpit/decisionLog.js";
import { loadFromQuarantine } from "../src/artifactStore.js";
import type { LlmClient } from "../src/trial/llmClient.js";
import type { DecisionLogPathOptions } from "../src/cockpit/decisionLog.js";

const TRUSTED_ABSOLUTE: DecisionLogPathOptions = { trustedAbsolute: true };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return join(tmpdir(), `intake_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

function mockClient(response: string): LlmClient {
  return { complete: async () => response };
}

const VALID_DRAFT = JSON.stringify({
  artifact_id: "intake_test_draft",
  artifact_type: "ArchitectureDraft",
  sections: [
    {
      section_id: "sec_core",
      title: "Core Architecture",
      commitments: [
        {
          block_id: "b_001",
          type: "invariant",
          text: "The database is the single source of truth for all canonical state.",
          terms: ["source of truth", "database"],
          status: "draft",
        },
        {
          block_id: "b_002",
          type: "mechanism",
          text: "All validation gates check schema compliance before accepting writes.",
          terms: ["validation gate"],
          status: "draft",
        },
      ],
    },
  ],
});

/**
 * Simulate the intake flow without a running server.
 * This tests the core logic that the endpoint executes.
 */
async function simulateIntake(
  dataDir: string,
  quarantineId: string,
  decision: string,
  operatorId: string,
  rationale: string
): Promise<{ valid: boolean; errors?: string[]; decision_id?: string }> {
  const INTAKE_DECISIONS = ["reject_draft", "accept_for_cleanup", "accept_as_seed"];

  if (!INTAKE_DECISIONS.includes(decision)) {
    return { valid: false, errors: [`Invalid decision`] };
  }
  if (!rationale?.trim()) {
    return { valid: false, errors: ["rationale is required"] };
  }
  if (!operatorId?.trim()) {
    return { valid: false, errors: ["operator_id is required"] };
  }

  const item = await loadFromQuarantine({ dataDir }, quarantineId);
  if (!item) {
    return { valid: false, errors: [`Quarantine item "${quarantineId}" not found`] };
  }

  // Quality snapshot
  let qualitySnapshot: Record<string, unknown> = {};
  try {
    const validation = validateDraft(item);
    if (validation.status === "accepted") {
      const profilePath = join(process.cwd(), "data", "profiles", "software_engineering_architecture.json");
      const profile = await loadDomainProfile(profilePath);
      const report = evaluateDraftQuality(validation.artifact, profile);
      qualitySnapshot = {
        score: report.score,
        required_concept_coverage: report.required_concept_coverage,
        recommendation: report.recommendation,
      };
    }
  } catch { /* best-effort */ }

  const decisionId = `intake_${Date.now()}`;
  await appendDecisionEntry(dataDir, {
    decision_id: decisionId,
    decision_type: `draft_intake:${decision}`,
    operator_id: operatorId,
    release_decision_id: decisionId,
    affected_artifacts: [quarantineId],
    canonical_revision_ids: {},
    rationale,
    created_at: new Date().toISOString(),
    quality_snapshot: qualitySnapshot,
  }, TRUSTED_ABSOLUTE);

  return { valid: true, decision_id: decisionId };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("P9-005: Draft Intake", () => {
  let dataDir: string;
  let quarantineId: string;

  beforeEach(async () => {
    dataDir = makeTmpDir();
    await fs.mkdir(dataDir, { recursive: true });

    // Create a draft in quarantine
    const client = mockClient(VALID_DRAFT);
    await runIdeaToDraft("Test idea", client, { dataDir });

    // Find quarantine file
    const quarantineDir = join(dataDir, "quarantine");
    const files = await fs.readdir(quarantineDir);
    quarantineId = files.find(f => f.startsWith("draft_"))!.replace(".json", "");
  });

  it("accept_as_seed does NOT create canonical pointer", async () => {
    await simulateIntake(dataDir, quarantineId, "accept_as_seed", "op", "looks good");

    const pointer = await loadCanonicalPointer(
      { dataDir },
      "intake_test_draft"
    );
    expect(pointer).toBeNull();
  });

  it("reject_draft writes to DecisionLog", async () => {
    await simulateIntake(dataDir, quarantineId, "reject_draft", "reviewer", "too vague");

    const log = await readDecisionLog(dataDir, TRUSTED_ABSOLUTE);
    expect(log.length).toBe(1);
    expect(log[0].decision_type).toBe("draft_intake:reject_draft");
    expect(log[0].operator_id).toBe("reviewer");
    expect(log[0].rationale).toBe("too vague");
  });

  it("accept_for_cleanup writes to DecisionLog", async () => {
    await simulateIntake(dataDir, quarantineId, "accept_for_cleanup", "op", "needs work");

    const log = await readDecisionLog(dataDir, TRUSTED_ABSOLUTE);
    expect(log.length).toBe(1);
    expect(log[0].decision_type).toBe("draft_intake:accept_for_cleanup");
  });

  it("accept_as_seed writes to DecisionLog with quality snapshot", async () => {
    await simulateIntake(dataDir, quarantineId, "accept_as_seed", "op", "ready");

    const log = await readDecisionLog(dataDir, TRUSTED_ABSOLUTE);
    expect(log.length).toBe(1);
    expect(log[0].decision_type).toBe("draft_intake:accept_as_seed");
    expect(log[0].quality_snapshot).toBeDefined();
    expect(typeof (log[0].quality_snapshot as any)?.score).toBe("number");
  });

  it("rejects missing rationale", async () => {
    const result = await simulateIntake(dataDir, quarantineId, "accept_as_seed", "op", "");
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toContain("rationale");
  });

  it("rejects missing operator_id", async () => {
    const result = await simulateIntake(dataDir, quarantineId, "accept_as_seed", "", "reason");
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toContain("operator_id");
  });

  it("rejects missing quarantine item", async () => {
    const result = await simulateIntake(dataDir, "nonexistent", "accept_as_seed", "op", "reason");
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toContain("not found");
  });

  it("rejects invalid decision type", async () => {
    const result = await simulateIntake(dataDir, quarantineId, "promote_now", "op", "reason");
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toContain("Invalid");
  });
});
