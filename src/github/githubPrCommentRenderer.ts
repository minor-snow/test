import type { PantheonCheckPublic, PantheonFinding } from "../cli/types.js";
import type { GitHubRenderedComment, GitHubRenderedSummary } from "./githubActionTypes.js";

export const PANTHEON_COMMENT_MARKER = "<!-- pantheon-boundary-check-v0 -->";

export function renderGitHubPrComment(check: PantheonCheckPublic): GitHubRenderedComment {
  const lines: string[] = [];
  const reviewFindings = check.findings.filter(f => f.severity === "review_required");
  const blockingFindings = check.findings.filter(f =>
    f.kind === "forbidden_file_modified" || f.kind === "outside_scope_file",
  );

  lines.push(PANTHEON_COMMENT_MARKER);
  lines.push(`## Pantheon Boundary Check [${labelForVerdict(check.verdict)}]`);
  lines.push("");
  lines.push(`**Verdict:** \`${check.verdict}\``);
  lines.push("");
  lines.push(renderSummaryTable(check));
  lines.push("");

  if (blockingFindings.length > 0) {
    lines.push("### Blocking boundary violations");
    lines.push("");
    for (const finding of blockingFindings.slice(0, 10)) {
      lines.push(`- \`${finding.file}\``);
      lines.push(`  - Reason: ${summarizeReason(finding)}`);
      lines.push(`  - Required action: ${formatAllowedActions(finding.allowed_actions)}`);
    }
    lines.push("");
    lines.push("Use `feedback.md` to instruct the agent to recover.");
    lines.push("");
  } else if (reviewFindings.length > 0) {
    lines.push("No blocking boundary violations found.");
    lines.push("");
    lines.push("### Files requiring human review");
    lines.push("");
    for (const finding of reviewFindings.slice(0, 10)) {
      lines.push(`- \`${finding.file}\``);
      lines.push(`  - Reason: ${summarizeReason(finding)}`);
      lines.push("  - Suggested action: review before merge");
    }
    lines.push("");
  } else {
    lines.push("No boundary violations detected.");
    lines.push("");
  }

  lines.push("Artifacts:");
  lines.push("- `report.md`");
  lines.push("- `check.json`");
  if (check.findings.length > 0) lines.push("- `feedback.md`");

  return {
    marker: PANTHEON_COMMENT_MARKER,
    markdown: lines.join("\n"),
  };
}

export function renderGitHubStepSummary(check: PantheonCheckPublic, metadata?: {
  readonly baseSha?: string;
  readonly headSha?: string;
}): GitHubRenderedSummary {
  const lines: string[] = [];
  lines.push("# Pantheon Boundary Check");
  lines.push("");
  lines.push(`Verdict: \`${check.verdict}\``);
  lines.push("");

  if (metadata?.baseSha || metadata?.headSha) {
    lines.push("| Diff | Value |");
    lines.push("|---|---|");
    if (metadata.baseSha) lines.push(`| Base | \`${metadata.baseSha.slice(0, 12)}\` |`);
    if (metadata.headSha) lines.push(`| Head | \`${metadata.headSha.slice(0, 12)}\` |`);
    lines.push("");
  }

  lines.push(renderSummaryTable(check));
  lines.push("");

  const blockingFindings = check.findings.filter(f =>
    f.kind === "forbidden_file_modified" || f.kind === "outside_scope_file",
  );
  const reviewFindings = check.findings.filter(f => f.severity === "review_required");

  if (blockingFindings.length > 0) {
    lines.push("Blocking boundary violations detected.");
    lines.push("");
    for (const finding of blockingFindings.slice(0, 10)) {
      lines.push(`- \`${finding.file}\` - ${summarizeReason(finding)}`);
    }
    lines.push("");
  } else if (reviewFindings.length > 0) {
    lines.push("No blocking boundary violations found.");
    lines.push("");
    lines.push("Files requiring human review:");
    for (const finding of reviewFindings.slice(0, 10)) {
      lines.push(`- \`${finding.file}\` - ${summarizeReason(finding)}`);
    }
    lines.push("");
  } else {
    lines.push("No boundary violations detected.");
    lines.push("");
  }

  lines.push("See `pantheon-report/` for generated artifacts.");

  return { markdown: lines.join("\n") };
}

function renderSummaryTable(check: PantheonCheckPublic): string {
  return [
    "| Category | Count |",
    "|---|---:|",
    `| In allowed scope | ${check.summary.in_scope} |`,
    `| Review required | ${check.summary.review_required} |`,
    `| Forbidden | ${check.summary.forbidden} |`,
    `| Outside scope | ${check.summary.outside_scope} |`,
  ].join("\n");
}

function labelForVerdict(verdict: string): string {
  if (verdict === "pass") return "PASS";
  if (verdict === "requires_review") return "WARN";
  return "BLOCKED";
}

function summarizeReason(finding: PantheonFinding): string {
  if (finding.kind === "forbidden_file_modified") return "forbidden boundary";
  if (finding.kind === "outside_scope_file") return "outside authorized scope";
  if (finding.severity === "review_required") return "matched review-required boundary";
  return finding.message;
}

function formatAllowedActions(actions: readonly string[]): string {
  if (actions.length === 0) return "review manually";
  return actions.map(action => `\`${action}\``).join(" or ");
}
