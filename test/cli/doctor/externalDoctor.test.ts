import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runExternalDoctor } from "../../../src/cli/doctor/externalDoctor.js";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

describe("runExternalDoctor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pantheon-test-extdoc-"));
    // Initialize git
    execSync("git init", { cwd: tmpDir, stdio: "ignore" });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fails if missing pantheon.alpha.json", () => {
    const res = runExternalDoctor(tmpDir);
    expect(res.ready).toBe(false);
    expect(res.checks.find(c => c.id === "pantheon_alpha_json")?.status).toBe("fail");
  });

  it("warns if AGENTS.md is missing but docs/pantheon is present", () => {
    writeFileSync(join(tmpDir, "pantheon.alpha.json"), "{}");
    writeFileSync(join(tmpDir, "pantheon.agent.json"), "{}");
    mkdirSync(join(tmpDir, ".pantheon"));
    
    mkdirSync(join(tmpDir, "docs", "pantheon"), { recursive: true });
    writeFileSync(join(tmpDir, "docs", "pantheon", "setup.md"), "test");

    const res = runExternalDoctor(tmpDir);
    expect(res.ready).toBe(true); // Warnings do not cause ready=false
    expect(res.checks.find(c => c.id === "agents_docs")?.status).toBe("warning");
  });

  it("passes when all standard files are present", () => {
    writeFileSync(join(tmpDir, "pantheon.alpha.json"), "{}");
    writeFileSync(join(tmpDir, "pantheon.agent.json"), "{}");
    mkdirSync(join(tmpDir, ".pantheon"));
    writeFileSync(join(tmpDir, "AGENTS.md"), "test");

    const res = runExternalDoctor(tmpDir);
    expect(res.ready).toBe(true);
    expect(res.checks.every(c => c.status === "pass")).toBe(true);
  });
});
