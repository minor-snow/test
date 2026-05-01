import type { ReviewRequest } from "./reviewRequestTypes.js";

export function renderReviewRequestMarkdown(request: ReviewRequest): string {
  const lines: string[] = [];

  lines.push("# Pantheon Review Request");
  lines.push("");
  lines.push(`- Review ID: \`${request.review_id}\``);
  lines.push(`- Repair ID: \`${request.repair_id}\``);
  lines.push(`- Contract revision: \`v${request.contract_revision}\``);
  lines.push(`- Verdict: \`${request.verdict}\``);
  lines.push(`- Attention: \`${request.attention_level}\``);
  lines.push(`- Status: \`${request.status}\``);
  lines.push("");
  lines.push("## Reason");
  lines.push("");
  lines.push(request.reason);
  lines.push("");

  if (request.files.length > 0) {
    lines.push("## Files");
    lines.push("");
    lines.push("| File | Bucket | Reason |");
    lines.push("|---|---|---|");
    for (const file of request.files.slice(0, 20)) {
      lines.push(`| \`${file.path}\` | ${file.bucket} | ${escapeTableCell(file.reason)} |`);
    }
    if (request.files.length > 20) {
      lines.push("");
      lines.push(`Showing 20 files. ${request.files.length - 20} additional files omitted.`);
    }
    lines.push("");
  }

  lines.push("## Recommended actions");
  lines.push("");
  for (const action of request.recommended_actions) {
    lines.push(`- ${renderAction(action)}`);
  }
  lines.push("");

  if (request.pr?.number) {
    lines.push("## PR");
    lines.push("");
    lines.push(`- Provider: ${request.pr.provider}`);
    lines.push(`- Number: ${request.pr.number}`);
    if (request.pr.url) {
      lines.push(`- URL: ${request.pr.url}`);
    }
    lines.push("");
  }

  lines.push("Local-only note: this review request contains repair metadata only. It does not include source code content or diff hunks.");
  lines.push("");
  return lines.join("\n");
}

function renderAction(action: ReviewRequest["recommended_actions"][number]): string {
  switch (action) {
    case "approve_repair":
      return "Record a human approval for the repair.";
    case "human_review":
      return "A human reviewer should inspect the flagged files.";
    case "request_replan":
      return "Re-run repair plan for the current repository base.";
    case "request_scope_expansion":
      return "Request scope expansion before modifying additional files.";
    case "revert_file":
      return "Revert forbidden or unsafe file changes before continuing.";
    case "create_contract":
      return "Create a valid contract covering the proposed changes.";
  }
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
