import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cmdAlphaDoctor } from "../../src/alpha/alphaDoctor.js";
import { cmdAlphaInit } from "../../src/alpha/alphaInit.js";

const tmpDir = join(__dirname, "__tmp_alpha_doctor__");

describe("alphaDoctor", () => {
  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("fails on empty repo", () => {
    process.exitCode = undefined;

    cmdAlphaDoctor({ repoRoot: tmpDir });
    expect(process.exitCode).toBe(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Agent-usable repo: no"));
  });

  it("passes on initialized repo", () => {
    process.exitCode = undefined;

    cmdAlphaInit({ repoRoot: tmpDir });
    cmdAlphaDoctor({ repoRoot: tmpDir });
    
    expect(process.exitCode).toBeUndefined();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Agent-usable repo: yes"));
  });

  it("fails on invalid JSON", () => {
    process.exitCode = undefined;

    cmdAlphaInit({ repoRoot: tmpDir });
    writeFileSync(join(tmpDir, "pantheon.agent.json"), "invalid json");
    
    cmdAlphaDoctor({ repoRoot: tmpDir });
    
    expect(process.exitCode).toBe(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[FAIL] pantheon.agent.json: Schema validation failed"));
  });

  it("passes when github is disabled and workflow is absent", () => {
    process.exitCode = undefined;

    cmdAlphaInit({ repoRoot: tmpDir, noGithub: true });
    cmdAlphaDoctor({ repoRoot: tmpDir });

    expect(process.exitCode).toBeUndefined();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Agent-usable repo: yes"));
  });
});
