/**
 * Multi-Artifact Trial Runner — Tests
 *
 * ref: P7a-004
 */

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  runMultiArtifactTrial,
  type MultiArtifactTrialConfig,
} from "../../src/trial/multiArtifactTrialRunner.js";
import { createFakeLlmClient } from "../../src/trial/fakeLlmClient.js";
import { createTrialArtifact } from "../../src/trial/trialArtifact.js";
import { createInterfaceSpecSeed } from "../../src/trial/interfaceSpecSeed.js";
import type { Artifact, PatchProposal } from "../../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let dataDir: string;

beforeEach(async () => {
  dataDir = join(
    tmpdir(),
    `pantheon-multi-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.mkdir(dataDir, { recursive: true });
});

/**
 * Build a valid PatchProposal JSON that fixes any issue by replacing
 * the target block text.
 */
function makeValidProposal(
  artifact: Artifact,
  issue: { issue_id: string; target_block_id: string }
): string {
  return JSON.stringify({
    proposal_id: `proposal_for_${issue.issue_id}`,
    artifact_id: artifact.artifact_id,
    base_revision_id: artifact.revision_id,
    source_issue_ids: [issue.issue_id],
    operations: [
      {
        op: "replace_block",
        target_block_id: issue.target_block_id,
        replacement_text:
          "The pipeline enforces deterministic validation at every gate boundary before commit.",
      },
    ],
    schema_version: "patch_proposal@0.1.0",
  } satisfies PatchProposal & { schema_version: string });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("P7a-004: Multi-Artifact Trial Runner", () => {
  it("creates both artifacts and reports correct counts", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient([]),  // no LLM calls — will fail on first cycle
      overrideMode: "scripted",
      maxCycles: 0,  // don't run any cycles, just setup
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    expect(report.artifact_count).toBe(2);
    expect(report.block_count).toBe(56);  // 36 + 20
  });

  it("finds local and cross-artifact issues", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient([]),
      overrideMode: "scripted",
      maxCycles: 0,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    expect(report.local_issues).toBeGreaterThan(20);
    expect(report.cross_artifact_issues).toBeGreaterThanOrEqual(5);
  });

  it("dispatches issue to correct artifact", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    // Create a client that returns a valid proposal for the first issue
    const client = createFakeLlmClient([
      makeValidProposal(arch, {
        issue_id: "issue_auto_001",
        target_block_id: arch.sections[0].commitments[0].block_id,
      }),
    ]);

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client,
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    expect(report.cycles.length).toBe(1);
    expect(report.proposals_generated).toBe(1);
    // The issue belongs to one of the two artifacts
    const cycleArtifact = report.cycles[0].issue?.artifact_id;
    expect([arch.artifact_id, iface.artifact_id]).toContain(cycleArtifact);
  });

  it("final_revision_ids contains both artifact ids", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient([]),
      overrideMode: "scripted",
      maxCycles: 0,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    expect(report.final_revision_ids[arch.artifact_id]).toBeTruthy();
    expect(report.final_revision_ids[iface.artifact_id]).toBeTruthy();
  });

  it("residual_by_artifact contains both artifact ids", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient([]),
      overrideMode: "scripted",
      maxCycles: 0,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    expect(report.residual_by_artifact[arch.artifact_id]).toBeGreaterThan(0);
    expect(report.residual_by_artifact[iface.artifact_id]).toBeGreaterThan(0);
  });

  it("runs multiple cycles across both artifacts", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    // Generate valid proposals for the first few issues in arch
    const archBlocks = arch.sections.flatMap(s => s.commitments);
    const proposals = archBlocks.slice(0, 3).map((block, idx) =>
      makeValidProposal(arch, {
        issue_id: `issue_auto_${idx + 1}`,
        target_block_id: block.block_id,
      })
    );

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient(proposals),
      overrideMode: "scripted",
      maxCycles: 3,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    expect(report.cycles.length).toBe(3);
    expect(report.proposals_generated).toBe(3);
  });

  it("handles mechanical rejection correctly", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient(["not valid json"]),
      overrideMode: "scripted",
      maxCycles: 1,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    expect(report.cycles.length).toBe(1);
    expect(report.mechanical_rejections).toBe(1);
    expect(report.proposals_committed).toBe(0);
  });

  it("computes cross_residuals correctly after trial", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient([]),
      overrideMode: "scripted",
      maxCycles: 0,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    // Initial cross issues should be >= 5
    expect(report.cross_residuals).toBeGreaterThanOrEqual(5);
  });

  it("does not repeat already-attempted issues", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    // Return the same bad output for all calls — each should be a new issue
    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient([
        "invalid", "invalid", "invalid",
      ]),
      overrideMode: "scripted",
      maxCycles: 3,
    };

    const report = await runMultiArtifactTrial(config, [arch, iface]);

    // All 3 cycles should attempt different issues
    const issueIds = report.cycles.map(c => c.issue?.target_block_id);
    const unique = new Set(issueIds);
    expect(unique.size).toBe(3);
  });

  it("saves projections for both artifacts", async () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const config: MultiArtifactTrialConfig = {
      store: { dataDir },
      client: createFakeLlmClient([]),
      overrideMode: "scripted",
      maxCycles: 0,
    };

    await runMultiArtifactTrial(config, [arch, iface]);

    const archProj = await fs
      .stat(join(dataDir, "projections", `${arch.artifact_id}.md`))
      .then(() => true)
      .catch(() => false);
    const ifaceProj = await fs
      .stat(join(dataDir, "projections", `${iface.artifact_id}.md`))
      .then(() => true)
      .catch(() => false);

    expect(archProj).toBe(true);
    expect(ifaceProj).toBe(true);
  });
});
