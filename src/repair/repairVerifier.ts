import type { GitDiffSummary } from "../diffWorkflow/types.js";
import type { RepairCheck, RepairCheckFinding, RepairContract, RepairFeedback } from "./types.js";
import { matchesPattern } from "./repairUtils.js";
import { isMixedBootstrapAndRepair } from "../alpha/bootstrapScope.js";

export function verifyRepairDiff(input: {
  contract: RepairContract;
  diff: GitDiffSummary;
}): { check: RepairCheck; feedback: RepairFeedback } {
  const findings: RepairCheckFinding[] = [];
  let allowed = 0;
  let reviewRequired = 0;
  let forbidden = 0;
  let outsideScope = 0;

  const changedPaths = input.diff.changed_files.map(file => file.path);

  if (isMixedBootstrapAndRepair(changedPaths)) {
    findings.push({
      kind: "bootstrap_scope_mixed_with_repair",
      severity: "requires_replan",
      message: "This repair also contains Pantheon bootstrap files. Commit or approve the bootstrap change separately, then re-run repair check.",
      allowed_actions: ["request_replan"],
      requires_human: true,
      evidence: ["mixed_bootstrap_repair_scope"],
    });
  }

  for (const changed of input.diff.changed_files) {
    const path = changed.path;
    const forbiddenEntry = matchScopeEntry(path, input.contract.repair_scope.forbidden);
    if (forbiddenEntry) {
      forbidden++;
      findings.push({
        kind: "forbidden_file",
        severity: "blocking",
        file: path,
        message: `Forbidden repair change: ${path}`,
        allowed_actions: ["revert_file", "request_scope_expansion"],
        requires_human: true,
        bucket: "forbidden",
        evidence: forbiddenEntry.evidence,
      });
      continue;
    }

    const reviewEntry = matchScopeEntry(path, input.contract.repair_scope.review_required);
    if (reviewEntry) {
      reviewRequired++;
      findings.push({
        kind: "review_required_file",
        severity: "review_required",
        file: path,
        message: `Repair touches review-required file: ${path}`,
        allowed_actions: ["keep_for_human_review"],
        requires_human: true,
        bucket: "review_required",
        evidence: reviewEntry.evidence,
      });
      continue;
    }

    const allowedEntry = matchScopeEntry(path, input.contract.repair_scope.allowed);
    if (allowedEntry) {
      allowed++;
      continue;
    }

    outsideScope++;
    findings.push({
      kind: "outside_scope_file",
      severity: "blocking",
      file: path,
      message: `Repair change is outside the approved scope: ${path}`,
      allowed_actions: ["revert_file", "request_scope_expansion"],
      requires_human: true,
      bucket: "outside_scope",
      evidence: ["repair_scope:outside"],
    });
  }

  const touchedAnyRelatedTest = input.contract.test_signals.related.some(path => changedPaths.includes(path));
  if (input.contract.test_signals.related.length > 0 && !touchedAnyRelatedTest) {
    findings.push({
      kind: "missing_related_test_signal",
      severity: "warning",
      message: "No related test file was included in the repair diff.",
      allowed_actions: ["add_or_run_related_test", "keep_for_human_review"],
      requires_human: false,
      evidence: input.contract.test_signals.related.map(path => `related_test:${path}`),
    });
  }

  const verdict = deriveRepairVerdictFromFindings(findings);

  const check: RepairCheck = {
    schema_version: "repair_check.v1",
    repair_id: input.contract.repair_id,
    verdict,
    generated_at: new Date().toISOString(),
    summary: {
      changed_files: input.diff.changed_files.length,
      allowed,
      review_required: reviewRequired,
      forbidden,
      outside_scope: outsideScope,
      warnings: findings.filter(finding => finding.severity === "warning").length,
    },
    findings,
    concurrent_findings: [],
    changed_files: changedPaths,
    audit_status: input.contract.audit_status,
  };

  return {
    check,
    feedback: buildRepairFeedbackFromCheck(check),
  };
}

export function deriveRepairVerdictFromFindings(findings: readonly RepairCheckFinding[]): RepairCheck["verdict"] {
  if (findings.some(finding => finding.kind === "forbidden_file")) {
    return "fail";
  }
  if (findings.some(finding => finding.kind === "stale_repair_contract")) {
    return "requires_replan";
  }
  if (findings.some(finding => finding.kind === "bootstrap_scope_mixed_with_repair")) {
    return "requires_replan";
  }
  if (findings.some(finding => finding.kind === "outside_scope_file")) {
    return "requires_scope_expansion";
  }
  if (findings.some(finding => finding.severity === "review_required" || finding.severity === "requires_human_audit")) {
    return "requires_review";
  }
  return "pass";
}

export function buildRepairFeedbackFromCheck(check: RepairCheck): RepairFeedback {
  const actions = check.findings.flatMap(finding => finding.allowed_actions.map(action => ({
    action,
    file: finding.file,
    message: finding.message,
  })));

  return {
    schema_version: "repair_feedback.v1",
    feedback_id: `repair_feedback_${check.repair_id}`,
    repair_id: check.repair_id,
    verdict: check.verdict,
    generated_at: new Date().toISOString(),
    actions,
    requires_human: check.findings.some(finding => finding.requires_human),
    notes: check.findings.map(finding => finding.message),
  };
}

function matchScopeEntry(
  path: string,
  entries: RepairContract["repair_scope"]["allowed"],
) {
  return entries.find(entry => matchesPattern(path, entry.pattern));
}
