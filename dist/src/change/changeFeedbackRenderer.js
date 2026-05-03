export function renderChangeFeedback(result) {
    if (result.verdict === "pass" || result.verdict === "requires_review") {
        return "# Agent Feedback\n\nNo immediate corrections needed. Verdict is acceptable for PR.\n";
    }
    const parts = [
        `# Agent Feedback`,
        ``,
        `Your changes resulted in a \`${result.verdict}\` verdict.`,
        ``,
    ];
    const forbidden = result.findings.find(f => f.kind === "forbidden_file");
    if (forbidden && forbidden.files) {
        parts.push(`## Revert Forbidden Changes`);
        parts.push(`You modified files in the forbidden bucket. Revert these immediately:`);
        for (const f of forbidden.files) {
            parts.push(`- \`${f}\``);
        }
        parts.push(``);
    }
    const outside = result.findings.find(f => f.kind === "outside_scope_file");
    if (outside && outside.files) {
        parts.push(`## Out of Scope Changes`);
        parts.push(`You modified files outside the active change contract.`);
        parts.push(`Remove these changes:`);
        for (const f of outside.files) {
            parts.push(`- \`${f}\``);
        }
        parts.push(`\nOr re-plan by running:`);
        parts.push(`\`pantheon change plan --change-id ${result.change_id}\` (after updating intake targets if necessary)`);
        parts.push(``);
    }
    const replan = result.findings.find(f => f.kind === "stale_base_sha" || f.kind === "bootstrap_scope_mixed_with_change");
    if (replan) {
        parts.push(`## Re-plan Required`);
        parts.push(`The contract or repository state requires a fresh plan.`);
        parts.push(`Run \`pantheon change plan --change-id ${result.change_id}\``);
        parts.push(``);
    }
    return parts.join("\n");
}
//# sourceMappingURL=changeFeedbackRenderer.js.map