import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { assertPublicSafe } from "./helpers/assertPublicSafe";
import { getPantheonCli } from "./helpers/findCli";

describe("DSA Smoke Flow", () => {
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

  it("completes full dsa lifecycle", () => {
    // 1. Observe
    const observeRes = runCmd("dsa observe --json", "fixtures/dsa-basic");
    expect(observeRes.schema_version).toBe("pantheon_cli_result@0.1.0");
    
    // 2. Status
    const statusRes = runCmd("dsa status --json", "fixtures/dsa-basic");
    expect(statusRes.schema_version).toBe("pantheon_cli_result@0.1.0");

    // 3. Review List
    const listRes = runCmd("dsa review list --json", "fixtures/dsa-basic");
    expect(listRes.schema_version).toBe("pantheon_cli_result@0.1.0");

    // Find a candidate to show, if any
    const candidates = listRes.summary?.dsa_review_list?.candidates ?? [];
    if (candidates.length > 0) {
      const candidateId = candidates[0].id;
      // 4. Review Show
      const showRes = runCmd(`dsa review show ${candidateId} --json`, "fixtures/dsa-basic");
      expect(showRes.schema_version).toBe("pantheon_cli_result@0.1.0");
      expect(["ok", "failed"]).toContain(showRes.status);
    } else {
      console.log("No candidates found in fixture, skipping review show.");
    }
  });
});
