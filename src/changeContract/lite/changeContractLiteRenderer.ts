/**
 * P20a: ChangeContract Lite Markdown Renderer
 *
 * Read-only projection. Not canonical.
 */

import type { ChangeContractLite } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderChangeContractLiteMarkdown(contract: ChangeContractLite): string {
  const lines: string[] = [];

  lines.push("# Pantheon Change Contract Lite");
  lines.push("");

  // Decision
  lines.push("## Decision");
  lines.push(`- **Verdict:** ${contract.decision.verdict}`);
  lines.push("");

  if (contract.decision.reasons.length > 0) {
    lines.push("### Reasons");
    for (const r of contract.decision.reasons) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }

  if (contract.decision.required_actions.length > 0) {
    lines.push("### Required Actions");
    for (const a of contract.decision.required_actions) {
      lines.push(`- ${a}`);
    }
    lines.push("");
  }

  // Intent
  if (contract.intent) {
    lines.push("## Intent");
    lines.push(contract.intent);
    lines.push("");
  }

  // Changed files
  lines.push("## Changed Files");
  if (contract.changed_files.length === 0) {
    lines.push("_No changed files specified._");
  } else {
    for (const f of contract.changed_files) {
      lines.push(`- \`${f}\``);
    }
  }
  lines.push("");

  // Changed file statuses
  lines.push("## Changed File Statuses");
  lines.push("| Path | Status | Reason |");
  lines.push("|---|---|---|");
  for (const s of contract.observed_scope.changed_file_statuses) {
    lines.push(`| \`${s.path}\` | ${s.status} | ${s.reason} |`);
  }
  lines.push("");

  // Observed scope
  lines.push("## Observed Scope");

  if (contract.observed_scope.touched_buckets.length > 0) {
    lines.push(`- **Touched buckets:** ${contract.observed_scope.touched_buckets.join(", ")}`);
  }
  if (contract.observed_scope.touched_sensitive_paths.length > 0) {
    lines.push(`- **Sensitive paths:** ${contract.observed_scope.touched_sensitive_paths.join(", ")}`);
  }
  if (contract.observed_scope.related_tests.length > 0) {
    lines.push(`- **Related tests:** ${contract.observed_scope.related_tests.join(", ")}`);
  }
  if (contract.observed_scope.owner_hints.length > 0) {
    lines.push(`- **Owners:** ${contract.observed_scope.owner_hints.join(", ")}`);
  }
  if (contract.observed_scope.unknowns.length > 0) {
    lines.push(`- **Unknowns:** ${contract.observed_scope.unknowns.join(", ")}`);
  }
  lines.push("");

  // References
  lines.push("## References");
  lines.push(`- **Repo observations hash:** \`${contract.refs.repo_observations_hash}\``);
  lines.push(`- **Head commit:** ${contract.refs.head_commit_hash ?? "_none_"}`);
  lines.push(`- **Repo state:** ${contract.refs.repo_state}`);
  lines.push(`- **Uncommitted changes:** ${contract.refs.has_uncommitted_changes ?? "_unknown_"}`);
  lines.push("");

  // Notice
  lines.push("---");
  lines.push("");
  lines.push("> **Notice:** This is a bootstrap contract derived from deterministic repo observations.");
  lines.push("> It is not a full governed ChangeContract.");
  lines.push("> The decision is based on user-provided changed files and path-convention analysis.");
  lines.push("");

  return lines.join("\n");
}
