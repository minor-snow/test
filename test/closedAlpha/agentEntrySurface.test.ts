import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("closed alpha entry surface", () => {
  it("ships AGENTS.md, pantheon.agent.json, and the bug report template", () => {
    expect(existsSync("AGENTS.md")).toBe(true);
    expect(existsSync("pantheon.agent.json")).toBe(true);
    expect(existsSync(join(".pantheon", "repair", "inbox", "agent_bug_report.template.json"))).toBe(true);
  });

  it("defines the repair protocol in machine-readable form", () => {
    const parsed = JSON.parse(readFileSync("pantheon.agent.json", "utf-8")) as {
      schema_version: string;
      primary_entrypoints: { read_first: string };
      repair_protocol: { requires_repair_id: boolean; latest_is_convenience_only: boolean };
    };

    expect(parsed.schema_version).toBe("pantheon_agent_entry@0.1.0");
    expect(parsed.primary_entrypoints.read_first).toBe("AGENTS.md");
    expect(parsed.repair_protocol.requires_repair_id).toBe(true);
    expect(parsed.repair_protocol.latest_is_convenience_only).toBe(true);
  });

  it("includes closed-alpha docs and examples for agents and testers", () => {
    const requiredFiles = [
      join("docs", "closed-alpha", "README.md"),
      join("docs", "closed-alpha", "agent-quickstart.md"),
      join("docs", "closed-alpha", "quickstart-github.md"),
      join("examples", "github", "repair-gate.yml"),
      join("examples", "agent-tasks", "01-install-and-doctor.md"),
    ];

    for (const file of requiredFiles) {
      expect(existsSync(file), `${file} should exist`).toBe(true);
    }
  });
});
