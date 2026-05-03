export function renderChangeScope(contract) {
    const parts = [
        `# Change Scope`,
        ``,
        `Change ID: \`${contract.change_id}\``,
        `Revision: ${contract.revision}`,
        ``,
    ];
    function renderTable(title, entries) {
        parts.push(`## ${title}`);
        if (entries.length === 0) {
            parts.push(`*(None)*\n`);
            return;
        }
        parts.push(`| Pattern | Reason |`);
        parts.push(`|---|---|`);
        for (const entry of entries) {
            parts.push(`| \`${entry.path_pattern}\` | ${entry.rationale} (${entry.source}) |`);
        }
        parts.push(``);
    }
    renderTable("Allowed", contract.scope.allowed);
    renderTable("Review Required", contract.scope.review_required);
    renderTable("Forbidden", contract.scope.forbidden);
    return parts.join("\n");
}
export function renderChangeChecklist(contract) {
    const parts = [
        `# Change Checklist`,
        ``,
        `Change ID: \`${contract.change_id}\``,
        ``,
    ];
    if (contract.consistency_checklist.length === 0) {
        parts.push(`*(No specific consistency checks declared)*\n`);
    }
    else {
        for (const item of contract.consistency_checklist) {
            parts.push(`- [ ] **${item.id}**: ${item.description}`);
        }
        parts.push(``);
    }
    return parts.join("\n");
}
//# sourceMappingURL=changeScopeRenderer.js.map