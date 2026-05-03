import { randomUUID } from "node:crypto";
import { appendGovernanceEvent } from "../governanceLog/governanceEventWriter.js";
export function writeChangeIntakeEvent(repoRoot, intake) {
    appendGovernanceEvent(repoRoot, {
        schema_version: "pantheon_governance_event@0.1.0",
        event_id: randomUUID(),
        timestamp: new Date().toISOString(),
        source: "local_cli",
        event_type: "change_intake_created",
        target_type: "change",
        target_id: intake.change_id,
        change_id: intake.change_id,
        attention_level: "none",
    });
}
export function writeChangePlanEvent(repoRoot, contract) {
    appendGovernanceEvent(repoRoot, {
        schema_version: "pantheon_governance_event@0.1.0",
        event_id: randomUUID(),
        timestamp: new Date().toISOString(),
        source: "local_cli",
        event_type: "change_contract_planned",
        target_type: "change",
        target_id: contract.change_id,
        change_id: contract.change_id,
        contract_revision: contract.revision,
        attention_level: "none",
    });
}
export function writeChangeCheckEvent(repoRoot, result) {
    appendGovernanceEvent(repoRoot, {
        schema_version: "pantheon_governance_event@0.1.0",
        event_id: randomUUID(),
        timestamp: new Date().toISOString(),
        source: "local_cli",
        event_type: resolveCheckEventType(result.verdict),
        target_type: "change",
        target_id: result.change_id,
        change_id: result.change_id,
        verdict: result.verdict,
        attention_level: resolveCheckAttentionLevel(result.verdict),
        changed_files_count: result.changed_files.length,
        bucket_counts: result.bucket_counts,
        reasons: buildGovernanceReasons(result),
    });
}
function resolveCheckEventType(verdict) {
    if (verdict === "fail" || verdict === "requires_contract")
        return "change_blocked";
    if (verdict === "requires_replan" || verdict === "requires_scope_expansion")
        return "change_replanned";
    if (verdict === "requires_review")
        return "review_requested";
    return "change_check_completed";
}
function resolveCheckAttentionLevel(verdict) {
    if (verdict === "fail" || verdict === "requires_contract")
        return "blocking";
    if (verdict === "requires_review" || verdict === "requires_scope_expansion")
        return "human_review";
    if (verdict === "requires_replan")
        return "info";
    return "none";
}
function buildGovernanceReasons(result) {
    const reasons = [];
    for (const finding of result.findings) {
        switch (finding.kind) {
            case "review_required_file":
                for (const file of finding.files ?? []) {
                    reasons.push({ kind: "review_required", file, action: "human_review" });
                }
                break;
            case "outside_scope_file":
                for (const file of finding.files ?? []) {
                    reasons.push({ kind: "outside_scope", file, action: "request_scope_expansion" });
                }
                break;
            case "forbidden_file":
                for (const file of finding.files ?? []) {
                    reasons.push({ kind: "forbidden_file_touched", file, action: "revert_file" });
                }
                break;
            case "stale_base_sha":
                reasons.push({ kind: "stale_repair_contract", action: "request_replan" });
                break;
            case "architecture_forbidden":
                for (const file of finding.files ?? []) {
                    reasons.push({ kind: "architecture_forbidden", file, action: "block_merge" });
                }
                break;
            case "architecture_review_required":
                for (const file of finding.files ?? []) {
                    reasons.push({ kind: "architecture_review_required", file, action: "human_review" });
                }
                break;
            case "architecture_contract_modified":
                reasons.push({ kind: "architecture_contract_modified", action: "human_review" });
                break;
            default:
                break;
        }
    }
    return dedupeGovernanceReasons(reasons);
}
function dedupeGovernanceReasons(reasons) {
    const seen = new Set();
    const result = [];
    for (const reason of reasons) {
        const key = `${reason.kind}:${reason.file ?? ""}:${reason.pattern ?? ""}:${reason.action}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(reason);
    }
    return result;
}
//# sourceMappingURL=changeGovernanceEventWriter.js.map