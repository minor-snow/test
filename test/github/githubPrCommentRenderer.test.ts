import { describe, expect, it } from "vitest";
import { renderGitHubPrComment, renderGitHubStepSummary } from "../../src/github/githubPrCommentRenderer.js";
import type { PantheonCheckPublic } from "../../src/cli/types.js";

describe("githubPrCommentRenderer", () => {
  it("renders blocking comment with forbidden file and action", () => {
    const check: PantheonCheckPublic = {
      schema_version: "pantheon_check.v1",
      verdict: "requires_reverse_issue",
      intent: "Add eco fee",
      summary: { changed_files: 2, in_scope: 1, review_required: 0, outside_scope: 0, forbidden: 1 },
      findings: [{
        kind: "forbidden_file_modified",
        severity: "reverse_issue_required",
        file: "saleor/payment/gateway.py",
        message: "Forbidden",
        allowed_actions: ["revert_file", "request_scope_expansion"],
        requires_human: true,
      }],
      artifacts: { task: "", scope: "", report: "", feedback: "" },
      repo: { label: "saleor", head_commit: "abc", state: "checked" },
    };

    const rendered = renderGitHubPrComment(check).markdown;
    expect(rendered).toContain("Pantheon Boundary Check [BLOCKED]");
    expect(rendered).toContain("saleor/payment/gateway.py");
    expect(rendered).toContain("`revert_file`");
  });

  it("renders review comment without blocking language", () => {
    const check: PantheonCheckPublic = {
      schema_version: "pantheon_check.v1",
      verdict: "requires_review",
      intent: "Add eco fee",
      summary: { changed_files: 2, in_scope: 1, review_required: 1, outside_scope: 0, forbidden: 0 },
      findings: [{
        kind: "requires_human_review",
        severity: "review_required",
        file: "saleor/order/models.py",
        message: "Review required",
        allowed_actions: [],
        requires_human: true,
      }],
      artifacts: { task: "", scope: "", report: "", feedback: "" },
      repo: { label: "saleor", head_commit: "abc", state: "checked" },
    };

    const rendered = renderGitHubPrComment(check).markdown;
    expect(rendered).toContain("Pantheon Boundary Check [WARN]");
    expect(rendered).toContain("saleor/order/models.py");
    expect(rendered).toContain("No blocking boundary violations found.");
  });

  it("renders step summary with base and head sha", () => {
    const check: PantheonCheckPublic = {
      schema_version: "pantheon_check.v1",
      verdict: "pass",
      intent: "Add eco fee",
      summary: { changed_files: 1, in_scope: 1, review_required: 0, outside_scope: 0, forbidden: 0 },
      findings: [],
      artifacts: { task: "", scope: "", report: "", feedback: "" },
      repo: { label: "saleor", head_commit: "abc", state: "checked" },
    };

    const rendered = renderGitHubStepSummary(check, { baseSha: "base123456789", headSha: "head123456789" }).markdown;
    expect(rendered).toContain("`base12345678`");
    expect(rendered).toContain("`head12345678`");
  });
});
