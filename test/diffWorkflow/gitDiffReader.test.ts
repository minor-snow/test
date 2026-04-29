/**
 * P21: Git Diff Reader Tests
 *
 * Tests the override path and name-status parsing.
 * Git integration tests are limited since fixture repo has no git init.
 */

import { describe, it, expect } from "vitest";
import { readGitDiffSummary, extractChangedFilePaths } from "../../src/diffWorkflow/gitDiffReader.js";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const FIXTURE_ROOT = join(import.meta.dirname, "..", "fixtures", "repo_fixture");

describe("readGitDiffSummary", () => {
  describe("--changed override", () => {
    it("uses override when provided", () => {
      const result = readGitDiffSummary({
        repoRoot: FIXTURE_ROOT,
        baseRef: "HEAD",
        changedFilesOverride: ["src/auth/login.ts", "test/auth/login.test.ts"],
      });
      expect(result.changed_files).toHaveLength(2);
      expect(result.changed_files[0].path).toBe("src/auth/login.ts");
      expect(result.changed_files[0].status).toBe("modified");
      expect(result.warnings).toHaveLength(0);
    });

    it("normalizes backslash paths in override", () => {
      const result = readGitDiffSummary({
        repoRoot: FIXTURE_ROOT,
        baseRef: "HEAD",
        changedFilesOverride: ["src\\auth\\login.ts"],
      });
      expect(result.changed_files[0].path).toBe("src/auth/login.ts");
    });

    it("empty override falls through to git", () => {
      const result = readGitDiffSummary({
        repoRoot: FIXTURE_ROOT,
        baseRef: "HEAD",
        changedFilesOverride: [],
      });
      // Fixture has no git, so should get a warning
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("preserves base_ref", () => {
      const result = readGitDiffSummary({
        repoRoot: FIXTURE_ROOT,
        baseRef: "abc123",
        changedFilesOverride: ["src/a.ts"],
      });
      expect(result.base_ref).toBe("abc123");
    });
  });

  describe("non-git repo", () => {
    it("returns warning when not a git repo", () => {
      const result = readGitDiffSummary({
        repoRoot: FIXTURE_ROOT,
        baseRef: "HEAD",
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.changed_files).toHaveLength(0);
    });

    it("warning message is actionable", () => {
      const result = readGitDiffSummary({
        repoRoot: FIXTURE_ROOT,
        baseRef: "HEAD",
      });
      const hasActionable = result.warnings.some(
        w => w.includes("--changed") || w.includes("git"),
      );
      expect(hasActionable).toBe(true);
    });
  });

  describe("git repo integration", () => {
    function withTempRepo(run: (repoRoot: string) => void): void {
      const repoRoot = mkdtempSync(join(tmpdir(), "pantheon-git-diff-"));
      try {
        execSync("git init", { cwd: repoRoot, stdio: "ignore" });
        execSync('git config user.name "Pantheon Test"', { cwd: repoRoot, stdio: "ignore" });
        execSync('git config user.email "pantheon@example.com"', { cwd: repoRoot, stdio: "ignore" });
        mkdirSync(join(repoRoot, "src"), { recursive: true });
        writeFileSync(join(repoRoot, "src", "tracked.ts"), "export const value = 1;\n");
        execSync("git add .", { cwd: repoRoot, stdio: "ignore" });
        execSync('git commit -m "init"', { cwd: repoRoot, stdio: "ignore" });
        run(repoRoot);
      } finally {
        rmSync(repoRoot, { recursive: true, force: true });
      }
    }

    it("ignores untracked files when baseRef is provided", () => {
      withTempRepo(repoRoot => {
        writeFileSync(join(repoRoot, "src", "tracked.ts"), "export const value = 2;\n");
        writeFileSync(join(repoRoot, "scratch.txt"), "temp\n");

        const result = readGitDiffSummary({
          repoRoot,
          baseRef: "HEAD",
        });

        expect(result.changed_files).toEqual([
          { path: "src/tracked.ts", status: "modified" },
        ]);
      });
    });

    it("includes untracked files in working-tree mode", () => {
      withTempRepo(repoRoot => {
        writeFileSync(join(repoRoot, "src", "tracked.ts"), "export const value = 2;\n");
        writeFileSync(join(repoRoot, "scratch.txt"), "temp\n");

        const result = readGitDiffSummary({
          repoRoot,
          baseRef: "",
        });

        expect(result.changed_files).toEqual([
          { path: "src/tracked.ts", status: "modified" },
          { path: "scratch.txt", status: "untracked" },
        ]);
      });
    });
  });
});

describe("extractChangedFilePaths", () => {
  it("extracts paths from diff summary", () => {
    const paths = extractChangedFilePaths({
      base_ref: "HEAD",
      changed_files: [
        { path: "src/a.ts", status: "modified" },
        { path: "src/b.ts", status: "added" },
        { path: "test/a.test.ts", status: "untracked" },
      ],
      warnings: [],
    });
    expect(paths).toEqual(["src/a.ts", "src/b.ts", "test/a.test.ts"]);
  });

  it("returns empty array for empty diff", () => {
    const paths = extractChangedFilePaths({
      base_ref: "HEAD",
      changed_files: [],
      warnings: [],
    });
    expect(paths).toEqual([]);
  });
});
