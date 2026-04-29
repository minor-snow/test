/**
 * Trial Runner Integration Tests
 *
 * ref: P3-003, P3-004
 *
 * Uses fake LLM client with pre-built PatchProposal responses.
 * Tests run against a temporary store root (never writes data/trial/).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createTrialArtifact } from "../../src/trial/trialArtifact.js";
import { createFakeLlmClient } from "../../src/trial/fakeLlmClient.js";
import { lintArtifact } from "../../src/linter.js";
import { runTrial, type TrialConfig } from "../../src/trial/trialRunner.js";
import type { StoreConfig } from "../../src/artifactStore.js";

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let TEST_DIR: string;
let config: StoreConfig;

beforeEach(async () => {
  TEST_DIR = join(
    tmpdir(),
    `pantheon-trial-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  await fs.mkdir(TEST_DIR, { recursive: true });
  config = { dataDir: TEST_DIR };
});

// ---------------------------------------------------------------------------
// Helpers: build valid fake PatchProposal JSON for a given issue
// ---------------------------------------------------------------------------

function buildFakeProposalJson(
  artifactId: string,
  revisionId: string,
  issueId: string,
  blockId: string,
  replacementText: string
): string {
  return JSON.stringify({
    proposal_id: `proposal_for_${issueId}`,
    artifact_id: artifactId,
    base_revision_id: revisionId,
    source_issue_ids: [issueId],
    operations: [
      {
        op: "replace_block",
        target_block_id: blockId,
        replacement_text: replacementText,
      },
    ],
    schema_version: "patch_proposal@0.1.0",
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("P3-003: Trial Runner", () => {
  it("runs a single cycle with a valid patch proposal", async () => {
    const seed = createTrialArtifact();
    const issues = lintArtifact(seed);
    const firstIssue = issues[0];

    // Build a valid response that fixes the first issue
    const fakeResponse = buildFakeProposalJson(
      seed.artifact_id,
      seed.revision_id,
      firstIssue.issue_id,
      firstIssue.target_block_id,
      "In the original design, patch results went directly to canonical. " +
        "This pattern has been replaced by the quarantine-gate-evidence flow."
    );

    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient([fakeResponse]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runTrial(trialConfig, seed);

    expect(report.total_cycles).toBe(1);
    expect(report.proposals_generated).toBe(1);
    expect(report.cycles.length).toBeGreaterThanOrEqual(1);
    expect(report.final_canonical_revision_id).toBeTruthy();
  });

  it("runs multiple cycles and tracks issue progression", async () => {
    const seed = createTrialArtifact();
    const issues = lintArtifact(seed);

    // Build responses for first 3 issues
    const responses = issues.slice(0, 3).map((issue) =>
      buildFakeProposalJson(
        seed.artifact_id,
        seed.revision_id, // Note: base_revision_id will be wrong for cycle 2+
        issue.issue_id,
        issue.target_block_id,
        "This block has been revised to address the identified issue. " +
          "All constraints from the original text are preserved."
      )
    );

    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient(responses),
      overrideMode: "scripted",
      maxCycles: 3,
    };

    const report = await runTrial(trialConfig, seed);

    expect(report.total_cycles).toBeGreaterThanOrEqual(1);
    expect(report.proposals_generated).toBeGreaterThanOrEqual(1);
    expect(report.issues_found).toBe(22); // from seed artifact
    expect(Object.keys(report.issues_by_rule).length).toBeGreaterThanOrEqual(3);
  });

  it("records issue breakdown by rule type", async () => {
    const seed = createTrialArtifact();
    const issues = lintArtifact(seed);
    const firstIssue = issues[0];

    const fakeResponse = buildFakeProposalJson(
      seed.artifact_id,
      seed.revision_id,
      firstIssue.issue_id,
      firstIssue.target_block_id,
      "Revised text without the problematic pattern."
    );

    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient([fakeResponse]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runTrial(trialConfig, seed);

    expect(report.issues_by_rule["unsafe_canonical_commit"]).toBe(4);
    expect(report.issues_by_rule["undefined_term"]).toBe(15);
    expect(report.issues_by_rule["empty_block_text"]).toBe(2);
  });
});

describe("P3-004: Mechanical Rejection", () => {
  it("detects natural mechanical rejection from bad LLM output", async () => {
    const seed = createTrialArtifact();

    // LLM returns invalid JSON
    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient(["this is not json at all"]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runTrial(trialConfig, seed);

    expect(report.natural_rejection_count).toBe(1);
    expect(report.cycles[0].mechanicalRejection).toBe(true);
    expect(report.cycles[0].rejectionReason).toBeTruthy();
  });

  it("runs forced rejection when no natural rejections occur", async () => {
    const seed = createTrialArtifact();
    const issues = lintArtifact(seed);
    const firstIssue = issues[0];

    // Provide a VALID response so natural rejection = 0
    const validResponse = buildFakeProposalJson(
      seed.artifact_id,
      seed.revision_id,
      firstIssue.issue_id,
      firstIssue.target_block_id,
      "Revised: the original approach has been superseded by the gating system."
    );

    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient([validResponse]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runTrial(trialConfig, seed);

    // Should have forced rejection since natural was 0
    expect(report.forced_rejection_count).toBe(1);
    expect(report.natural_rejection_count).toBe(0);

    // Last cycle should be the forced one
    const forcedCycle = report.cycles[report.cycles.length - 1];
    expect(forcedCycle.mechanicalRejection).toBe(true);
    expect(forcedCycle.issue).toBeNull(); // forced cycle has no issue
  });

  it("skips forced rejection when natural rejections already occurred", async () => {
    const seed = createTrialArtifact();

    // Bad LLM output → natural rejection
    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient(["NOT JSON"]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runTrial(trialConfig, seed);

    expect(report.natural_rejection_count).toBe(1);
    expect(report.forced_rejection_count).toBe(0);
  });

  it("total rejection count is always >= 1", async () => {
    const seed = createTrialArtifact();
    const issues = lintArtifact(seed);

    // Mix: 1 valid, then 1 invalid
    const responses = [
      buildFakeProposalJson(
        seed.artifact_id,
        seed.revision_id,
        issues[0].issue_id,
        issues[0].target_block_id,
        "Fixed text."
      ),
      "INVALID JSON FROM LLM",
    ];

    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient(responses),
      overrideMode: "scripted",
      maxCycles: 2,
    };

    const report = await runTrial(trialConfig, seed);

    const totalRejections =
      report.natural_rejection_count + report.forced_rejection_count;
    expect(totalRejections).toBeGreaterThanOrEqual(1);
  });
});

describe("P3-003: Override mode tracking", () => {
  it("records scripted overrides in mode breakdown", async () => {
    const seed = createTrialArtifact();
    const issues = lintArtifact(seed);
    const firstIssue = issues[0];

    const validResponse = buildFakeProposalJson(
      seed.artifact_id,
      seed.revision_id,
      firstIssue.issue_id,
      firstIssue.target_block_id,
      "Fixed text without the problematic pattern."
    );

    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient([validResponse]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runTrial(trialConfig, seed);

    // Whether override was needed depends on regression result,
    // but mode breakdown should be consistent
    expect(report.override_mode_breakdown.manual).toBe(0);
    if (report.override_count > 0) {
      expect(report.override_mode_breakdown.scripted).toBe(
        report.override_count
      );
    }
  });
});

describe("P3-003: Data persistence", () => {
  it("saves LLM outputs and state snapshots to disk", async () => {
    const seed = createTrialArtifact();
    const issues = lintArtifact(seed);
    const firstIssue = issues[0];

    const validResponse = buildFakeProposalJson(
      seed.artifact_id,
      seed.revision_id,
      firstIssue.issue_id,
      firstIssue.target_block_id,
      "Revised block text."
    );

    const trialConfig: TrialConfig = {
      store: config,
      client: createFakeLlmClient([validResponse]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    await runTrial(trialConfig, seed);

    // Check that LLM output was saved (P6-003: now in llm_runs/)
    const llmOutputPath = join(TEST_DIR, "llm_runs", "cycle_001", "raw_output.txt");
    const llmExists = await fs
      .access(llmOutputPath)
      .then(() => true)
      .catch(() => false);
    expect(llmExists).toBe(true);

    // Check that state snapshot was saved
    const statePath = join(TEST_DIR, "states", "cycle_1.json");
    const stateExists = await fs
      .access(statePath)
      .then(() => true)
      .catch(() => false);
    expect(stateExists).toBe(true);
  });
});
