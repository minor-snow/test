/**
 * P24: Public Check Projection
 *
 * Transforms internal verification/feedback objects into the stable
 * pantheon_check.v1 public JSON schema.
 *
 * CRITICAL: This module is the information boundary.
 * It must NOT expose internal objects (ChangeContract, boundary graph,
 * hash payload, gate registry, full observations).
 */

import type { DiffVerificationResult } from "../diffWorkflow/types.js";
import type { AgentFeedback } from "../agentFeedback/types.js";
import type { PantheonCheckPublic, PantheonCheckSummary, PantheonFinding, PantheonRepoInfo } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildPublicCheck(input: {
  verification: DiffVerificationResult;
  feedback: AgentFeedback;
  intent: string;
  repo: PantheonRepoInfo;
  artifactRelDir?: string;
}): PantheonCheckPublic {
  const { verification, feedback, intent, repo } = input;
  const relDir = input.artifactRelDir ?? ".pantheon";

  const summary = buildSummary(verification);
  const findings = buildFindings(feedback);

  return {
    schema_version: "pantheon_check.v1",
    verdict: verification.verdict,
    intent,
    summary,
    findings,
    artifacts: {
      task: `${relDir}/task.md`,
      scope: `${relDir}/scope.md`,
      report: `${relDir}/report.md`,
      feedback: `${relDir}/feedback.md`,
    },
    repo,
  };
}

/**
 * Build a guard-phase (pre-check) public JSON.
 * No verification/feedback yet — just the baseline.
 */
export function buildPublicGuardBaseline(input: {
  intent: string;
  allowedCount: number;
  reviewRequiredCount: number;
  forbiddenCount: number;
  repo: PantheonRepoInfo;
  artifactRelDir?: string;
}): PantheonCheckPublic {
  const relDir = input.artifactRelDir ?? ".pantheon";
  return {
    schema_version: "pantheon_check.v1",
    verdict: "guard_created",
    intent: input.intent,
    summary: {
      changed_files: input.allowedCount + input.reviewRequiredCount,
      in_scope: input.allowedCount,
      review_required: input.reviewRequiredCount,
      outside_scope: 0,
      forbidden: 0,
    },
    findings: [],
    artifacts: {
      task: `${relDir}/task.md`,
      scope: `${relDir}/scope.md`,
      report: `${relDir}/report.md`,
      feedback: `${relDir}/feedback.md`,
    },
    repo: input.repo,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildSummary(verification: DiffVerificationResult): PantheonCheckSummary {
  let inScope = 0;
  let reviewRequired = 0;
  let outsideScope = 0;
  let forbidden = 0;

  for (const fs of verification.file_statuses) {
    switch (fs.status) {
      case "allowed": inScope++; break;
      case "review_required": reviewRequired++; break;
      case "outside_scope": outsideScope++; break;
      case "forbidden": forbidden++; break;
    }
  }

  return {
    changed_files: verification.file_statuses.length,
    in_scope: inScope,
    review_required: reviewRequired,
    outside_scope: outsideScope,
    forbidden,
  };
}

function buildFindings(feedback: AgentFeedback): PantheonFinding[] {
  return feedback.violations.map(v => ({
    kind: v.kind,
    severity: v.severity,
    file: v.location.file_path ?? v.location.old_file_path ?? "(not specified)",
    message: v.message,
    allowed_actions: [...v.allowed_agent_actions],
    requires_human: v.requires_human,
  }));
}
