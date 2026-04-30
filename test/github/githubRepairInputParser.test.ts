import { describe, expect, it } from "vitest";
import {
  parseDelimitedList,
  parseGitHubRepairInputs,
  parseRepairFailConditions,
} from "../../src/github/githubRepairInputParser.js";

describe("githubRepairInputParser", () => {
  it("parses the repair_id main path", () => {
    const { inputs } = parseGitHubRepairInputs({
      INPUT_MODE: "repair",
      INPUT_REPAIR_ID: "repair_abc123",
    });

    expect(inputs.sourceKind).toBe("existing_repair_id");
    expect(inputs.repairId).toBe("repair_abc123");
    expect(inputs.failOn).toEqual(["fail", "requires_replan", "requires_scope_expansion"]);
    expect(inputs.configPath).toBe("pantheon.alpha.json");
  });

  it("parses agent bug report and inline list inputs", () => {
    const { inputs } = parseGitHubRepairInputs({
      INPUT_MODE: "repair",
      INPUT_AGENT_BUG_REPORT: ".pantheon/repair/inbox/agent_bug_report.json",
      INPUT_SUSPECT: "src/auth/session.ts,\nsrc/auth/token.ts",
      INPUT_FAILING_TESTS: "tests/auth/session.test.ts",
      INPUT_MUST_PRESERVE: "Do not change auth schema.\nKeep refresh logic stable.",
      INPUT_FAIL_ON: "fail,requires_review,public_artifact_sanitizer_violation",
    });

    expect(inputs.sourceKind).toBe("agent_bug_report");
    expect(inputs.suspectPaths).toEqual(["src/auth/session.ts", "src/auth/token.ts"]);
    expect(inputs.failingTests).toEqual(["tests/auth/session.test.ts"]);
    expect(inputs.mustPreserve).toEqual(["Do not change auth schema.", "Keep refresh logic stable."]);
    expect(inputs.failOn).toEqual(["fail", "requires_review", "public_artifact_sanitizer_violation"]);
  });

  it("requires a source and suspects for inline mode", () => {
    expect(() => parseGitHubRepairInputs({ INPUT_MODE: "repair" })).toThrow(/requires one of/i);
    expect(() => parseGitHubRepairInputs({
      INPUT_MODE: "repair",
      INPUT_REPAIR_INTENT: "Fix auth bug",
    })).toThrow(/requires at least one suspect/i);
  });

  it("parses delimited lists and repair fail conditions", () => {
    expect(parseDelimitedList("a,b\nc")).toEqual(["a", "b", "c"]);
    expect(parseRepairFailConditions("all")).toEqual(["all"]);
    expect(parseRepairFailConditions("none")).toEqual(["none"]);
    expect(parseRepairFailConditions(" FAIL , REQUIRES_REVIEW ")).toEqual(["fail", "requires_review"]);
  });

  it("normalizes audit and artifact modes case-insensitively", () => {
    const { inputs } = parseGitHubRepairInputs({
      INPUT_MODE: "repair",
      INPUT_REPAIR_ID: "repair_abc123",
      INPUT_AUDIT_MODE: " REQUIRE_ALL ",
      INPUT_ARTIFACT_MODE: " DEBUG ",
    });

    expect(inputs.auditMode).toBe("require_all");
    expect(inputs.artifactMode).toBe("debug");
  });
});
