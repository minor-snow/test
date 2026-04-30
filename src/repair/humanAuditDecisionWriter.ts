import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { HumanAuditDecision, RepairAuditDecisionType, RepairAuditGate } from "./types.js";
import { humanAuditDecisionSchema } from "./types.js";
import { deterministicId } from "./repairUtils.js";
import { repairRunPaths } from "./repairArtifactLayout.js";

export function buildHumanAuditDecision(input: {
  repairId: string;
  targetRevision: number;
  gate: RepairAuditGate;
  decision: RepairAuditDecisionType;
  operatorId: string;
  reason: string;
  addReview?: readonly string[];
  addForbid?: readonly string[];
  addMustPreserve?: readonly string[];
}): HumanAuditDecision {
  const createdAt = new Date().toISOString();
  return humanAuditDecisionSchema.parse({
    schema_version: "human_audit_decision@0.1.0",
    decision_id: deterministicId("audit", {
      repairId: input.repairId,
      gate: input.gate,
      decision: input.decision,
      reason: input.reason,
      createdAt,
    }),
    repair_id: input.repairId,
    target_revision: input.targetRevision,
    gate: input.gate,
    decision: input.decision,
    operator_id: input.operatorId,
    reason: input.reason,
    changes_to_scope: {
      add_review: [...(input.addReview ?? [])],
      add_forbid: [...(input.addForbid ?? [])],
    },
    added_must_preserve: [...(input.addMustPreserve ?? [])],
    created_at: createdAt,
  });
}

export function writeHumanAuditDecision(repoRoot: string, decision: HumanAuditDecision): string {
  const target = repairRunPaths(repoRoot, decision.repair_id).humanAuditDecision(decision.decision_id);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(decision, null, 2));
  return target;
}
