/**
 * DecisionLog — Tests
 *
 * ref: P7b-004
 */

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendDecisionEntry,
  readDecisionLog,
  type DecisionEntry,
} from "../../src/cockpit/decisionLog.js";

function makeTmpDir(): string {
  return join(tmpdir(), `pantheon_test_dl_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

function makeEntry(id: string): DecisionEntry {
  return {
    decision_id: id,
    decision_type: "accepted_with_residual_issues",
    operator_id: "test_operator",
    release_decision_id: `rel_${id}`,
    affected_artifacts: ["art_a", "art_b"],
    canonical_revision_ids: { art_a: "rev_1", art_b: "rev_2" },
    rationale: "Test rationale",
    created_at: new Date().toISOString(),
  };
}

describe("P7b-004: DecisionLog", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it("returns empty array when no log exists", async () => {
    const entries = await readDecisionLog(dataDir);
    expect(entries).toEqual([]);
  });

  it("appends and reads a single entry", async () => {
    const entry = makeEntry("dec_001");
    await appendDecisionEntry(dataDir, entry);
    const entries = await readDecisionLog(dataDir);
    expect(entries.length).toBe(1);
    expect(entries[0].decision_id).toBe("dec_001");
  });

  it("appends multiple entries preserving order", async () => {
    await appendDecisionEntry(dataDir, makeEntry("dec_001"));
    await appendDecisionEntry(dataDir, makeEntry("dec_002"));
    await appendDecisionEntry(dataDir, makeEntry("dec_003"));
    const entries = await readDecisionLog(dataDir);
    expect(entries.length).toBe(3);
    expect(entries.map(e => e.decision_id)).toEqual(["dec_001", "dec_002", "dec_003"]);
  });

  it("stores as JSONL format", async () => {
    await appendDecisionEntry(dataDir, makeEntry("dec_001"));
    await appendDecisionEntry(dataDir, makeEntry("dec_002"));
    const content = await fs.readFile(
      join(dataDir, "decisions", "decisions.jsonl"), "utf8"
    );
    const lines = content.split("\n").filter(l => l.trim());
    expect(lines.length).toBe(2);
    // Each line is valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("preserves all provenance fields", async () => {
    const entry = makeEntry("dec_full");
    entry.affected_artifacts = ["x", "y", "z"];
    entry.canonical_revision_ids = { x: "r1", y: "r2", z: "r3" };
    await appendDecisionEntry(dataDir, entry);
    const [read] = await readDecisionLog(dataDir);
    expect(read.affected_artifacts).toEqual(["x", "y", "z"]);
    expect(read.canonical_revision_ids).toEqual({ x: "r1", y: "r2", z: "r3" });
    expect(read.operator_id).toBe("test_operator");
    expect(read.release_decision_id).toBe("rel_dec_full");
  });
});
