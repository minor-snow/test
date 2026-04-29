import { execSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
const tmpDir = join(__dirname, "__tmp_npm_pack_2__");
const repoRoot = join(__dirname, "../..");
describe("npmPackSmoke", () => {
    beforeAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        mkdirSync(tmpDir, { recursive: true });
    });
    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("can pack and install the alpha harness", () => {
        // Pack the package
        const packOutput = execSync("npm pack", { cwd: repoRoot, encoding: "utf-8" }).trim();
        // npm pack outputs the tarball name on the last line
        const tarballName = packOutput.split("\n").pop()?.trim() || "";
        expect(tarballName).toMatch(/pantheon-alpha-0\.1\.0-alpha\.0\.tgz/);
        const tarballPath = join(repoRoot, tarballName);
        expect(existsSync(tarballPath)).toBe(true);
        // Initialize an empty repo and install the tarball
        execSync("npm init -y", { cwd: tmpDir });
        execSync(`npm install ${tarballPath}`, { cwd: tmpDir });
        // Verify bin is accessible and we can run init
        const initOutput = execSync("npx pantheon-alpha init --no-github", { cwd: tmpDir, encoding: "utf-8" });
        expect(initOutput).toContain("Initialization complete");
        expect(existsSync(join(tmpDir, "AGENTS.md"))).toBe(true);
        // Verify doctor passes
        try {
            const doctorOutput = execSync("npx pantheon-alpha doctor", { cwd: tmpDir, encoding: "utf-8" });
            expect(doctorOutput).toContain("Agent-usable repo: yes");
        }
        catch (e) {
            console.error("Doctor stdout:", e.stdout);
            console.error("Doctor stderr:", e.stderr);
            throw e;
        }
        // Clean up tarball
        rmSync(tarballPath, { force: true });
    }, 120000);
});
//# sourceMappingURL=npmPackSmoke.test.js.map