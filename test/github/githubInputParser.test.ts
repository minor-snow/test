import { describe, expect, it } from "vitest";
import {
  extractPullRequestContext,
  parseBoolean,
  parseFailConditions,
  parseGitHubActionConfig,
  parseMultilinePatterns,
} from "../../src/github/githubInputParser.js";

describe("githubInputParser", () => {
  it("parses multiline glob inputs without stripping glob characters", () => {
    expect(parseMultilinePatterns("saleor/checkout/**\n\nsaleor/order/**\n")).toEqual([
      "saleor/checkout/**",
      "saleor/order/**",
    ]);
    expect(parseMultilinePatterns("saleor/checkout/**, saleor/order/**")).toEqual([
      "saleor/checkout/**",
      "saleor/order/**",
    ]);
  });

  it("parses booleans with github-style defaults", () => {
    expect(parseBoolean("true", false)).toBe(true);
    expect(parseBoolean("0", true)).toBe(false);
    expect(parseBoolean(undefined, true)).toBe(true);
  });

  it("parses fail conditions with all/none overrides", () => {
    expect(parseFailConditions("forbidden,outside_scope")).toEqual(["forbidden", "outside_scope"]);
    expect(parseFailConditions("all")).toEqual(["all"]);
    expect(parseFailConditions("none")).toEqual(["none"]);
    expect(parseFailConditions(" FORBIDDEN , REVIEW_REQUIRED ")).toEqual(["forbidden", "review_required"]);
  });

  it("extracts pull request context from a github event", () => {
    const context = extractPullRequestContext({
      number: 42,
      repository: { name: "saleor", owner: { login: "saleor" } },
      pull_request: { title: "Add eco fee", base: { sha: "base123" }, head: { sha: "head456" } },
    });

    expect(context).toEqual({
      owner: "saleor",
      repo: "saleor",
      prNumber: 42,
      baseSha: "base123",
      headSha: "head456",
      title: "Add eco fee",
    });
  });

  it("builds action config from env inputs", () => {
    const config = parseGitHubActionConfig({
      INPUT_INTENT: "Add eco fee",
      INPUT_SCOPE: "saleor/checkout/**\nsaleor/graphql/checkout/**",
      INPUT_REVIEW: "saleor/order/**",
      INPUT_FORBID: "saleor/payment/**",
      INPUT_CONFIG_PATH: ".github/pantheon.json",
      INPUT_FAIL_ON: "forbidden,outside_scope",
      INPUT_POST_COMMENT: "false",
      INPUT_UPLOAD_ARTIFACTS: "true",
      INPUT_ARTIFACT_MODE: " DEBUG ",
      INPUT_COMMENT_MODE: " OFF ",
    });

    expect(config.intent).toBe("Add eco fee");
    expect(config.scopePatterns).toEqual(["saleor/checkout/**", "saleor/graphql/checkout/**"]);
    expect(config.reviewPatterns).toEqual(["saleor/order/**"]);
    expect(config.forbidPatterns).toEqual(["saleor/payment/**"]);
    expect(config.configPath).toBe(".github/pantheon.json");
    expect(config.failOn).toEqual(["forbidden", "outside_scope"]);
    expect(config.postComment).toBe(false);
    expect(config.uploadArtifacts).toBe(true);
    expect(config.artifactMode).toBe("debug");
    expect(config.commentMode).toBe("off");
  });

  it("treats fail_on=all as blocking every non-pass category", () => {
    const decision = parseFailConditions("all");
    expect(decision).toEqual(["all"]);
  });
});
