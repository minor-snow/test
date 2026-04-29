import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { writeGitHubActionOutputs } from "../../src/github/githubActionOutputs.js";
describe("githubActionOutputs", () => {
    const tmpDir = join("test", "github", "__tmp_outputs__");
    const outputPath = join(tmpDir, "github-output.txt");
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        mkdirSync(tmpDir, { recursive: true });
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("writes single-line and multiline outputs", () => {
        writeGitHubActionOutputs({ GITHUB_OUTPUT: outputPath }, {
            repair_id: "repair_abc123",
            summary: "line one\nline two",
        });
        const output = readFileSync(outputPath, "utf-8");
        expect(output).toContain("repair_id=repair_abc123");
        expect(output).toContain("summary<<PANTHEON_OUTPUT_");
        expect(output).toContain("line one");
        expect(output).toContain("line two");
    });
});
//# sourceMappingURL=githubActionOutputs.test.js.map