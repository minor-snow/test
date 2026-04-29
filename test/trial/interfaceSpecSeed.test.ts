/**
 * InterfaceSpec Seed — Tests
 *
 * ref: P7a-003
 */

import { describe, it, expect } from "vitest";
import { createInterfaceSpecSeed } from "../../src/trial/interfaceSpecSeed.js";
import { createTrialArtifact } from "../../src/trial/trialArtifact.js";
import { lintArtifact } from "../../src/linter.js";
import { crossLintArtifacts } from "../../src/crossArtifactLinter.js";
import { computeBlockContentHash, computeRevisionId } from "../../src/hash.js";

describe("P7a-003: InterfaceSpec Seed", () => {
  it("produces a valid InterfaceSpec artifact", () => {
    const seed = createInterfaceSpecSeed();
    expect(seed.artifact_id).toBe("pantheon_interface");
    expect(seed.artifact_type).toBe("InterfaceSpec");
    expect(seed.schema_version).toBe("interface_spec@0.1.0");
    expect(seed.revision_id).toMatch(/^rev_/);
  });

  it("has 3 sections and 20 blocks", () => {
    const seed = createInterfaceSpecSeed();
    expect(seed.sections.length).toBe(3);

    const totalBlocks = seed.sections.reduce(
      (sum, s) => sum + s.commitments.length, 0
    );
    expect(totalBlocks).toBe(20);
  });

  it("has deterministic block IDs", () => {
    const s1 = createInterfaceSpecSeed();
    const s2 = createInterfaceSpecSeed();

    const ids1 = s1.sections.flatMap(s => s.commitments.map(b => b.block_id));
    const ids2 = s2.sections.flatMap(s => s.commitments.map(b => b.block_id));
    expect(ids1).toEqual(ids2);
  });

  it("has deterministic revision ID", () => {
    const s1 = createInterfaceSpecSeed();
    const s2 = createInterfaceSpecSeed();
    expect(s1.revision_id).toBe(s2.revision_id);
  });

  it("has valid content hashes for all blocks", () => {
    const seed = createInterfaceSpecSeed();
    for (const section of seed.sections) {
      for (const block of section.commitments) {
        const expected = computeBlockContentHash(block);
        expect(block.content_hash).toBe(expected);
      }
    }
  });

  it("local linter finds expected issues", () => {
    const seed = createInterfaceSpecSeed();
    const issues = lintArtifact(seed);

    const byType: Record<string, number> = {};
    for (const i of issues) {
      byType[i.issue_type] = (byType[i.issue_type] || 0) + 1;
    }

    // At least 1 unsafe_canonical_commit and some undefined_terms
    expect(byType["unsafe_canonical_commit"]).toBeGreaterThanOrEqual(1);
    expect(byType["undefined_term"]).toBeGreaterThanOrEqual(2);
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });

  it("cross-linter finds orphan_interface_contract issues", () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();
    const issues = crossLintArtifacts([arch, iface]);

    const orphans = issues.filter(i => i.issue_type === "orphan_interface_contract");
    expect(orphans.length).toBe(3);  // 3 interface blocks without links
  });

  it("cross-linter finds stale_link issues", () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();
    const issues = crossLintArtifacts([arch, iface]);

    const stale = issues.filter(i => i.issue_type === "stale_link");
    expect(stale.length).toBe(2);  // 2 blocks referencing non-existent arch blocks
  });

  it("prints issue breakdown (diagnostic)", () => {
    const arch = createTrialArtifact();
    const iface = createInterfaceSpecSeed();

    const localIssues = lintArtifact(iface);
    const crossIssues = crossLintArtifacts([arch, iface]);

    const byType: Record<string, number> = {};
    for (const i of [...localIssues, ...crossIssues]) {
      byType[i.issue_type] = (byType[i.issue_type] || 0) + 1;
    }

    console.log("\n  InterfaceSpec seed issue breakdown:");
    console.log(`    Local issues: ${localIssues.length}`);
    console.log(`    Cross issues: ${crossIssues.length}`);
    for (const [type, count] of Object.entries(byType)) {
      console.log(`    ${type}: ${count}`);
    }
  });
});
