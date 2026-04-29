export function renderGitHubRepairStepSummary(result) {
    const lines = [];
    const check = result.check;
    lines.push("# Pantheon Repair Summary");
    lines.push("");
    lines.push(`Verdict: \`${result.verdict}\``);
    lines.push("");
    lines.push(`Repair ID: ${result.repairId}`);
    lines.push(`Run phase: ${result.runPhase}`);
    if (result.contract) {
        lines.push(`Contract revision: v${result.contract.revision}`);
    }
    if (check) {
        lines.push(`Changed files: ${check.summary.changed_files}`);
        lines.push(`Allowed: ${check.summary.allowed}`);
        lines.push(`Review required: ${check.summary.review_required}`);
        lines.push(`Forbidden: ${check.summary.forbidden}`);
        lines.push(`Outside scope: ${check.summary.outside_scope}`);
        lines.push(`Concurrency findings: ${check.concurrent_findings.length}`);
    }
    lines.push(`Artifact sanitizer violations: ${result.artifactCollection.sanitizerViolations.length}`);
    lines.push("");
    lines.push("See PR comment and artifacts for details.");
    lines.push("");
    return {
        markdown: lines.join("\n"),
    };
}
//# sourceMappingURL=githubRepairStepSummaryRenderer.js.map