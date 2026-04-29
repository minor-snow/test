import { existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cmdAlphaInit } from "../../src/alpha/alphaInit.js";
const tmpDir = join(__dirname, "__tmp_alpha_init__");
describe("alphaInit", () => {
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("creates all required files on init", () => {
        cmdAlphaInit({ repoRoot: tmpDir, noGithub: false });
        expect(existsSync(join(tmpDir, "AGENTS.md"))).toBe(true);
        expect(existsSync(join(tmpDir, "pantheon.agent.json"))).toBe(true);
        expect(existsSync(join(tmpDir, "pantheon.alpha.json"))).toBe(true);
        expect(existsSync(join(tmpDir, ".pantheon/repair/inbox/agent_bug_report.template.json"))).toBe(true);
        expect(existsSync(join(tmpDir, ".github/workflows/pantheon-repair.yml"))).toBe(true);
        expect(existsSync(join(tmpDir, "docs/pantheon/agent-quickstart.md"))).toBe(true);
        const alphaConfig = JSON.parse(readFileSync(join(tmpDir, "pantheon.alpha.json"), "utf-8"));
        expect(alphaConfig.artifact_mode).toBe("public");
    });
    it("respects options", () => {
        cmdAlphaInit({ repoRoot: tmpDir, noGithub: true, artifactMode: "debug" });
        expect(existsSync(join(tmpDir, ".github/workflows/pantheon-repair.yml"))).toBe(false);
        const alphaConfig = JSON.parse(readFileSync(join(tmpDir, "pantheon.alpha.json"), "utf-8"));
        expect(alphaConfig.artifact_mode).toBe("debug");
        expect(alphaConfig.github.enabled).toBe(false);
    });
    it("does not overwrite by default but does with --force", () => {
        cmdAlphaInit({ repoRoot: tmpDir });
        const agentJsonPath = join(tmpDir, "pantheon.agent.json");
        writeFileSync(agentJsonPath, '{"modified": true}');
        // Init again without force
        cmdAlphaInit({ repoRoot: tmpDir });
        let content = readFileSync(agentJsonPath, "utf-8");
        expect(content).toBe('{"modified": true}');
        // Init with force
        cmdAlphaInit({ repoRoot: tmpDir, force: true });
        content = readFileSync(agentJsonPath, "utf-8");
        expect(content).not.toBe('{"modified": true}');
        expect(JSON.parse(content).schema_version).toBe("pantheon_agent_entry@0.1.0");
    });
});
//# sourceMappingURL=alphaInit.test.js.map