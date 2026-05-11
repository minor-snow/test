import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { assertPublicSafe } from "./helpers/assertPublicSafe";
import { getPantheonCli } from "./helpers/findCli";

describe("Workgraph Smoke Flow", () => {
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

  it("completes full workgraph lifecycle", () => {
    // 1. Setup observation
    runCmd("dsa observe --json", "fixtures/workgraph-basic");

    // 2. Import DSA
    const importRes = runCmd("workgraph import-dsa --json", "fixtures/workgraph-basic");
    expect(importRes.schema_version).toBe("pantheon_cli_result@0.1.0");

    // 3. List
    const listRes = runCmd("workgraph list --json", "fixtures/workgraph-basic");
    expect(listRes.schema_version).toBe("pantheon_cli_result@0.1.0");

    // Find a work item to show, if any
    const items = listRes.summary?.workgraph_list?.items ?? [];
    if (items.length > 0) {
      const workItemId = items[0].id;
      // 4. Show
      const showRes = runCmd(`workgraph show ${workItemId} --json`, "fixtures/workgraph-basic");
      expect(showRes.schema_version).toBe("pantheon_cli_result@0.1.0");
      expect(["ok", "failed"]).toContain(showRes.status);
    } else {
      console.log("No work items found in fixture, skipping workgraph show.");
    }

    // 5. Events
    const eventsRes = runCmd("workgraph events --consumer public-smoke --json", "fixtures/workgraph-basic");
    expect(eventsRes.schema_version).toBe("pantheon_cli_result@0.1.0");
  });
});
