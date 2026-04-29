/**
 * P19d: Change Contract Verifier
 *
 * Consumes a P18 ScopeDiffReport and applies its verdict to a ChangeContract.
 * This closes the verification loop:
 *   P15 → P17 → P19b (build) → P19c (export) → agent work → P18 (diff) → P19d (verify)
 *
 * The verifier:
 *   1. Validates the contract is in "exported" or "escalated" status
 *   2. Validates the report's scope_id matches the contract's scope
 *   3. Transitions the contract based on the report verdict:
 *      - pass → "verified"
 *      - fail → "escalated" (with violations)
 *      - requires_reverse_issue → "escalated"
 *      - requires_human_review → "escalated"
 *   4. Updates verification obligations (scope_diff → passed/failed)
 *   5. Records scope_diff_report_hash on refs
 *
 * Design invariants:
 *   - Only "exported" or "escalated" contracts can be verified (fail-closed).
 *   - The report's scope hash must match the contract's scope_hash.
 *   - On pass: transitions to "verified" with scope_diff_verified event.
 *   - On fail: transitions to "escalated" with reverse_issue_required event.
 *   - Obligations are updated but never removed (append-only spirit).
 *
 * ref: P19d
 */
import { createHash } from "node:crypto";
import { transitionChangeContract, createResultEvent } from "./lifecycle.js";
// ---------------------------------------------------------------------------
// Verifier
// ---------------------------------------------------------------------------
/**
 * Verify a ChangeContract against a P18 scope diff report.
 *
 * @throws if the contract is not in "exported" or "escalated" status.
 * @throws if the report's scope hash doesn't match the contract.
 */
export function verifyChangeContract(input) {
    const { contract, scopeDiffReport } = input;
    const now = input.timestamp ?? new Date().toISOString();
    // --- Guard: status ---
    if (contract.lifecycle_status !== "exported" && contract.lifecycle_status !== "escalated") {
        throw new Error(`Cannot verify contract: status is '${contract.lifecycle_status}', ` +
            `expected 'exported' or 'escalated'. Contract: ${contract.contract_id}`);
    }
    // --- Guard: scope binding ---
    if (scopeDiffReport.source.scope_hash !== contract.scope.scope_hash) {
        throw new Error(`Scope hash mismatch: report scope_hash '${scopeDiffReport.source.scope_hash}' ` +
            `does not match contract scope_hash '${contract.scope.scope_hash}'. ` +
            `Cannot verify with an unrelated scope diff report.`);
    }
    const reportHash = hashString(JSON.stringify(scopeDiffReport));
    const passed = scopeDiffReport.status === "pass";
    // --- Update obligations ---
    const updatedObligations = updateObligations(contract.verification.obligations, passed, scopeDiffReport.status);
    let updated;
    if (passed) {
        // --- PASS: transition to verified ---
        const verifiedEvent = createResultEvent("scope_diff_verified", "pass", `Scope diff verified: ${scopeDiffReport.summary.changed_files} files checked, all within scope`, {
            report_hash: reportHash,
            scope_id: scopeDiffReport.scope_id,
            changed_files: String(scopeDiffReport.summary.changed_files),
            violations: "0",
        }, now);
        updated = transitionChangeContract(contract, "verified", verifiedEvent);
    }
    else {
        // --- FAIL / ESCALATED: transition to escalated ---
        // Use scope_diff_verified with fail status for actual scope violations.
        // Use reverse_issue_required for reverse issue triggers.
        // Both are recognized by deriveDecision() to update current_decision.
        const eventType = scopeDiffReport.status === "requires_reverse_issue"
            ? "reverse_issue_required"
            : "scope_diff_verified";
        const escalateEvent = createResultEvent(eventType, scopeDiffReport.status, buildEscalationSummary(scopeDiffReport), {
            report_hash: reportHash,
            scope_id: scopeDiffReport.scope_id,
            violations: String(scopeDiffReport.violations.length),
            blocking_reasons: scopeDiffReport.blocking_reasons.join("; "),
        }, now);
        updated = transitionChangeContract(contract, "escalated", escalateEvent);
    }
    // --- Apply obligation updates + report hash + required actions ---
    const reportActions = scopeDiffReport.required_actions ?? [];
    updated = {
        ...updated,
        refs: {
            ...updated.refs,
            scope_diff_report_hash: reportHash,
        },
        verification: {
            obligations: updatedObligations,
        },
        current_decision: {
            ...updated.current_decision,
            required_actions: passed
                ? updated.current_decision.required_actions
                : reportActions,
            latest_report_hash: reportHash,
        },
    };
    return {
        contract: updated,
        passed,
        blocking_reasons: scopeDiffReport.blocking_reasons,
        report_hash: reportHash,
    };
}
// ---------------------------------------------------------------------------
// Obligation Updates
// ---------------------------------------------------------------------------
function updateObligations(obligations, passed, reportStatus) {
    return obligations.map(obl => {
        if (obl.type === "scope_diff") {
            // requires_human_review means the diff itself may be clean
            // but review metadata is missing — don't mark scope_diff as failed.
            if (reportStatus === "requires_human_review") {
                return obl; // keep current status (pending)
            }
            return {
                ...obl,
                status: passed ? "passed" : "failed",
            };
        }
        return obl;
    });
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildEscalationSummary(report) {
    const parts = [];
    parts.push(`Scope diff ${report.status}`);
    if (report.violations.length > 0) {
        parts.push(`${report.violations.length} violation(s)`);
    }
    if (report.blocking_reasons.length > 0) {
        parts.push(`blocking: ${report.blocking_reasons[0]}`);
    }
    return parts.join(", ");
}
function hashString(s) {
    return "sha256:" + createHash("sha256").update(s).digest("hex");
}
//# sourceMappingURL=changeContractVerifier.js.map