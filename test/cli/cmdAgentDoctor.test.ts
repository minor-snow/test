import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runAgentDoctor } from "../../src/cli/cmdAgentDoctor.js";

describe("cmdAgentDoctor", () => {
  const tmpDir = join("test", "cli", "__tmp_agent_doctor__");

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(join(tmpDir, ".pantheon", "repair", "inbox"), { recursive: true });
    mkdirSync(join(tmpDir, ".pantheon", "repair", "runs"), { recursive: true });
    mkdirSync(join(tmpDir, "dist", "src", "cli"), { recursive: true });
    mkdirSync(join(tmpDir, "docs", "closed-alpha"), { recursive: true });
    mkdirSync(join(tmpDir, "examples", "github"), { recursive: true });

    writeFileSync(join(tmpDir, "AGENTS.md"), "# AGENTS\n");
    writeFileSync(join(tmpDir, "pantheon.agent.json"), JSON.stringify({
      schema_version: "pantheon_agent_entry@0.1.0",
      primary_entrypoints: { read_first: "AGENTS.md" },
      repair_protocol: {
        requires_repair_id: true,
        latest_is_convenience_only: true,
      },
    }, null, 2));
    writeFileSync(join(tmpDir, ".pantheon", "repair", "inbox", "agent_bug_report.template.json"), "{}\n");
    writeFileSync(join(tmpDir, "dist", "src", "cli", "pantheon.js"), "// compiled\n");
    writeFileSync(join(tmpDir, "docs", "closed-alpha", "agent-quickstart.md"), "# Agent Quickstart\n");
    writeFileSync(join(tmpDir, "examples", "github", "repair-gate.yml"), "name: test\n");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports an agent-usable repo when all entry-surface files exist", () => {
    const result = runAgentDoctor(tmpDir);

    expect(result.ready).toBe(true);
    expect(result.checks.every(check => check.ok)).toBe(true);
    expect(result.nextCommands[0]).toContain("repair intake");
  });

  it("surfaces missing dist CLI and suggests a build", () => {
    rmSync(join(tmpDir, "dist"), { recursive: true, force: true });

    const result = runAgentDoctor(tmpDir);

    expect(result.ready).toBe(false);
    expect(result.checks.find(check => check.id === "dist_cli")?.ok).toBe(false);
    expect(result.nextCommands).toContain("npm run build");
  });
});
