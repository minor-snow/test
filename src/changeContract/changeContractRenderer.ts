/**
 * P19.1: Change Contract Markdown Renderer
 *
 * Renders a ChangeContract into human-readable Markdown.
 *
 * Design invariants:
 *   - Input: ChangeContract object ONLY (never Markdown, never raw reports)
 *   - Output: Read-only Markdown projection (JSON is authoritative)
 *   - Structure: Decision Summary first, Projection Notice last
 *   - Technical IDs preserved for traceability
 *
 * ref: P19.1
 */

import type {
  ChangeContract,
  ChangeScopeFile,
  ChangeScopeRequiredTest,
  VerificationObligation,
  ChangeResultEvent,
} from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a ChangeContract into Markdown.
 *
 * Consumes ChangeContract object only.
 * Does NOT consume Markdown, raw P15/P17/P18 reports, or disk files.
 */
export function renderChangeContractMarkdown(contract: ChangeContract): string {
  const sections: string[] = [];

  sections.push("# Pantheon Change Contract");
  sections.push("");

  sections.push(renderDecisionSummary(contract));
  sections.push(renderRequiredActions(contract));
  sections.push(renderBlockingReasons(contract));
  sections.push(renderIntent(contract));
  sections.push(renderAuthorizedScope(contract));
  sections.push(renderVerificationObligations(contract));
  sections.push(renderAgentConstraints(contract));
  sections.push(renderResultEvents(contract));
  sections.push(renderReferences(contract));
  sections.push(renderProjectionNotice());

  return sections.filter(s => s.length > 0).join("\n");
}

// ---------------------------------------------------------------------------
// Decision Summary (must be near the top)
// ---------------------------------------------------------------------------

