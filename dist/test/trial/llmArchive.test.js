/**
 * LLM Archive — Tests
 *
 * ref: P6-003
 *
 * Verifies crash-safe per-call persistence of LLM prompts,
 * raw outputs, metadata, and validation results.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runTrial } from "../../src/trial/trialRunner.js";
import { createFakeLlmClient } from "../../src/trial/fakeLlmClient.js";
import { createTrialArtifact } from "../../src/trial/trialArtifact.js";
let dataDir;
beforeEach(async () => {
    dataDir = join(tmpdir(), `pantheon-archive-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(dataDir, { recursive: true });
});
function makeValidProposal(artifact, issue) {
    return JSON.stringify({
        proposal_id: `proposal_for_${issue.issue_id}`,
        artifact_id: artifact.artifact_id,
        base_revision_id: artifact.revision_id,
        source_issue_ids: [issue.issue_id],
        operations: [
            {
                op: "replace_block",
                target_block_id: issue.target_block_id,
                replacement_text: "The pipeline enforces deterministic validation at every gate boundary before commit.",
            },
        ],
        schema_version: "patch_proposal@0.1.0",
    });
}
describe("P6-003: Crash-Safe LLM Archive", () => {
    it("creates llm_runs directory per cycle", async () => {
        const seed = createTrialArtifact();
        const issues = (await import("../../src/linter.js")).lintArtifact(seed);
        const firstIssue = issues[0];
        const config = {
            store: { dataDir },
            client: createFakeLlmClient([
                makeValidProposal(seed, firstIssue),
            ]),
            overrideMode: "scripted",
            maxCycles: 1,
        };
        await runTrial(config, seed);
        const archiveDir = join(dataDir, "llm_runs", "cycle_001");
        const stat = await fs.stat(archiveDir);
        expect(stat.isDirectory()).toBe(true);
    });
    it("saves prompt.txt with issue and block info", async () => {
        const seed = createTrialArtifact();
        const issues = (await import("../../src/linter.js")).lintArtifact(seed);
        const firstIssue = issues[0];
        const config = {
            store: { dataDir },
            client: createFakeLlmClient([
                makeValidProposal(seed, firstIssue),
            ]),
            overrideMode: "scripted",
            maxCycles: 1,
        };
        await runTrial(config, seed);
        const prompt = await fs.readFile(join(dataDir, "llm_runs", "cycle_001", "prompt.txt"), "utf8");
        expect(prompt).toContain(firstIssue.issue_id);
        expect(prompt).toContain(firstIssue.target_block_id);
    });
    it("saves metadata.json with complete fields", async () => {
        const seed = createTrialArtifact();
        const issues = (await import("../../src/linter.js")).lintArtifact(seed);
        const firstIssue = issues[0];
        const config = {
            store: { dataDir },
            client: createFakeLlmClient([
                makeValidProposal(seed, firstIssue),
            ]),
            overrideMode: "scripted",
            maxCycles: 1,
        };
        await runTrial(config, seed);
        const raw = await fs.readFile(join(dataDir, "llm_runs", "cycle_001", "metadata.json"), "utf8");
        const meta = JSON.parse(raw);
        expect(meta.cycle).toBe(1);
        expect(meta.issue_id).toBe(firstIssue.issue_id);
        expect(meta.target_block_id).toBe(firstIssue.target_block_id);
        expect(meta.artifact_id).toBe(seed.artifact_id);
        expect(meta.timestamp).toBeTruthy();
    });
    it("saves raw_output.txt", async () => {
        const seed = createTrialArtifact();
        const issues = (await import("../../src/linter.js")).lintArtifact(seed);
        const config = {
            store: { dataDir },
            client: createFakeLlmClient([
                makeValidProposal(seed, issues[0]),
            ]),
            overrideMode: "scripted",
            maxCycles: 1,
        };
        await runTrial(config, seed);
        const raw = await fs.readFile(join(dataDir, "llm_runs", "cycle_001", "raw_output.txt"), "utf8");
        expect(raw).toContain("proposal_for_");
    });
    it("saves validation_result.json with rejection_records", async () => {
        const seed = createTrialArtifact();
        // Deliberately bad output → will be rejected
        const config = {
            store: { dataDir },
            client: createFakeLlmClient(["not valid json at all"]),
            overrideMode: "scripted",
            maxCycles: 1,
        };
        const report = await runTrial(config, seed);
        expect(report.cycles[0].mechanicalRejection).toBe(true);
        const raw = await fs.readFile(join(dataDir, "llm_runs", "cycle_001", "validation_result.json"), "utf8");
        const vr = JSON.parse(raw);
        expect(vr.status).toBe("rejected");
        expect(vr.rejection_records.length).toBeGreaterThan(0);
    });
    it("prompt + raw_output exist even when validation rejects", async () => {
        const seed = createTrialArtifact();
        const config = {
            store: { dataDir },
            client: createFakeLlmClient(["garbage output"]),
            overrideMode: "scripted",
            maxCycles: 1,
        };
        await runTrial(config, seed);
        // Crash-safe: prompt and raw_output should exist regardless
        const promptExists = await fs
            .stat(join(dataDir, "llm_runs", "cycle_001", "prompt.txt"))
            .then(() => true)
            .catch(() => false);
        const rawExists = await fs
            .stat(join(dataDir, "llm_runs", "cycle_001", "raw_output.txt"))
            .then(() => true)
            .catch(() => false);
        expect(promptExists).toBe(true);
        expect(rawExists).toBe(true);
    });
});
describe("P6-004: Rejection Categories in TrialReport", () => {
    it("populates rejectionCategories on mechanical rejection", async () => {
        const seed = createTrialArtifact();
        const config = {
            store: { dataDir },
            client: createFakeLlmClient(["invalid json!!!"]),
            overrideMode: "scripted",
            maxCycles: 1,
        };
        const report = await runTrial(config, seed);
        const cycle = report.cycles[0];
        expect(cycle.mechanicalRejection).toBe(true);
        expect(cycle.rejectionCategories.length).toBeGreaterThan(0);
    });
    it("populates rejections_by_category in report", async () => {
        const seed = createTrialArtifact();
        const config = {
            store: { dataDir },
            client: createFakeLlmClient(["not json", "also not json"]),
            overrideMode: "scripted",
            maxCycles: 2,
        };
        const report = await runTrial(config, seed);
        expect(Object.keys(report.rejections_by_category).length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=llmArchive.test.js.map