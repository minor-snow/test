/**
 * P29.5: Contract Gate Comment Renderer
 *
 * Renders GitHub PR comments for contract gate verdicts.
 * Three comment types:
 *   1. Contract Gate — requires_contract with why/next sections
 *   2. Governance Policy Changed — policy tamper notification
 *   3. Untrusted Approval Ignored — fake approval rejection
 *
 * All comments include base-branch policy disclosure.
 *
 * ref: P29.5 section 14
 */

import type { ContractGateResult } from "../policy/contractGateTypes.js";

// ---------------------------------------------------------------------------
// Comment marker (for update-in-place)
// ---------------------------------------------------------------------------

const GATE_COMMENT_MARKER = "<!-- pantheon-contract-gate -->";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ContractGateComment = {
  readonly markdown: string;
  readonly marker: string;
};

export function renderContractGateComment(
  result: ContractGateResult,
): ContractGateComment {
  const sections: string[] = [];

  // Header
  sections.push(renderHeader(result));

  // Policy source disclosure
  sections.push(renderPolicySourceDisclosure(result));

  // Policy tamper notice
  const tamperFindings = result.findings.filter(f => f.kind === "policy_tamper");
  if (tamperFindings.length > 0) {
    sections.push(renderPolicyTamperSection(tamperFindings));
  }

  // Fake approval notice
  const fakeApprovalFindings = result.findings.filter(f => f.kind === "fake_approval_ignored");
  if (fakeApprovalFindings.length > 0) {
    sections.push(renderFakeApprovalSection(fakeApprovalFindings));
  }

  // Why section
  if (result.required_action.why.length > 0) {
    sections.push(renderWhySection(result));
  }

  // Changed files summary
  if (result.changed_files.length > 0 && result.verdict !== "pass") {
    sections.push(renderChangedFilesSummary(result));
  }

  // Next steps
  if (result.required_action.next.length > 0) {
    sections.push(renderNextSection(result));
  }

  // Footer
  sections.push(renderFooter());

  const markdown = `${GATE_COMMENT_MARKER}\n${sections.join("\n\n")}`;

  return {
    markdown,
    marker: GATE_COMMENT_MARKER,
  };
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderHeader(result: ContractGateResult): string {
  const emoji = verdictEmoji(result.verdict);
  const title = verdictTitle(result.verdict);
  return `## ${emoji} ${title}\n\nVerdict: \`${result.verdict}\`\nRisk level: \`${result.risk_level}\``;
}

function renderPolicySourceDisclosure(result: ContractGateResult): string {
  const { mode, status, base_sha } = result.policy_source;

  if (mode === "base_branch" && status === "loaded") {
    const shaNote = base_sha ? ` (\`${base_sha.slice(0, 8)}\`)` : "";
    return `> Pantheon evaluated this PR using policy from the **base branch**${shaNote}.\n> Policy changes in this PR were not used to evaluate this PR.`;
  }

  if (status === "missing") {
    return `> ⚠️ Base branch policy not found. Conservative defaults were applied.`;
  }

  if (mode === "current_worktree") {
    return `> Policy source: current worktree (no base branch available).`;
  }

  return `> Policy source: \`${mode}\` (status: \`${status}\`).`;
}

function renderPolicyTamperSection(
  findings: ContractGateResult["findings"],
): string {
  const lines = [
    "### 🔒 Governance Policy Changed",
    "",
    "This PR modifies Pantheon or GitHub governance files:",
    "",
  ];

  for (const f of findings) {
    lines.push(`- \`${f.path ?? "unknown"}\` — ${f.message}`);
  }

  lines.push("");
  lines.push("A trusted maintainer must review this change.");

  return lines.join("\n");
}

function renderFakeApprovalSection(
  findings: ContractGateResult["findings"],
): string {
  const lines = [
    "### ⛔ Untrusted Approval Artifact Ignored",
    "",
    "This PR includes approval/audit artifacts, but PR-authored approval files are not trusted by Pantheon:",
    "",
  ];

  for (const f of findings) {
    lines.push(`- \`${f.path ?? "unknown"}\``);
  }

  lines.push("");
  lines.push("Use a GitHub review, CODEOWNERS approval, or a trusted maintainer label instead.");

  return lines.join("\n");
}

function renderWhySection(result: ContractGateResult): string {
  const lines = ["### Why", ""];
  for (let i = 0; i < result.required_action.why.length; i++) {
    lines.push(`${i + 1}. ${result.required_action.why[i]}`);
  }
  return lines.join("\n");
}

function renderChangedFilesSummary(result: ContractGateResult): string {
  const lines = ["### Changed Files", ""];
  lines.push("| File | Bucket | Risk |");
  lines.push("|------|--------|------|");

  // Show at most 15 files
  const displayFiles = result.changed_files.slice(0, 15);
  for (const f of displayFiles) {
    const riskEmoji = riskEmoji_(f.risk_level);
    lines.push(`| \`${f.path}\` | ${f.bucket} | ${riskEmoji} ${f.risk_level} |`);
  }

  if (result.changed_files.length > 15) {
    lines.push(`| ... | +${result.changed_files.length - 15} more | |`);
  }

  return lines.join("\n");
}

function renderNextSection(result: ContractGateResult): string {
  const lines = ["### Next Steps", ""];
  for (const step of result.required_action.next) {
    if (step.startsWith("Run:")) {
      lines.push(`- \`${step.replace("Run: ", "")}\``);
    } else {
      lines.push(`- ${step}`);
    }
  }
  return lines.join("\n");
}

function renderFooter(): string {
  return "---\n*Pantheon Contract Gate v1 — [docs](https://github.com/nicepkg/pantheon)*";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verdictEmoji(verdict: ContractGateResult["verdict"]): string {
  switch (verdict) {
    case "pass": return "✅";
    case "requires_review": return "👁️";
    case "requires_contract": return "📋";
    case "requires_replan": return "🔄";
    case "fail": return "❌";
  }
}

function verdictTitle(verdict: ContractGateResult["verdict"]): string {
  switch (verdict) {
    case "pass": return "Pantheon Contract Gate — Passed";
    case "requires_review": return "Pantheon Contract Gate — Review Required";
    case "requires_contract": return "Pantheon Contract Gate — Contract Required";
    case "requires_replan": return "Pantheon Contract Gate — Replan Required";
    case "fail": return "Pantheon Contract Gate — Blocked";
  }
}

function riskEmoji_(risk: string): string {
  switch (risk) {
    case "critical": return "🔴";
    case "high": return "🟠";
    case "medium": return "🟡";
    case "low": return "🟢";
    default: return "⚪";
  }
}
