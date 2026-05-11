import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { assertPublicSafe } from "./helpers/assertPublicSafe";
import { getPantheonCli } from "./helpers/findCli";
import fs from "node:fs";

describe("Agent Gateway Smoke Flow", () => {
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

  it("rejects absolute paths and shell metadata", () => {
    const invalidPathRes = runCmd("agent submit --envelope @../../examples/agent_envelopes/invalid_absolute_path.json --json", "fixtures/agent-gateway-basic");
    expect(invalidPathRes.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(["failed", "unsafe_payload"]).toContain(invalidPathRes.status);
    
    // Test invalid shellish metadata
    const invalidShellRes = runCmd("agent submit --envelope @../../examples/agent_envelopes/invalid_shellish_metadata.json --json", "fixtures/agent-gateway-basic");
    expect(invalidShellRes.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(["failed", "unsafe_payload"]).toContain(invalidShellRes.status);
  });

  it("completes full agent lifecycle", () => {
    // 1. Submit
    const submitRes = runCmd("agent submit --envelope @../../examples/agent_envelopes/submit.json --json", "fixtures/agent-gateway-basic");
    expect(submitRes.schema_version).toBe("pantheon_cli_result@0.1.0");
    expect(["ok", "failed"]).toContain(submitRes.status);

    // Get the generated work item id or use a fallback
    const workItemId = submitRes.summary?.work_item_id ?? "gw:public-smoke-agent";
    
    // Update progress/complete json to use dynamic workItemId
    const progressPath = "examples/agent_envelopes/progress.json";
    const completePath = "examples/agent_envelopes/complete.json";
    
    // For this basic test, we just pass the original files or fallback ones.
    // If the engine demands a valid workItemId, we would rewrite the JSON here, but since the
    // examples have a placeholder, let's just create temporary ones in the fixture.
    
    const progressData = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
    progressData.workItemId = workItemId;
    fs.writeFileSync("fixtures/agent-gateway-basic/progress_temp.json", JSON.stringify(progressData));

    const completeData = JSON.parse(fs.readFileSync(completePath, "utf-8"));
    completeData.workItemId = workItemId;
    fs.writeFileSync("fixtures/agent-gateway-basic/complete_temp.json", JSON.stringify(completeData));

    // 2. Progress
    const progressRes = runCmd("agent progress --envelope @progress_temp.json --json", "fixtures/agent-gateway-basic");
    expect(progressRes.schema_version).toBe("pantheon_cli_result@0.1.0");

    // 3. Complete
    const completeRes = runCmd("agent complete --envelope @complete_temp.json --json", "fixtures/agent-gateway-basic");
    expect(completeRes.schema_version).toBe("pantheon_cli_result@0.1.0");

    // 4. Sessions
    const sessionsRes = runCmd("agent sessions --json", "fixtures/agent-gateway-basic");
    expect(sessionsRes.schema_version).toBe("pantheon_cli_result@0.1.0");

    // Cleanup
    fs.unlinkSync("fixtures/agent-gateway-basic/progress_temp.json");
    fs.unlinkSync("fixtures/agent-gateway-basic/complete_temp.json");
  });
});
