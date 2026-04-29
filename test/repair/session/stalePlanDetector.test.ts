import { describe, expect, it } from "vitest";
import { detectStaleRepairPlan } from "../../../src/repair/session/stalePlanDetector.js";

describe("stalePlanDetector", () => {
  it("flags base sha mismatch as a stale repair contract", () => {
    const findings = detectStaleRepairPlan({
      contractState: {
        base_sha: "abc123",
        head_sha: "abc123",
        diff_base: "abc123",
        working_tree_status: "clean",
        created_at: new Date().toISOString(),
        source: "git",
      },
      currentState: {
        base_sha: "def456",
        head_sha: "def456",
        diff_base: "def456",
        working_tree_status: "clean",
        created_at: new Date().toISOString(),
        source: "git",
      },
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("stale_repair_contract");
    expect(findings[0]?.severity).toBe("blocking");
  });

  it("warns when a previously clean working tree becomes dirty", () => {
    const findings = detectStaleRepairPlan({
      contractState: {
        base_sha: "abc123",
        head_sha: "abc123",
        diff_base: "abc123",
        working_tree_status: "clean",
        created_at: new Date().toISOString(),
        source: "git",
      },
      currentState: {
        base_sha: "abc123",
        head_sha: "abc123",
        diff_base: "abc123",
        working_tree_status: "dirty",
        created_at: new Date().toISOString(),
        source: "git",
      },
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("working_tree_changed");
    expect(findings[0]?.severity).toBe("warning");
  });
});
