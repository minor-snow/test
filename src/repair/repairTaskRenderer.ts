import type { BugFinding, RepairContract, RepairSourceReport, GraphTruncationEntry } from "./types.js";

export function renderRepairTaskMarkdown(input: {
  report: RepairSourceReport;
  finding: BugFinding;
  contract: RepairContract;
}): string {
  const lines: string[] = [];
  const hypothesis = "agent_hypothesis" in input.report ? input.report.agent_hypothesis : undefined;

  lines.push("# Pantheon Repair Task");
  lines.push("");
  lines.push("## Bug");
  lines.push("");
  lines.push(`> ${input.contract.intent}`);
  lines.push("");

  lines.push("## Confirmed facts");
  lines.push("");
  for (const fact of input.finding.confirmed_facts) {
    lines.push(`- ${fact}`);
  }
  if (input.finding.confirmed_facts.length === 0) {
    lines.push("- No confirmed facts were established beyond the report structure.");
  }
  lines.push("");

  if (hypothesis) {
    lines.push("## Agent suspected cause");
    lines.push("");
    lines.push(hypothesis);
    lines.push("");
    lines.push("This is an unverified hypothesis. Do not treat it as confirmed.");
    lines.push("");
  }

  lines.push("## Suspected repair surface");
  lines.push("");
  for (const file of input.contract.suspect_surface.files) {
    lines.push(`- \`${file.path}\` (${file.confidence}) — ${file.reason}`);
  }
  lines.push("");

  lines.push("## Repair relation graph summary");
  lines.push("");
  const graphPreview = input.contract.repair_relation_graph.slice(0, 12);
  for (const edge of graphPreview) {
    lines.push(`- \`${edge.from}\` -> \`${edge.to}\` (${edge.relation}, ${edge.confidence}) — ${edge.reason}`);
  }
  if (input.contract.repair_relation_graph.length > graphPreview.length) {
    lines.push(`- ... ${input.contract.repair_relation_graph.length - graphPreview.length} more relation edges`);
  }
  if (input.contract.graph_build_stats) {
    const stats = input.contract.graph_build_stats;
    const truncated = stats.truncation_entries.filter(t => t.truncated);
    if (truncated.length > 0) {
      lines.push("");
      lines.push("**Truncated areas:**");
      for (const t of truncated.slice(0, 5)) {
        lines.push(`- \`${t.pattern ?? t.relation}\` matched ${t.total_matches} files, showing ${t.displayed_edges}`);
      }
      if (truncated.length > 5) {
        lines.push(`- ... ${truncated.length - 5} more truncated areas`);
      }
    }
    lines.push("");
    lines.push(`> ${stats.limitation}`);
  }
  lines.push("");

  lines.push("## Allowed changes");
  lines.push("");
  const allowedPreview = input.contract.repair_scope.allowed.slice(0, 25);
  for (const entry of allowedPreview) {
    lines.push(`- \`${entry.pattern}\` — ${entry.reason}`);
  }
  if (input.contract.repair_scope.allowed.length > 25) {
    lines.push(`- ... ${input.contract.repair_scope.allowed.length - 25} more allowed entries`);
  }
  lines.push("");

  lines.push("## Review-required changes");
  lines.push("");
  if (input.contract.repair_scope.review_required.length === 0) {
    lines.push("- None");
  } else {
    for (const entry of input.contract.repair_scope.review_required) {
      lines.push(`- \`${entry.pattern}\` — ${entry.reason}`);
    }
  }
  lines.push("");

  lines.push("## Forbidden changes");
  lines.push("");
  const forbiddenPreview = input.contract.repair_scope.forbidden.slice(0, 25);
  for (const entry of forbiddenPreview) {
    lines.push(`- \`${entry.pattern}\` — ${entry.reason}`);
  }
  if (input.contract.repair_scope.forbidden.length > 25) {
    lines.push(`- ... ${input.contract.repair_scope.forbidden.length - 25} more forbidden entries`);
  }
  lines.push("");

  if (input.contract.must_preserve.length > 0) {
    lines.push("## Must preserve");
    lines.push("");
    for (const statement of input.contract.must_preserve) {
      lines.push(`- ${statement}`);
    }
    lines.push("");
  }

  lines.push("## Consistency checklist");
  lines.push("");
  for (const check of input.contract.consistency_checks) {
    lines.push(`- [${check.severity}] ${check.statement}`);
  }
  lines.push("");

  lines.push("## Test signals");
  lines.push("");
  if (input.contract.test_signals.related.length > 0) {
    lines.push("Related tests:");
    for (const path of input.contract.test_signals.related) {
      lines.push(`- \`${path}\``);
    }
  }
  if (input.contract.test_signals.recommended.length > 0) {
    lines.push("");
    lines.push("Recommended tests:");
    for (const path of input.contract.test_signals.recommended) {
      lines.push(`- \`${path}\``);
    }
  }
  if (input.contract.test_signals.missing_mapping.length > 0) {
    lines.push("");
    lines.push("Missing mapping warnings:");
    for (const item of input.contract.test_signals.missing_mapping) {
      lines.push(`- ${item}`);
    }
  }
  lines.push("");

  lines.push("## If you need to go outside scope");
  lines.push("");
  lines.push("Request scope expansion. Do not silently modify unrelated or forbidden files.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("_Auto-generated by Pantheon. Do not edit._");
  lines.push("");

  return lines.join("\n");
}

export function renderRepairScopeMarkdown(contract: RepairContract): string {
  const lines: string[] = [];

  lines.push("# Repair Scope");
  lines.push("");
  lines.push(`**Repair ID:** \`${contract.repair_id}\``);
  lines.push(`**Audit status:** \`${contract.audit_status}\``);
  lines.push("");

  lines.push("## Allowed");
  lines.push("");
  for (const entry of contract.repair_scope.allowed) {
    lines.push(`- \`${entry.pattern}\` (${entry.audit_weight}) — ${entry.reason}`);
  }
  lines.push("");

  lines.push("## Review required");
  lines.push("");
  if (contract.repair_scope.review_required.length === 0) {
    lines.push("- None");
  } else {
    for (const entry of contract.repair_scope.review_required) {
      lines.push(`- \`${entry.pattern}\` (${entry.audit_weight}) — ${entry.reason}`);
    }
  }
  lines.push("");

  lines.push("## Forbidden");
  lines.push("");
  for (const entry of contract.repair_scope.forbidden) {
    lines.push(`- \`${entry.pattern}\` (${entry.audit_weight}) — ${entry.reason}`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("_Auto-generated by Pantheon. Do not edit._");
  lines.push("");

  return lines.join("\n");
}

export function renderConsistencyChecklistMarkdown(contract: RepairContract): string {
  const lines: string[] = [];
  lines.push("# Consistency Checklist");
  lines.push("");
  for (const check of contract.consistency_checks) {
    lines.push(`## ${check.statement}`);
    lines.push("");
    lines.push(`- **Severity:** ${check.severity}`);
    lines.push(`- **Source:** ${check.source}`);
    lines.push(`- **Reason:** ${check.reason}`);
    if (check.evidence.length > 0) {
      lines.push(`- **Evidence:** ${check.evidence.join(", ")}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("_Auto-generated by Pantheon. Do not edit._");
  lines.push("");
  return lines.join("\n");
}
