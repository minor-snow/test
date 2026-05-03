export function renderDailyMetricsReport(report) {
    const lines = [];
    lines.push(`# Pantheon Local Governance Report - ${report.date}`);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Repair checks: ${report.repair_checks}`);
    lines.push(`- PR repair checks: ${report.pr_repair_checks}`);
    lines.push(`- Local repair checks: ${report.local_repair_checks}`);
    lines.push(`- Passed: ${report.verdict_counts.pass}`);
    lines.push(`- Required human review: ${report.verdict_counts.requires_review}`);
    lines.push(`- Blocked: ${report.blocked}`);
    lines.push("");
    lines.push("## Verdicts");
    lines.push("");
    lines.push("| Verdict | Count |");
    lines.push("|---|---:|");
    for (const [verdict, count] of Object.entries(report.verdict_counts)) {
        lines.push(`| ${verdict} | ${count} |`);
    }
    lines.push("");
    lines.push("## Intercepts");
    lines.push("");
    lines.push(`Pantheon blocked ${report.blocked} unsafe repair attempts today.`);
    lines.push("");
    lines.push("| Reason | Count |");
    lines.push("|---|---:|");
    for (const [reason, count] of Object.entries(report.intercept_reasons)) {
        lines.push(`| ${reason} | ${count} |`);
    }
    lines.push("");
    lines.push("## Open review requests");
    lines.push("");
    if (report.open_review_requests.length === 0) {
        lines.push("- None");
    }
    else {
        lines.push("| Target | Reason | Files | Age |");
        lines.push("|---|---|---:|---|");
        for (const request of report.open_review_requests) {
            const type = request.target_type === "change" ? "chg" : "rep";
            lines.push(`| ${type}:${request.target_id} | ${escapeCell(request.reason)} | ${request.files} | ${request.age_minutes}m |`);
        }
    }
    lines.push("");
    lines.push("## Most common review areas");
    lines.push("");
    if (report.common_review_areas.length === 0) {
        lines.push("- None");
    }
    else {
        lines.push("| Area | Count |");
        lines.push("|---|---:|");
        for (const area of report.common_review_areas) {
            lines.push(`| \`${area.area}\` | ${area.count} |`);
        }
    }
    lines.push("");
    // Contract Gate Captures section
    const contractGateReasons = [
        ["Uncontracted source changes", report.intercept_reasons.uncontracted_source_change ?? 0],
        ["Missing contract", report.intercept_reasons.missing_contract ?? 0],
        ["Policy tamper attempts", report.intercept_reasons.policy_tamper ?? 0],
        ["Fake approval artifacts ignored", report.intercept_reasons.fake_approval ?? 0],
        ["Workflow files touched", report.intercept_reasons.workflow_touched ?? 0],
    ];
    const hasGateCaptures = contractGateReasons.some(([, count]) => count > 0);
    if (hasGateCaptures) {
        lines.push("## Contract Gate Captures");
        lines.push("");
        for (const [label, count] of contractGateReasons) {
            if (count > 0) {
                lines.push(`- ${label}: ${count}`);
            }
        }
        lines.push("");
    }
    lines.push("## Local-only note");
    lines.push("");
    lines.push("This report was generated locally from Pantheon repair artifacts. No source code content or diff hunks are included.");
    lines.push("");
    return lines.join("\n");
}
function escapeCell(value) {
    return value.replace(/\|/g, "\\|");
}
//# sourceMappingURL=dailyReportRenderer.js.map