import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { runGitHubRepairAction } from "../../src/github/githubRepairRunner.js";
import { cmdRepairAudit, cmdRepairIntake, cmdRepairPlan } from "../../src/cli/cmdRepair.js";
describe("githubRepairRunner", () => {
    const tmpDir = join(tmpdir(), "pantheon-github-repair-runner");
    const fixtureDir = join("test", "fixtures", "repo_fixture");
    beforeEach(() => {
        safeRemoveDir(tmpDir);
        mkdirSync(tmpDir, { recursive: true });
        cpSync(fixtureDir, tmpDir, { recursive: true });
        writeFileSync(join(tmpDir, "pantheon.alpha.json"), JSON.stringify({
            version: 1,
            protected: [".pantheon/**", ".git/**", "node_modules/**"],
            review_required: [],
            generated: ["dist/**"],
            path_roles: {
                "dist/**": "generated",
            },
            repo_observation: {},
        }, null, 2));
    });
    afterEach(() => {
        safeRemoveDir(tmpDir);
    });
    it("runs the repair_id main path against a PR base diff and returns pass", async () => {
        initializeGitRepo(tmpDir);
        const baseSha = gitStdout(tmpDir, "git rev-parse HEAD");
        const session = cmdRepairIntake({
            repoRoot: tmpDir,
            intent: "Fix formatting bug",
            suspectPaths: ["src/utils/format.ts"],
            failingTests: ["tests/utils/format.test.ts"],
            mustPreserve: [],
        });
        cmdRepairPlan({
            repoRoot: tmpDir,
            repairId: session.repair_id,
            configPath: "pantheon.alpha.json",
        });
        cmdRepairAudit({
            repoRoot: tmpDir,
            repairId: session.repair_id,
            targetRevision: 1,
            gate: "repair_plan",
            decision: "approve",
            reason: "Auto-approved for test setup.",
            operatorId: "test",
            addReview: [],
            addForbid: [],
            addMustPreserve: [],
        });
        writeFileSync(join(tmpDir, "src", "utils", "format.ts"), "export function formatValue(v: string): string { return v.trim(); }\n");
        execSync("git add src/utils/format.ts", { cwd: tmpDir, stdio: "pipe" });
        execSync("git commit -m repair-change", { cwd: tmpDir, stdio: "pipe" });
        const headSha = gitStdout(tmpDir, "git rev-parse HEAD");
        const eventPath = join(tmpDir, "event.json");
        writeFileSync(eventPath, JSON.stringify({
            number: 1,
            repository: { name: "pantheon", owner: { login: "minor-snow" } },
            pull_request: {
                title: "Fix formatting bug",
                base: { sha: baseSha },
                head: { sha: headSha },
            },
        }, null, 2));
        const result = await runGitHubRepairAction({
            GITHUB_WORKSPACE: tmpDir,
            GITHUB_EVENT_PATH: eventPath,
            INPUT_MODE: "repair",
            INPUT_REPAIR_ID: session.repair_id,
            INPUT_CONFIG_PATH: "pantheon.alpha.json",
            INPUT_POST_COMMENT: "false",
        });
        expect(result.verdict).toBe("pass");
        expect(result.runPhase).toBe("checked");
        expect(result.check?.changed_files).toContain("src/utils/format.ts");
        expect(result.artifactOutputDirRelative).toBe("pantheon-repair-report");
        expect(existsSync(join(tmpDir, "pantheon-repair-report", "repair_feedback.md"))).toBe(true);
    });
    it("runs the agent_bug_report secondary path and stops at plan_pending_audit by default", async () => {
        const reportPath = join(tmpDir, ".pantheon", "repair", "inbox", "agent_bug_report.json");
        mkdirSync(join(tmpDir, ".pantheon", "repair", "inbox"), { recursive: true });
        writeFileSync(reportPath, JSON.stringify({
            schema_version: "agent_bug_report@0.1.0",
            report_id: "bug_report_auth_login",
            reported_by: { agent: "claude-code", session_id: "session-123" },
            summary: "Fix login auth regression",
            observed_behavior: "Login rejects valid credentials.",
            expected_behavior: "Valid credentials should authenticate successfully.",
            evidence: [
                { kind: "failing_test", path: "test/auth/login.test.ts", test_name: "should authenticate valid user" },
                { kind: "code_observation", path: "src/auth/login.ts", summary: "Authentication flow is routed through login.ts" },
            ],
            suspected_files: [
                { path: "src/auth/login.ts", confidence: "medium", reason: "Contains the login path" },
            ],
            agent_hypothesis: "The login helper is delegating to the wrong validation path.",
            requested_action: "repair_analysis",
        }, null, 2));
        const result = await runGitHubRepairAction({
            GITHUB_WORKSPACE: tmpDir,
            INPUT_MODE: "repair",
            INPUT_AGENT_BUG_REPORT: ".pantheon/repair/inbox/agent_bug_report.json",
            INPUT_CONFIG_PATH: "pantheon.alpha.json",
            INPUT_POST_COMMENT: "false",
            INPUT_AUDIT_MODE: "require_plan_approval",
        });
        expect(result.runPhase).toBe("plan_pending_audit");
        expect(result.verdict).toBe("requires_review");
        expect(result.check).toBeNull();
        expect(readFileSync(join(tmpDir, "pantheon-repair-report", "repair_task.md"), "utf-8")).toContain("Pantheon Repair Task");
    });
    it("returns requires_replan when the PR base no longer matches the repair contract", async () => {
        initializeGitRepo(tmpDir);
        const contractBase = gitStdout(tmpDir, "git rev-parse HEAD");
        const session = cmdRepairIntake({
            repoRoot: tmpDir,
            intent: "Fix formatting bug",
            suspectPaths: ["src/utils/format.ts"],
            failingTests: ["tests/utils/format.test.ts"],
            mustPreserve: [],
        });
        cmdRepairPlan({
            repoRoot: tmpDir,
            repairId: session.repair_id,
            configPath: "pantheon.alpha.json",
        });
        cmdRepairAudit({
            repoRoot: tmpDir,
            repairId: session.repair_id,
            targetRevision: 1,
            gate: "repair_plan",
            decision: "approve",
            reason: "Auto-approved for test setup.",
            operatorId: "test",
            addReview: [],
            addForbid: [],
            addMustPreserve: [],
        });
        writeFileSync(join(tmpDir, "README.md"), "# base advanced\n");
        execSync("git add README.md", { cwd: tmpDir, stdio: "pipe" });
        execSync("git commit -m advance-base", { cwd: tmpDir, stdio: "pipe" });
        const newBase = gitStdout(tmpDir, "git rev-parse HEAD");
        writeFileSync(join(tmpDir, "src", "utils", "format.ts"), "export function formatValue(v: string): string { return v.trim().toUpperCase(); }\n");
        execSync("git add src/utils/format.ts", { cwd: tmpDir, stdio: "pipe" });
        execSync("git commit -m head-change", { cwd: tmpDir, stdio: "pipe" });
        const headSha = gitStdout(tmpDir, "git rev-parse HEAD");
        const eventPath = join(tmpDir, "event.json");
        writeFileSync(eventPath, JSON.stringify({
            number: 2,
            repository: { name: "pantheon", owner: { login: "minor-snow" } },
            pull_request: {
                title: "Fix formatting bug",
                base: { sha: newBase },
                head: { sha: headSha },
            },
        }, null, 2));
        const result = await runGitHubRepairAction({
            GITHUB_WORKSPACE: tmpDir,
            GITHUB_EVENT_PATH: eventPath,
            INPUT_MODE: "repair",
            INPUT_REPAIR_ID: session.repair_id,
            INPUT_CONFIG_PATH: "pantheon.alpha.json",
            INPUT_POST_COMMENT: "false",
        });
        expect(contractBase).not.toBe(newBase);
        expect(result.verdict).toBe("requires_replan");
        expect(result.check?.findings.some(finding => finding.kind === "stale_repair_contract")).toBe(true);
    });
});
function initializeGitRepo(repoRoot) {
    execSync("git init", { cwd: repoRoot, stdio: "pipe" });
    execSync("git config user.email pantheon@example.com", { cwd: repoRoot, stdio: "pipe" });
    execSync("git config user.name Pantheon", { cwd: repoRoot, stdio: "pipe" });
    execSync("git add .", { cwd: repoRoot, stdio: "pipe" });
    execSync("git commit -m initial", { cwd: repoRoot, stdio: "pipe" });
}
function gitStdout(repoRoot, command) {
    return execSync(command, {
        cwd: repoRoot,
        stdio: "pipe",
        encoding: "utf-8",
    }).trim();
}
function safeRemoveDir(target) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            rmSync(target, { recursive: true, force: true });
            return;
        }
        catch {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
        }
    }
    rmSync(target, { recursive: true, force: true });
}
//# sourceMappingURL=githubRepairRunner.test.js.map