function renderDecisionSummary(c: ChangeContract): string {
  const lines: string[] = [];
  lines.push("## Decision Summary");
  lines.push("");
  lines.push(`- **Contract ID**: \`${c.contract_id}\``);
  lines.push(`- **Lifecycle**: \`${c.lifecycle_status}\``);
  lines.push(`- **Decision**: \`${c.current_decision.decision}\``);
  lines.push(`- **Risk**: \`${c.impact.risk_level.toUpperCase()}\``);
  if (c.scope.must_require_human_review) {
    lines.push("- **Human Review**: REQUIRED");
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Required Actions (immediately after decision)
// ---------------------------------------------------------------------------

function renderRequiredActions(c: ChangeContract): string {
  const actions = c.current_decision.required_actions;
  if (!actions || actions.length === 0) return "";

  const lines: string[] = [];
  lines.push("### Required Actions");
  lines.push("");
  for (const action of actions) {
    lines.push(`- ${action}`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Blocking Reasons (from latest escalation events)
// ---------------------------------------------------------------------------

function renderBlockingReasons(c: ChangeContract): string {
  // Extract blocking reasons from the latest escalation event refs.
  const escalationEvents = c.result_events.filter(
    e => e.refs?.blocking_reasons && e.refs.blocking_reasons.length > 0,
  );
  if (escalationEvents.length === 0) return "";

  const latest = escalationEvents[escalationEvents.length - 1];
  const reasons = latest.refs!.blocking_reasons.split("; ");

  const lines: string[] = [];
  lines.push("### Why");
  lines.push("");
  for (const reason of reasons) {
    lines.push(`- ${reason}`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Intent
// ---------------------------------------------------------------------------

function renderIntent(c: ChangeContract): string {
  const lines: string[] = [];
  lines.push("## Intent");
  lines.push("");
  lines.push(c.change.intent);
  lines.push("");
  if (c.change.source_request) {
    lines.push(`**Source**: ${c.change.source_request}`);
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Authorized Scope
// ---------------------------------------------------------------------------

function renderAuthorizedScope(c: ChangeContract): string {
  const lines: string[] = [];
  lines.push("## Authorized Scope");
  lines.push("");

  // Allowed files
  lines.push("### Allowed Files");
  lines.push("");
  lines.push("| Path | Allowed Operations |");
  lines.push("|---|---|");
  for (const file of c.scope.allowed_files) {
    lines.push(`| \`${file.path}\` | ${file.allowed_operations.join(", ")} |`);
  }
  lines.push("");

  // Forbidden patterns
  if (c.scope.forbidden_paths.length > 0) {
    lines.push("### Forbidden Patterns");
    lines.push("");
    for (const p of c.scope.forbidden_paths) {
      lines.push(`- \`${p}\``);
    }
    lines.push("");
  }

  // Forbidden assumptions
  if (c.scope.forbidden_assumptions.length > 0) {
    lines.push("### Forbidden Assumptions");
    lines.push("");
    for (const a of c.scope.forbidden_assumptions) {
      lines.push(`- ${a}`);
    }
    lines.push("");
  }

  // Required tests
  if (c.scope.required_tests.length > 0) {
    lines.push("### Required Tests");
    lines.push("");
    lines.push("| Test ID | Test Name | Requirement |");
    lines.push("|---|---|---|");
    for (const t of c.scope.required_tests) {
      const req = t.requirement === "must_run"
        ? "must run"
        : "update if behavior changes";
      lines.push(`| \`${t.test_id}\` | ${t.test_name} | ${req} |`);
    }
    lines.push("");
  }

  // Escalation rules
  if (c.scope.escalation_rules.length > 0) {
    lines.push("### Escalation Rules");
    lines.push("");
    for (const r of c.scope.escalation_rules) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Verification Obligations
// ---------------------------------------------------------------------------

function renderVerificationObligations(c: ChangeContract): string {
  const lines: string[] = [];
  lines.push("## Verification Obligations");
  lines.push("");
  lines.push("| Type | ID | Required | Status | Description |");
  lines.push("|---|---|---|---|---|");
  for (const obl of c.verification.obligations) {
    lines.push(
      `| ${obl.type} | \`${obl.obligation_id}\` | ${obl.required ? "yes" : "no"} | ${obl.status} | ${obl.description} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Agent Constraints
// ---------------------------------------------------------------------------

function renderAgentConstraints(c: ChangeContract): string {
  const lines: string[] = [];
  lines.push("## Agent Constraints");
  lines.push("");
  lines.push(`- **Adapter**: \`${c.agent.adapter}\``);
  lines.push(`- **Exported**: ${c.agent.exported ? "yes" : "no"}`);
  if (c.agent.instructions_path) {
    lines.push(`- **Instructions**: \`${c.agent.instructions_path}\``);
  }
  if (c.agent.constraints_summary.length > 0) {
    for (const s of c.agent.constraints_summary) {
      lines.push(`- ${s}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Result Events
// ---------------------------------------------------------------------------

function renderResultEvents(c: ChangeContract): string {
  const lines: string[] = [];
  lines.push("## Result Events");
  lines.push("");
  lines.push("| Time | Event | Status | Summary |");
  lines.push("|---|---|---|---|");
  for (const evt of c.result_events) {
    lines.push(
      `| ${evt.created_at} | ${evt.event_type} | ${evt.status} | ${evt.summary} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

function renderReferences(c: ChangeContract): string {
  const lines: string[] = [];
  lines.push("## References");
  lines.push("");
  lines.push(`- Handoff hash: \`${c.refs.handoff_hash}\``);
  lines.push(`- Boundary graph hash: \`${c.refs.boundary_graph_hash}\``);
  lines.push(`- Blast radius hash: \`${c.refs.blast_radius_hash}\``);
  lines.push(`- Scoped handoff hash: \`${c.refs.scoped_handoff_hash}\``);
  if (c.refs.scope_diff_report_hash) {
    lines.push(`- Scope diff report hash: \`${c.refs.scope_diff_report_hash}\``);
  }
  lines.push(`- Scope hash: \`${c.scope.scope_hash}\``);
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Projection Notice (must be last)
// ---------------------------------------------------------------------------

function renderProjectionNotice(): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push("");
  lines.push("## Projection Notice");
  lines.push("");
  lines.push("This Markdown file is a **read-only projection**.");
  lines.push("The authoritative source is `change_contract.json`.");
  lines.push("Do not edit this file; regenerate from the JSON source.");
  lines.push("");
  return lines.join("\n");
}
