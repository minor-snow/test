export function renderChangeTask(intake) {
    const parts = [
        `# Pantheon Change Task`,
        ``,
        `Change ID: \`${intake.change_id}\``,
        `Type: \`${intake.change_type}\``,
        `Title: ${intake.title}`,
        `Reason: ${intake.reason}`,
        ``,
        `## Declared Targets`,
        ...intake.target_patterns.map(p => `- \`${p}\``),
        ``,
    ];
    if (intake.declared_non_goals && intake.declared_non_goals.length > 0) {
        parts.push(`## Non-Goals`);
        intake.declared_non_goals.forEach(ng => parts.push(`- ${ng}`));
        parts.push(``);
    }
    if (intake.operator_notes && intake.operator_notes.length > 0) {
        parts.push(`## Operator Notes`);
        intake.operator_notes.forEach(note => parts.push(`- ${note}`));
        parts.push(``);
    }
    parts.push(`## Governance Instructions`);
    parts.push(`This task is governed by Pantheon. Please wait for the \`change_contract.json\` and \`change_scope.md\` to be generated via \`pantheon change plan\` before making edits.`);
    parts.push(`Do not modify files outside the declared targets unless you plan to expand the scope.`);
    parts.push(``);
    return parts.join("\n");
}
//# sourceMappingURL=changeTaskRenderer.js.map