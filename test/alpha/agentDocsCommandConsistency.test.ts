import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { cmdAlphaInit } from "../../src/alpha/alphaInit.js";

describe("agent docs command consistency", () => {
  const tmpDir = join("test", "alpha", "__tmp_agent_docs__");

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    cmdAlphaInit({ repoRoot: tmpDir, noGithub: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("documents only supported pantheon-alpha commands in generated alpha files", () => {
    const supported = new Set(["doctor", "repair", "review", "metrics", "init", "status", "uninstall"]);
    const docs = [
      readFileSync(join(tmpDir, "AGENTS.md"), "utf-8"),
      readFileSync(join(tmpDir, "pantheon.agent.json"), "utf-8"),
      readFileSync(join(tmpDir, "docs", "pantheon", "agent-quickstart.md"), "utf-8"),
      readFileSync(join(tmpDir, "docs", "pantheon", "human-quickstart.md"), "utf-8"),
    ].join("\n");

    const matches = docs.match(/npx pantheon-alpha ([a-z-]+)/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      const subcommand = match.replace("npx pantheon-alpha ", "");
      expect(supported.has(subcommand), `${subcommand} should be supported`).toBe(true);
    }
  });
});
