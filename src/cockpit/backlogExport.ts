/**
 * Backlog Export with Provenance
 *
 * ref: Phase 5 P5-003
 *
 * Generates BacklogItem entries from residual issues.
 * Each item carries full provenance: block_id, section_id,
 * canonical_revision_id, source_issue_id, and why_deferred.
 */

import type { BacklogItem, ResidualSnapshot, ReleaseDecision } from "./types.js";

// ---------------------------------------------------------------------------
// Default deferral reason templates
// ---------------------------------------------------------------------------

const DEFERRAL_TEMPLATES: Record<string, string> = {
  undefined_term:
    "Terminology debt: snake_case identifier used in prose without term definition. " +
    "Low structural risk. Can be resolved by adding term to block's terms array or rewriting to natural language.",
  redundant_narrative:
    "Advisory: block shares significant phrase overlap with another block in a different section. " +
    "Consider consolidation during next editorial pass.",
  domain_irrelevant_content:
    "Block text lacks domain-relevant keywords. Requires targeted rewrite to align with artifact type semantics.",
  empty_block_text:
    "Block text is empty. Requires substantive content before next release.",
  unsafe_canonical_commit:
    "Block text contains unsafe canonical commit language. Requires rewrite to eliminate bypass semantics.",
};

function defaultDeferralReason(issueType: string, severity: string): string {
  const template = DEFERRAL_TEMPLATES[issueType];
  if (template) return template;
  return `Deferred [${severity}] ${issueType} issue. Review during next maintenance cycle.`;
}

// ---------------------------------------------------------------------------
// Generate backlog items
// ---------------------------------------------------------------------------

export function generateBacklogItems(
  residual: ResidualSnapshot,
  canonicalRevisionId: string,
  releaseDecisionId: string,
  overrides?: Record<string, string> // issue_id → custom why_deferred
): BacklogItem[] {
  return residual.issues.map((issue, idx) => ({
    id: `BACKLOG-${String(idx + 1).padStart(3, "0")}`,
    source_issue_id: issue.issue_id,
    block_id: issue.block_id,
    section_id: issue.section_id,
    issue_type: issue.issue_type,
    severity: issue.severity,
    canonical_revision_id: canonicalRevisionId,
    why_deferred: overrides?.[issue.issue_id] ?? defaultDeferralReason(issue.issue_type, issue.severity),
    created_from_release_decision_id: releaseDecisionId,
  }));
}

// ---------------------------------------------------------------------------
// Export as Markdown
// ---------------------------------------------------------------------------

export function exportBacklogMarkdown(items: BacklogItem[]): string {
  const lines: string[] = [
    "# Backlog — Residual Issues",
    "",
    `> Generated from release decision \`${items[0]?.created_from_release_decision_id ?? "unknown"}\``,
    `> Canonical revision: \`${items[0]?.canonical_revision_id ?? "unknown"}\``,
    "",
    "| ID | Block | Section | Type | Severity | Why Deferred |",
    "|---|---|---|---|---|---|",
  ];

  for (const item of items) {
    lines.push(
      `| ${item.id} | \`${item.block_id}\` | ${item.section_id} | ${item.issue_type} | ${item.severity} | ${item.why_deferred.split(".")[0]}. |`
    );
  }

  lines.push("");
  lines.push("## Detail");
  lines.push("");

  for (const item of items) {
    lines.push(`### ${item.id}: \`${item.block_id}\``);
    lines.push("");
    lines.push(`- **Type:** ${item.issue_type}`);
    lines.push(`- **Severity:** ${item.severity}`);
    lines.push(`- **Section:** ${item.section_id}`);
    lines.push(`- **Source Issue:** ${item.source_issue_id}`);
    lines.push(`- **Canonical Revision:** \`${item.canonical_revision_id}\``);
    lines.push(`- **Release Decision:** \`${item.created_from_release_decision_id}\``);
    lines.push("");
    lines.push(`**Why Deferred:** ${item.why_deferred}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Validate release decision constraints
// ---------------------------------------------------------------------------

export const ALLOWED_DECISIONS = [
  "accepted_clean",
  "accepted_with_residual_issues",
  "rejected_requires_cleanup",
] as const;

export function validateReleaseDecision(
  decision: ReleaseDecision
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Decision type must be a known value
  if (!ALLOWED_DECISIONS.includes(decision.decision as any)) {
    errors.push(
      `Invalid decision type: "${decision.decision}". ` +
      `Must be one of: ${ALLOWED_DECISIONS.join(", ")}`
    );
  }

  // Rationale is always required
  if (!decision.rationale || decision.rationale.trim().length === 0) {
    errors.push("rationale is required and cannot be empty");
  }

  // Coherence note is always required
  if (!decision.final_coherence_note || decision.final_coherence_note.trim().length === 0) {
    errors.push("final_coherence_note is required and cannot be empty");
  }

  // accepted_clean requires zero residuals
  if (decision.decision === "accepted_clean" && decision.residual_snapshot.total > 0) {
    errors.push(
      `accepted_clean requires 0 residual issues, but ${decision.residual_snapshot.total} remain`
    );
  }

  // accepted_with_residual_issues requires backlog items
  if (
    decision.decision === "accepted_with_residual_issues" &&
    decision.backlog_items.length === 0
  ) {
    errors.push("accepted_with_residual_issues requires at least one backlog item");
  }

  // accepted_with_residual_issues should not have high-severity residuals
  const highCount = decision.residual_snapshot.by_severity["high"] ?? 0;
  if (decision.decision === "accepted_with_residual_issues" && highCount > 0) {
    errors.push(
      `accepted_with_residual_issues should not contain high-severity issues (${highCount} found)`
    );
  }

  // rejected requires no backlog (nothing to defer — must fix first)
  if (decision.decision === "rejected_requires_cleanup" && decision.backlog_items.length > 0) {
    errors.push("rejected_requires_cleanup should not generate backlog items");
  }

  return { valid: errors.length === 0, errors };
}
