import { describe, expect, it } from "vitest";
import { decideGitHubRepairExit } from "../../src/github/githubRepairExitPolicy.js";

describe("githubRepairExitPolicy", () => {
  it("does not fail requires_review by default", () => {
    const decision = decideGitHubRepairExit({
      verdict: "requires_review",
      sanitizerViolations: 0,
      failOn: ["fail", "requires_replan", "requires_scope_expansion"],
    });

    expect(decision.shouldFail).toBe(false);
  });

  it("fails blocking verdicts and sanitizer violations", () => {
    expect(decideGitHubRepairExit({
      verdict: "requires_replan",
      sanitizerViolations: 0,
      failOn: ["fail", "requires_replan", "requires_scope_expansion"],
    }).shouldFail).toBe(true);

    expect(decideGitHubRepairExit({
      verdict: "pass",
      sanitizerViolations: 1,
      failOn: ["public_artifact_sanitizer_violation"],
    }).shouldFail).toBe(true);
  });
});
