import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { assertPublicSafe } from "./helpers/assertPublicSafe";
import { getPantheonCli } from "./helpers/findCli";

describe("CLI JSON Contract", () => {
  const cli = getPantheonCli();

  const runCmd = (cmd: string, cwd: string) => {
    try {
      const stdout = execSync(`${cli} ${cmd}`, { cwd, stdio: "pipe" }).toString();
      assertPublicSafe(stdout);
      return JSON.parse(stdout);
    } catch (e: any) {
      if (e.stdout) {
        const stdout = e.stdout.toString();
        assertPublicSafe(stdout);
        try {
          return JSON.parse(stdout);
        } catch {
          throw new Error(`Failed to parse CLI error output as JSON:\n${stdout}`);
        }
      }
      throw e;
    }
  };

  const validateEnvelope = (result: any) => {
    expect(result.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(result.command).toBeDefined();
    expect(result.target_type).toBeDefined();
    expect(result.status).toBeDefined();
    expect(typeof result.summary).toBe("object");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.next_action_intents)).toBe(true);
  };

  it("check --json conforms to contract", () => {
    const result = runCmd("check --json", "fixtures/smoke-ts");
    validateEnvelope(result);
  });

  it("dsa observe --json conforms to contract", () => {
    const result = runCmd("dsa observe --json", "fixtures/dsa-basic");
    validateEnvelope(result);
    // Even if no candidates, it must return a valid envelope
    expect(["no_candidates", "ok", "not_found", "failed"]).toContain(result.status);
  });

  it("dsa status --json conforms to contract", () => {
    const result = runCmd("dsa status --json", "fixtures/dsa-basic");
    validateEnvelope(result);
  });

  it("dsa review list --json conforms to contract", () => {
    const result = runCmd("dsa review list --json", "fixtures/dsa-basic");
    validateEnvelope(result);
  });

  it("workgraph status --json conforms to contract", () => {
    const result = runCmd("workgraph status --json", "fixtures/workgraph-basic");
    validateEnvelope(result);
  });

  it("agent status --json conforms to contract", () => {
    const result = runCmd("agent status --json", "fixtures/agent-gateway-basic");
    validateEnvelope(result);
  });
});
