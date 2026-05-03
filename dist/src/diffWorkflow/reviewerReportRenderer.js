/**
 * P21: Reviewer Report Renderer
 *
 * Generates a human-readable markdown report for code reviewers.
 * Shows authorized scope vs actual diff and verification result.
 */
import { generateObservationRecommendations } from "../repoObservation/observationQuality.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function renderReviewerReport(input) {
    const { intent, diff, contract, scope, verification, observations } = input;
    const lines = [];
    lines.push("# Pantheon Reviewer Report");
    lines.push("");
    // Decision
    lines.push("## Decision");
    lines.push("");
    if (verification) {
        lines.push(`- **Verdict:** ${verification.verdict}`);
        if (verification.reasons.length > 0) {
            lines.push("- **Reasons:**");
            for (const r of verification.reasons) {
                lines.push(`  - ${r}`);
            }
        }
        if (verification.required_actions.length > 0) {
            lines.push("- **Required actions:**");
            for (const a of verification.required_actions) {
                lines.push(`  - ${a}`);
            }
        }
    }
    else {
        lines.push(`- **Contract verdict:** ${contract.decision.verdict}`);
        if (contract.decision.reasons.length > 0) {
            lines.push("- **Reasons:**");
            for (const r of contract.decision.reasons) {
                lines.push(`  - ${r}`);
            }
        }
        lines.push("- _Verification not yet run._");
    }
    lines.push("");
    // Intent
    if (intent || contract.intent) {
        lines.push("## Intent");
        lines.push("");
        lines.push(`> ${intent || contract.intent}`);
        lines.push("");
    }
    // Authorized Scope
    lines.push("## Authorized Scope");
    lines.push("");
    lines.push("### Allowed Files");
    lines.push("");
    if (scope.allowed_files.length > 0) {
        for (const f of scope.allowed_files) {
            lines.push(`- \`${f}\``);
        }
    }
    else {
        lines.push("_No files authorized._");
    }
    lines.push("");
    if (scope.review_required_files.length > 0) {
        lines.push("### Review-Required Files");
        lines.push("");
        for (const f of scope.review_required_files) {
            lines.push(`- \`${f.path}\``);
            for (const r of f.reasons) {
                lines.push(`  - ${r}`);
            }
        }
        lines.push("");
    }
    lines.push("### Forbidden Patterns");
    lines.push("");
    for (const fp of scope.forbidden_patterns) {
        lines.push(`- \`${fp.pattern}\` — ${fp.reason}`);
    }
    lines.push("");
    if (scope.required_tests.length > 0) {
        lines.push("### Required Tests");
        lines.push("");
        for (const t of scope.required_tests) {
            lines.push(`- \`${t}\``);
        }
        lines.push("");
    }
    // Actual Diff
    lines.push("## Actual Diff");
    lines.push("");
    lines.push(`- **Base ref:** ${diff.base_ref}`);
    lines.push(`- **Changed files:** ${diff.changed_files.length}`);
    lines.push("");
    if (diff.changed_files.length > 0) {
        lines.push("| File | Status |");
        lines.push("|---|---|");
        for (const f of diff.changed_files) {
            lines.push(`| \`${f.path}\` | ${f.status ?? "unknown"} |`);
        }
        lines.push("");
    }
    // Verification breakdown
    if (verification) {
        const outsideScope = verification.file_statuses.filter(s => s.status === "outside_scope");
        const forbidden = verification.file_statuses.filter(s => s.status === "forbidden");
        if (outsideScope.length > 0) {
            lines.push("### Out-of-Scope Files");
            lines.push("");
            for (const f of outsideScope) {
                lines.push(`- \`${f.path}\` — ${f.reasons.join("; ")}`);
            }
            lines.push("");
        }
        if (forbidden.length > 0) {
            lines.push("### Forbidden Files Touched");
            lines.push("");
            for (const f of forbidden) {
                lines.push(`- \`${f.path}\` — ${f.reasons.join("; ")}`);
            }
            lines.push("");
        }
    }
    // Observation Quality
    const q = observations.quality;
    lines.push("## Observation Quality");
    lines.push("");
    lines.push(`- **Files scanned:** ${observations.meta.file_count}`);
    lines.push(`- **Raw unknown ratio:** ${(q.raw_unknown_ratio * 100).toFixed(1)}%`);
    lines.push(`- **Actionable:** ${q.actionable_count} (${(q.actionable_ratio * 100).toFixed(1)}%)`);
    lines.push(`- **Unknown bucket files:** ${q.unknown_bucket_file_count}`);
    lines.push("");
    // Recommendations
    const recs = generateObservationRecommendations({ quality: q });
    if (recs.length > 0) {
        lines.push("## Operator Recommendations");
        lines.push("");
        for (let i = 0; i < recs.length; i++) {
            lines.push(`${i + 1}. ${recs[i]}`);
        }
        lines.push("");
    }
    // Agent Feedback (P22)
    if (verification) {
        lines.push("## Agent Feedback");
        lines.push("");
        lines.push("Structured agent feedback generated:");
        lines.push("- `.pantheon/agent_feedback.json`");
        lines.push("- `.pantheon/agent_feedback.md`");
        lines.push("");
    }
    // Notice
    lines.push("---");
    lines.push("");
    lines.push("> **Notice:** Pantheon verifies boundary compliance, not semantic correctness.");
    lines.push("> This report does not prove that the code change is functionally correct.");
    lines.push("> It only verifies that the change stayed within the authorized scope.");
    lines.push("");
    return lines.join("\n");
}
//# sourceMappingURL=reviewerReportRenderer.js.map