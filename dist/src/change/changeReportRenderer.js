export function renderChangeReport(result) {
    const parts = [
        `# Pantheon Change Check`,
        ``,
        `Change ID: \`${result.change_id}\``,
        `Verdict: **${result.verdict}**`,
        ``,
    ];
    if (result.findings.length > 0) {
        parts.push(`## Findings`);
        for (const f of result.findings) {
            parts.push(`- **${f.kind}** (${f.severity}): ${f.message}`);
            if (f.files && f.files.length > 0) {
                for (const file of f.files) {
                    parts.push(`  - \`${file}\``);
                }
            }
        }
        parts.push(``);
    }
    if (result.next_actions.length > 0) {
        parts.push(`## Next Actions`);
        for (const action of result.next_actions) {
            parts.push(`- ${action}`);
        }
        parts.push(``);
    }
    parts.push(`## Diff Summary`);
    parts.push(`- Allowed: ${result.bucket_counts.allowed}`);
    parts.push(`- Review Required: ${result.bucket_counts.review_required}`);
    parts.push(`- Forbidden: ${result.bucket_counts.forbidden}`);
    parts.push(`- Outside Scope: ${result.bucket_counts.outside_scope}`);
    parts.push(``);
    return parts.join("\n");
}
//# sourceMappingURL=changeReportRenderer.js.map