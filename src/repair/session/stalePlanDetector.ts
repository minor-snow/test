import type { RepoStateSnapshot } from "./repairSessionTypes.js";

export type StalePlanDetection = {
  readonly kind: "stale_repair_contract" | "working_tree_changed";
  readonly severity: "warning" | "blocking";
  readonly reason: string;
  readonly recommended_action: "request_replan" | "continue";
};

export function detectStaleRepairPlan(input: {
  contractState: RepoStateSnapshot;
  currentState: RepoStateSnapshot;
}): readonly StalePlanDetection[] {
  const findings: StalePlanDetection[] = [];
  const { contractState, currentState } = input;
  const effectiveCurrentBase = currentState.diff_base ?? currentState.base_sha;

  if (currentState.error || (contractState.base_sha && !effectiveCurrentBase)) {
    findings.push({
      kind: "stale_repair_contract",
      severity: "blocking",
      reason: currentState.error
        ? `Unable to capture current repository state: ${currentState.error}`
        : "Unable to determine the current repository base for this repair contract.",
      recommended_action: "request_replan",
    });
  }

  if (
    contractState.base_sha &&
    effectiveCurrentBase &&
    contractState.base_sha !== effectiveCurrentBase
  ) {
    findings.push({
      kind: "stale_repair_contract",
      severity: "blocking",
      reason: `Repair contract was generated at ${contractState.base_sha}, but repository base is now ${effectiveCurrentBase}.`,
      recommended_action: "request_replan",
    });
  }

  if (
    contractState.working_tree_status === "clean" &&
    currentState.working_tree_status === "dirty"
  ) {
    findings.push({
      kind: "working_tree_changed",
      severity: "warning",
      reason: "Repair contract was generated on a clean working tree, but the repository is now dirty.",
      recommended_action: "continue",
    });
  }

  return findings;
}
