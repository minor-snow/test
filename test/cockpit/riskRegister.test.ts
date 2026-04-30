/**
 * RiskRegister — Tests
 *
 * ref: P7b-005
 */

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendRiskEntries,
  readRiskRegister,
  type RiskRegisterPathOptions,
  type RiskEntry,
} from "../../src/cockpit/riskRegister.js";

const TRUSTED_ABSOLUTE: RiskRegisterPathOptions = { trustedAbsolute: true };

function makeTmpDir(): string {
  return join(tmpdir(), `pantheon_test_rr_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

function makeRisk(id: string, sourceIssue: string): RiskEntry {
  return {
    risk_id: id,
    source_issue_id: sourceIssue,
    issue_type: "undefined_term",
    severity: "medium",
    block_id: "b_001",
    artifact_id: "art_a",
    canonical_revision_id: "rev_1",
    accepted_by: "test_operator",
    release_decision_id: "dec_001",
    why_accepted: "Low impact, deferring to P8",
    created_at: new Date().toISOString(),
  };
}

describe("P7b-005: RiskRegister", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it("returns empty array when no register exists", async () => {
    const entries = await readRiskRegister(dataDir, TRUSTED_ABSOLUTE);
    expect(entries).toEqual([]);
  });

  it("appends and reads entries", async () => {
    const count = await appendRiskEntries(dataDir, [
      makeRisk("risk_001", "issue_001"),
      makeRisk("risk_002", "issue_002"),
    ], TRUSTED_ABSOLUTE);
    expect(count).toBe(2);
    const entries = await readRiskRegister(dataDir, TRUSTED_ABSOLUTE);
    expect(entries.length).toBe(2);
  });

  it("deduplicates by source_issue_id", async () => {
    await appendRiskEntries(dataDir, [
      makeRisk("risk_001", "issue_001"),
    ], TRUSTED_ABSOLUTE);
    // Try to append same source_issue_id again
    const count = await appendRiskEntries(dataDir, [
      makeRisk("risk_002", "issue_001"),  // same source_issue_id
      makeRisk("risk_003", "issue_003"),  // new
    ], TRUSTED_ABSOLUTE);
    expect(count).toBe(1); // only issue_003 was new
    const entries = await readRiskRegister(dataDir, TRUSTED_ABSOLUTE);
    expect(entries.length).toBe(2);
    expect(entries.map(e => e.source_issue_id)).toEqual(["issue_001", "issue_003"]);
  });

  it("returns 0 when all entries are duplicates", async () => {
    await appendRiskEntries(dataDir, [makeRisk("risk_001", "issue_001")], TRUSTED_ABSOLUTE);
    const count = await appendRiskEntries(dataDir, [makeRisk("risk_002", "issue_001")], TRUSTED_ABSOLUTE);
    expect(count).toBe(0);
  });

  it("preserves provenance fields", async () => {
    const risk = makeRisk("risk_full", "issue_full");
    risk.mitigation = "Will address in P8 with dedicated sprint";
    await appendRiskEntries(dataDir, [risk], TRUSTED_ABSOLUTE);
    const [read] = await readRiskRegister(dataDir, TRUSTED_ABSOLUTE);
    expect(read.risk_id).toBe("risk_full");
    expect(read.mitigation).toBe("Will address in P8 with dedicated sprint");
    expect(read.release_decision_id).toBe("dec_001");
  });

  it("stores as JSONL format", async () => {
    await appendRiskEntries(dataDir, [
      makeRisk("risk_001", "issue_001"),
      makeRisk("risk_002", "issue_002"),
    ], TRUSTED_ABSOLUTE);
    const content = await fs.readFile(join(dataDir, "risks", "risks.jsonl"), "utf8");
    const lines = content.split("\n").filter(l => l.trim());
    expect(lines.length).toBe(2);
  });

  it("rejects directory traversal by default", async () => {
    await expect(readRiskRegister("../outside")).rejects.toThrow(/escapes trusted root/i);
  });
});
