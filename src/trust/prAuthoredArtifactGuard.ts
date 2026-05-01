/**
 * P29.5: PR-Authored Artifact Guard
 *
 * Detects when a PR/diff includes files that LOOK like governance artifacts
 * (audit decisions, approval records, contracts, review requests) but are
 * authored within the PR itself — and therefore CANNOT be trusted.
 *
 * Rule: PR-authored governance artifacts are NEVER valid trust sources.
 * They can only be subjects of review, not evidence of approval.
 *
 * Checks both ADDED and MODIFIED files (implementation guard #4).
 *
 * ref: P29.5 INV-4, section 9
 */

import type {
  ContractGateFinding,
  PrArtifactGuardResult,
} from "../policy/contractGateTypes.js";

// ---------------------------------------------------------------------------
// Artifact patterns that can never be self-authored trust sources
// ---------------------------------------------------------------------------

const AUDIT_ARTIFACT_PATTERNS: readonly string[] = [
  "human_audit_decision.json",
  "human_decision.json",
  "approval.json",
  "audit_decision.json",
];

const CONTRACT_ARTIFACT_PATTERNS: readonly string[] = [
  "repair_contract.latest.json",
  "repair_contract_latest.json",
  "change_contract.latest.json",
  "change_contract_latest.json",
];

const REVIEW_ARTIFACT_PATTERNS: readonly string[] = [
  "review_queue.json",
  "review_request.json",
  "review_request.md",
];

const GOVERNANCE_EVENT_PATTERNS: readonly string[] = [
  "events.jsonl",
  "governance_events.jsonl",
];

const METRICS_SNAPSHOT_PATTERNS: readonly string[] = [
  "daily_report.json",
  "metrics_snapshot.json",
  "capture_report.json",
];

/**
 * Path prefixes that, when combined with artifact patterns, indicate
 * the file is a governance artifact (not just a similarly-named file).
 */
const GOVERNANCE_PATH_PREFIXES: readonly string[] = [
  ".pantheon/audit/",
  ".pantheon/reviews/",
  ".pantheon/repair/",
  ".pantheon/change/",
  ".pantheon/governance/",
  ".pantheon/metrics/",
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Inspect changed files for PR-authored governance artifacts.
 *
 * @param changedPaths - All changed file paths in the diff (added + modified).
 *                       These represent files the PR author can control.
 */
export function guardPrAuthoredArtifacts(
  changedPaths: readonly string[],
): PrArtifactGuardResult {
  const ignoredArtifacts: string[] = [];
  const findings: ContractGateFinding[] = [];
  let fakeApprovalDetected = false;

  for (const path of changedPaths) {
    const classification = classifyArtifact(path);
    if (!classification) continue;

    ignoredArtifacts.push(path);

    if (classification === "approval") {
      fakeApprovalDetected = true;
      findings.push({
        kind: "fake_approval_ignored",
        severity: "critical",
        path,
        message: `PR includes approval/audit artifact that cannot be trusted: ${path}. Use GitHub review, CODEOWNERS approval, or a trusted maintainer label instead.`,
        action: "fail_closed",
      });
    } else if (classification === "contract") {
      findings.push({
        kind: "pr_authored_contract_ignored",
        severity: "blocking",
        path,
        message: `PR modifies contract artifact: ${path}. PR-authored contracts are not valid trust sources.`,
        action: "request_replan",
      });
    } else {
      // review / governance / metrics artifacts
      findings.push({
        kind: "pr_authored_contract_ignored",
        severity: "warning",
        path,
        message: `PR modifies governance artifact: ${path}. This file will not be used as a trust source.`,
        action: "none",
      });
    }
  }

  return {
    fake_approval_detected: fakeApprovalDetected,
    ignored_artifacts: ignoredArtifacts,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type ArtifactClassification = "approval" | "contract" | "review" | "governance" | "metrics";

function classifyArtifact(path: string): ArtifactClassification | null {
  // Only flag files under known governance path prefixes
  const isGovernancePath = GOVERNANCE_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
  if (!isGovernancePath) return null;

  const basename = path.split("/").pop() ?? "";

  if (AUDIT_ARTIFACT_PATTERNS.some(p => basename === p || basename.endsWith(p))) {
    return "approval";
  }
  if (CONTRACT_ARTIFACT_PATTERNS.some(p => basename === p || basename.endsWith(p))) {
    return "contract";
  }
  if (REVIEW_ARTIFACT_PATTERNS.some(p => basename === p || basename.endsWith(p))) {
    return "review";
  }
  if (GOVERNANCE_EVENT_PATTERNS.some(p => basename === p || basename.endsWith(p))) {
    return "governance";
  }
  if (METRICS_SNAPSHOT_PATTERNS.some(p => basename === p || basename.endsWith(p))) {
    return "metrics";
  }

  return null;
}
