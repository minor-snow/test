import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { runGitHubAction } from "../../src/github/githubActionEntry.js";

describe("githubActionEntry", () => {
  const tmpDir = join("test", "github", "__tmp_action__");
  const originalFetch = global.fetch;

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "pantheon.json"), JSON.stringify({ version: 1, protected: [".pantheon/**"], review_required: [] }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("runs compiled-cli wrapper with base sha, writes summary and artifacts, and exits non-failing for review case", async () => {
    const cliStubPath = join(tmpDir, "cli-stub.mjs");
    const eventPath = join(tmpDir, "event.json");
    const summaryPath = join(tmpDir, "step-summary.md");

    writeFileSync(eventPath, JSON.stringify({
      number: 42,
      repository: { name: "saleor", owner: { login: "saleor" } },
      pull_request: {
        title: "Add eco fee",
        base: { sha: "base-sha-123456" },
        head: { sha: "head-sha-654321" },
      },
    }, null, 2));

    writeFileSync(cliStubPath, `
      import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
      import { join } from "node:path";
      const args = process.argv.slice(2);
      const repoIdx = args.indexOf("--repo");
      const repoRoot = repoIdx >= 0 ? args[repoIdx + 1] : process.cwd();
      mkdirSync(join(repoRoot, ".pantheon"), { recursive: true });
      appendFileSync(join(repoRoot, "cli-invocations.log"), JSON.stringify(args) + "\\n");
      if (args[0] === "guard") {
        writeFileSync(join(repoRoot, ".pantheon", "task.md"), "# Task\\n");
        writeFileSync(join(repoRoot, ".pantheon", "scope.md"), "# Scope\\n");
      }
      if (args[0] === "check") {
        writeFileSync(join(repoRoot, ".pantheon", "check.json"), JSON.stringify({
          schema_version: "pantheon_check.v1",
          verdict: "requires_review",
          intent: "Add eco fee",
          summary: { changed_files: 3, in_scope: 2, review_required: 1, outside_scope: 0, forbidden: 0 },
          findings: [{
            kind: "requires_human_review",
            severity: "review_required",
            file: "saleor/order/models.py",
            message: "Review required",
            allowed_actions: [],
            requires_human: true
          }],
          artifacts: { task: ".pantheon/task.md", scope: ".pantheon/scope.md", report: ".pantheon/report.md", feedback: ".pantheon/feedback.md" },
          repo: { label: "saleor", head_commit: "base-sha-123456", state: "checked" }
        }, null, 2));
        writeFileSync(join(repoRoot, ".pantheon", "report.md"), "# Report\\n");
        writeFileSync(join(repoRoot, ".pantheon", "feedback.md"), "# Feedback\\n");
        writeFileSync(join(repoRoot, ".pantheon", "python_report.md"), "# Python\\n");
      }
    `);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    } as Response);

    const result = await runGitHubAction({
      GITHUB_WORKSPACE: tmpDir,
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_TOKEN: "token",
      INPUT_SCOPE: "saleor/checkout/**",
      INPUT_REVIEW: "saleor/order/**",
      INPUT_FORBID: "saleor/payment/**",
      INPUT_FAIL_ON: "forbidden,outside_scope",
      INPUT_POST_COMMENT: "false",
      INPUT_ARTIFACT_MODE: "public",
      INPUT_CONFIG_PATH: "pantheon.json",
      PANTHEON_CLI_ENTRY: cliStubPath,
    });

    const invocations = readFileSync(join(tmpDir, "cli-invocations.log"), "utf-8").trim().split(/\r?\n/).map(line => JSON.parse(line) as string[]);

    expect(invocations[0]).toContain("--config");
    expect(invocations[1]).toContain("--base");
    expect(invocations[1]).toContain("base-sha-123456");
    expect(result.exitDecision.shouldFail).toBe(false);
    expect(readFileSync(summaryPath, "utf-8")).toContain("requires_review");
    expect(readFileSync(join(result.artifactOutputDir, "check.json"), "utf-8")).toContain("requires_review");
    expect(readFileSync(result.commentPath, "utf-8")).toContain("saleor/order/models.py");
  });

  it("skips staging public artifacts when upload_artifacts is false", async () => {
    const cliStubPath = join(tmpDir, "cli-stub-no-upload.mjs");
    const eventPath = join(tmpDir, "event.json");

    writeFileSync(eventPath, JSON.stringify({
      number: 7,
      repository: { name: "saleor", owner: { login: "saleor" } },
      pull_request: {
        title: "Add eco fee",
        base: { sha: "base-sha-123456" },
        head: { sha: "head-sha-654321" },
      },
    }, null, 2));

    writeFileSync(cliStubPath, `
      import { mkdirSync, writeFileSync } from "node:fs";
      import { join } from "node:path";
      const args = process.argv.slice(2);
      const repoIdx = args.indexOf("--repo");
      const repoRoot = repoIdx >= 0 ? args[repoIdx + 1] : process.cwd();
      mkdirSync(join(repoRoot, ".pantheon"), { recursive: true });
      if (args[0] === "guard") {
        writeFileSync(join(repoRoot, ".pantheon", "task.md"), "# Task\\n");
        writeFileSync(join(repoRoot, ".pantheon", "scope.md"), "# Scope\\n");
      }
      if (args[0] === "check") {
        writeFileSync(join(repoRoot, ".pantheon", "check.json"), JSON.stringify({
          schema_version: "pantheon_check.v1",
          verdict: "pass",
          intent: "Add eco fee",
          summary: { changed_files: 1, in_scope: 1, review_required: 0, outside_scope: 0, forbidden: 0 },
          findings: [],
          artifacts: { task: ".pantheon/task.md", scope: ".pantheon/scope.md", report: ".pantheon/report.md", feedback: ".pantheon/feedback.md" },
          repo: { label: "saleor", head_commit: "base-sha-123456", state: "checked" }
        }, null, 2));
        writeFileSync(join(repoRoot, ".pantheon", "report.md"), "# Report\\n");
        writeFileSync(join(repoRoot, ".pantheon", "feedback.md"), "# Feedback\\n");
      }
    `);

    const result = await runGitHubAction({
      GITHUB_WORKSPACE: tmpDir,
      GITHUB_EVENT_PATH: eventPath,
      INPUT_SCOPE: "saleor/checkout/**",
      INPUT_POST_COMMENT: "false",
      INPUT_UPLOAD_ARTIFACTS: "false",
      PANTHEON_CLI_ENTRY: cliStubPath,
    });

    expect(readFileSync(result.commentPath, "utf-8")).toContain("Pantheon Boundary Check [PASS]");
    expect(() => readFileSync(join(result.artifactOutputDir, "check.json"), "utf-8")).toThrow();
  });
});
