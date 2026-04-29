/**
 * P22: Agent Feedback Markdown Renderer
 *
 * Renders AgentFeedback into human-readable markdown.
 * The primary agent input is JSON; this is for reviewer visibility.
 */

import type { AgentFeedback } from "./types.js";

export function renderAgentFeedbackMarkdown(feedback: AgentFeedback): string {
  const lines: string[] = [];

  lines.push("# Pantheon Agent Feedback");
  lines.push("");

  // Verdict
  lines.push("## Verdict");
  lines.push("");
  lines.push(`**${feedback.verdict}**`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Violations:** ${feedback.summary.violation_count}`);
  lines.push(`- **Blocking:** ${feedback.summary.blocking_count}`);
  lines.push(`- **Review required:** ${feedback.summary.review_required_count}`);
  lines.push(`- **Reverse issue required:** ${feedback.summary.reverse_issue_required_count}`);
  lines.push(`- **Requires human:** ${feedback.summary.requires_human_count}`);
  lines.push("");

  // Retry Guidance
  lines.push("## Retry Guidance");
  lines.push("");
  lines.push(`- **Retry allowed:** ${feedback.retry_guidance.retry_allowed}`);
  lines.push(`- **Retry mode:** ${feedback.retry_guidance.retry_mode}`);
  lines.push(`- **Max recommended retries:** ${feedback.retry_guidance.max_recommended_retries}`);
  if (feedback.retry_guidance.instructions.length > 0) {
    lines.push("- **Instructions:**");
    for (const instr of feedback.retry_guidance.instructions) {
      lines.push(`  - ${instr}`);
    }
  }
  lines.push("");

  // Repair Plan
  if (feedback.repair_plan.length > 0) {
    lines.push("## Repair Plan");
    lines.push("");
    for (let i = 0; i < feedback.repair_plan.length; i++) {
      const r = feedback.repair_plan[i];
      const target = r.target?.file_path ? ` \`${r.target.file_path}\`` : "";
      const human = r.requires_human ? " _(requires human)_" : "";
      lines.push(`${i + 1}. **${r.action}**${target} — ${r.reason} [${r.priority}]${human}`);
    }
    lines.push("");
  }

  // Violations
  if (feedback.violations.length > 0) {
    lines.push("## Violations");
    lines.push("");

    for (const v of feedback.violations) {
      lines.push(`### ${v.kind}`);
      lines.push("");
      if (v.location.file_path) lines.push(`- **File:** \`${v.location.file_path}\``);
      lines.push(`- **Severity:** ${v.severity}`);
      lines.push(`- **Constraint:** \`${v.constraint.constraint_id}\` (${v.constraint.constraint_kind})`);
      lines.push(`- **Description:** ${v.constraint.description}`);
      if (v.expected) lines.push(`- **Expected:** ${v.expected}`);
      if (v.actual) lines.push(`- **Actual:** ${v.actual}`);
      lines.push(`- **Message:** ${v.message}`);
      lines.push(`- **Fix hint:** ${v.fix_hint}`);
      lines.push(`- **Allowed actions:** ${v.allowed_agent_actions.join(", ")}`);
      lines.push(`- **Requires human:** ${v.requires_human}`);
      lines.push("");
    }
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("> **Notice:** repair_plan is advisory. allowed_agent_actions is authoritative.");
  lines.push("> requires_human = true means agent must not self-resolve without escalation.");
  lines.push("");

  return lines.join("\n");
}
