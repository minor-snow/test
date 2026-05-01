import { describe, it, expect } from "vitest";
import {
  resolveLocalTrustedApproval,
  resolveGitHubTrustedApproval,
} from "../../src/trust/trustedApprovalResolver.js";
import type { GitHubReviewInfo, GitHubLabelInfo } from "../../src/trust/trustedApprovalResolver.js";

describe("trustedApprovalResolver", () => {
  describe("resolveLocalTrustedApproval", () => {
    it("trusted when audit decision exists and file not in diff", () => {
      const result = resolveLocalTrustedApproval({
        auditDecisions: [{
          filePath: ".pantheon/audit/decision_001.json",
          operatorId: "admin",
          decision: "approve_repair",
          createdAt: "2026-05-01T00:00:00Z",
        }],
        changedPaths: ["src/app.ts"],
      });
      expect(result.trusted).toBe(true);
      expect(result.source).toBe("local_audit");
      expect(result.actor).toBe("admin");
    });

    it("not trusted when audit decision file is in the diff", () => {
      const result = resolveLocalTrustedApproval({
        auditDecisions: [{
          filePath: ".pantheon/audit/decision_001.json",
          operatorId: "admin",
          decision: "approve_repair",
          createdAt: "2026-05-01T00:00:00Z",
        }],
        changedPaths: [".pantheon/audit/decision_001.json", "src/app.ts"],
      });
      expect(result.trusted).toBe(false);
      expect(result.source).toBe("none");
    });

    it("not trusted when no audit decisions exist", () => {
      const result = resolveLocalTrustedApproval({
        auditDecisions: [],
        changedPaths: ["src/app.ts"],
      });
      expect(result.trusted).toBe(false);
    });
  });

  describe("resolveGitHubTrustedApproval", () => {
    const makeReview = (overrides: Partial<GitHubReviewInfo> = {}): GitHubReviewInfo => ({
      author: "reviewer",
      authorPermission: "write",
      state: "APPROVED",
      submittedAt: "2026-05-01T00:00:00Z",
      ...overrides,
    });

    it("trusted with approved review by non-author with write permission", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ author: "reviewer", authorPermission: "write" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(true);
      expect(result.source).toBe("github_review");
      expect(result.actor).toBe("reviewer");
      expect(result.permission).toBe("write");
    });

    it("trusted with maintain permission", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ authorPermission: "maintain" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(true);
      expect(result.permission).toBe("maintain");
    });

    it("trusted with admin permission", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ authorPermission: "admin" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(true);
    });

    it("NOT trusted: PR author approving own PR", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ author: "pr-author" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
      expect(result.source).toBe("none");
    });

    it("NOT trusted: reviewer with read-only permission", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ authorPermission: "read" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
    });

    it("NOT trusted: reviewer with triage permission", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ authorPermission: "triage" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
    });

    it("NOT trusted: reviewer with unknown permission", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ authorPermission: undefined })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
    });

    it("NOT trusted: CHANGES_REQUESTED review", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ state: "CHANGES_REQUESTED" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
    });

    it("NOT trusted: COMMENTED review (not approval)", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [makeReview({ state: "COMMENTED" })],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
    });

    it("trusted via label applied by non-author", () => {
      const label: GitHubLabelInfo = {
        name: "pantheon-approved",
        appliedBy: "maintainer",
        appliedByPermission: "admin",
        appliedAt: "2026-05-01T00:00:00Z",
      };
      const result = resolveGitHubTrustedApproval({
        reviews: [],
        labels: [label],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(true);
      expect(result.source).toBe("maintainer_label");
    });

    it("NOT trusted via label applied by PR author", () => {
      const label: GitHubLabelInfo = {
        name: "pantheon-approved",
        appliedBy: "pr-author",
        appliedByPermission: "write",
      };
      const result = resolveGitHubTrustedApproval({
        reviews: [],
        labels: [label],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
    });

    it("NOT trusted via non-matching label", () => {
      const label: GitHubLabelInfo = {
        name: "bug",
        appliedBy: "maintainer",
        appliedByPermission: "admin",
      };
      const result = resolveGitHubTrustedApproval({
        reviews: [],
        labels: [label],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(false);
    });

    it("uses custom trusted labels", () => {
      const label: GitHubLabelInfo = {
        name: "custom-approved",
        appliedBy: "maintainer",
        appliedByPermission: "write",
      };
      const result = resolveGitHubTrustedApproval({
        reviews: [],
        labels: [label],
        prAuthor: "pr-author",
        trustedLabels: ["custom-approved"],
      });
      expect(result.trusted).toBe(true);
    });

    it("returns most recent approval when multiple exist", () => {
      const result = resolveGitHubTrustedApproval({
        reviews: [
          makeReview({ author: "old-reviewer", submittedAt: "2026-04-01T00:00:00Z" }),
          makeReview({ author: "new-reviewer", submittedAt: "2026-05-01T00:00:00Z" }),
        ],
        labels: [],
        prAuthor: "pr-author",
      });
      expect(result.trusted).toBe(true);
      expect(result.actor).toBe("new-reviewer");
    });
  });
});
