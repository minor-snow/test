/**
 * P24: Attempt History Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ensurePantheonDirs } from "../../src/cli/artifactLayout.js";
import {
  nextAttemptNumber,
  ensureAttemptDir,
  writeAttemptArtifacts,
  loadAttemptHistory,
  enrichCheckWithHistory,
} from "../../src/cli/attemptHistory.js";
import { buildPublicGuardBaseline } from "../../src/cli/publicCheckProjection.js";

describe("attemptHistory", () => {
  const tmpDir = join("test", "cli", "__tmp_attempts__");

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    ensurePantheonDirs(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("nextAttemptNumber", () => {
    it("returns 1 for empty repo", () => {
      expect(nextAttemptNumber(tmpDir)).toBe(1);
    });

    it("returns 2 after one attempt", () => {
      ensureAttemptDir(tmpDir, 1);
      expect(nextAttemptNumber(tmpDir)).toBe(2);
    });

    it("returns max+1 with gaps", () => {
      ensureAttemptDir(tmpDir, 1);
      ensureAttemptDir(tmpDir, 5);
      expect(nextAttemptNumber(tmpDir)).toBe(6);
    });
  });

  describe("writeAttemptArtifacts", () => {
    it("writes all four artifacts", () => {
      const dir = ensureAttemptDir(tmpDir, 1);
      writeAttemptArtifacts(dir, {
        reportMd: "# Report",
        feedbackMd: "# Feedback",
        checkJson: '{"verdict":"pass"}',
        diffNameStatus: "M\tsrc/a.ts",
      });

      expect(existsSync(join(dir, "report.md"))).toBe(true);
      expect(existsSync(join(dir, "feedback.md"))).toBe(true);
      expect(existsSync(join(dir, "check.json"))).toBe(true);
      expect(existsSync(join(dir, "diff_name_status.txt"))).toBe(true);
      expect(readFileSync(join(dir, "report.md"), "utf-8")).toBe("# Report");
    });
  });

  describe("loadAttemptHistory", () => {
    it("returns empty for no attempts", () => {
      expect(loadAttemptHistory(tmpDir)).toEqual([]);
    });

    it("loads single attempt", () => {
      const dir = ensureAttemptDir(tmpDir, 1);
      writeAttemptArtifacts(dir, {
        reportMd: "#",
        feedbackMd: "#",
        checkJson: JSON.stringify({
          verdict: "requires_reverse_issue",
          summary: { outside_scope: 2, forbidden: 0 },
          timestamp: "2026-04-27T00:00:00Z",
        }),
        diffNameStatus: "",
      });

      const history = loadAttemptHistory(tmpDir);
      expect(history).toHaveLength(1);
      expect(history[0].attempt).toBe(1);
      expect(history[0].verdict).toBe("requires_reverse_issue");
    });

    it("loads multiple attempts in order", () => {
      for (const n of [1, 2, 3]) {
        const dir = ensureAttemptDir(tmpDir, n);
        writeAttemptArtifacts(dir, {
          reportMd: "#",
          feedbackMd: "#",
          checkJson: JSON.stringify({
            verdict: n === 3 ? "pass" : "fail",
            summary: { outside_scope: 3 - n, forbidden: 0 },
          }),
          diffNameStatus: "",
        });
      }

      const history = loadAttemptHistory(tmpDir);
      expect(history).toHaveLength(3);
      expect(history[0].attempt).toBe(1);
      expect(history[2].verdict).toBe("pass");
    });
  });

  describe("enrichCheckWithHistory", () => {
    it("adds attempt number and history array", () => {
      const check = buildPublicGuardBaseline({
        intent: "test",
        allowedCount: 1,
        reviewRequiredCount: 0,
        forbiddenCount: 1,
        repo: { label: "repo", head_commit: null, state: "clean" },
      });

      const enriched = enrichCheckWithHistory(check, 2, [
        { attempt: 1, verdict: "fail", violation_count: 3, artifact_dir: "x", timestamp: "T" },
      ]);

      expect(enriched.attempt).toBe(2);
      expect(enriched.history).toHaveLength(1);
      expect(enriched.schema_version).toBe("pantheon_check.v1");
    });
  });
});
