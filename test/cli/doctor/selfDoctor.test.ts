import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runSelfDoctor } from "../../../src/cli/doctor/selfDoctor.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("runSelfDoctor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pantheon-test-selfdoc-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fails if missing src/ and dist/", () => {
    const res = runSelfDoctor(tmpDir);
    expect(res.ready).toBe(false);
    expect(res.checks.find(c => c.id === "src_dir")?.status).toBe("fail");
    expect(res.checks.find(c => c.id === "dist_cli")?.status).toBe("fail");
  });

  it("passes when all internal directories exist", () => {
    mkdirSync(join(tmpDir, "src"));
    mkdirSync(join(tmpDir, "test"));
    mkdirSync(join(tmpDir, "dist", "src", "cli"), { recursive: true });
    writeFileSync(join(tmpDir, "dist", "src", "cli", "pantheon.js"), "");
    
    mkdirSync(join(tmpDir, "action", "dist"), { recursive: true });
    writeFileSync(join(tmpDir, "action", "dist", "index.js"), "");
    
    mkdirSync(join(tmpDir, "data", "dogfood"), { recursive: true });
    mkdirSync(join(tmpDir, "docs", "closed-alpha"), { recursive: true });

    const res = runSelfDoctor(tmpDir);
    expect(res.ready).toBe(true);
  });
});
