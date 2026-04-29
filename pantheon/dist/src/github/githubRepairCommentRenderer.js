import { matchesPattern } from "../repair/repairUtils.js";
const COMMENT_MARKER = "<!-- pantheon-repair-gate-v0 -->";
export function renderGitHubRepairComment(result) {
    const lines = [];
    const contract = result.contract;
    const check = result.check;
    const hypothesis = "agent_hypothesis" in result.report ? result.report.agent_hypothesis : undefined;
    lines.push(COMMENT_MARKER);
    lines.push("# Pantheon Repair Gate");
    lines.push("");
    lines.push("## Verdict");
    lines.push("");
    lines.push(`\`${result.verdict}\``);
    lines.push("");
    if (result.runPhase !== "checked") {
        lines.push("Pantheon generated or validated a repair session, but human audit is still required before the PR can pass repair governance.");
        lines.push("");
    }
    else {
        lines.push("Pantheon checked whether this PR stayed inside the approved repair scope.");
        lines.push("");
    }
    lines.push("## Repair session");
    lines.push("");
    lines.push(`- Repair ID: \`${result.repairId}\``);
    lines.push(`- Source: \`${result.sourceKind}\``);
    lines.push(`- Audit status: \`${contract?.audit_status ?? result.session.status}\``);
    if (contract) {
        lines.push(`- Contract revision: \`v${contract.revision}\``);
        lines.push(`- Evidence level: \`${contract.impact_surface.evidence_level}\``);
        lines.push(`- Plan base: \`${contract.repo_state.base_sha ?? "unknown"}\``);
    }
    lines.push(`- PR base: \`${result.inputs.baseSha ?? "unknown"}\``);
    lines.push("");
    lines.push("## Bug report");
    lines.push("");
    lines.push("### Confirmed facts");
    lines.push("");
    const confirmedFacts = result.finding.confirmed_facts.slice(0, 10);
    for (const fact of confirmedFacts) {
        lines.push(`- ${fact}`);
    }
    if (result.finding.confirmed_facts.length > confirmedFacts.length) {
        lines.push(`- ... ${result.finding.confirmed_facts.length - confirmedFacts.length} more confirmed facts`);
    }
    if (confirmedFacts.length === 0) {
        lines.push("- No confirmed facts beyond structural report validation.");
    }
    lines.push("");
    if (hypothesis) {
        lines.push("### Agent suspected cause");
        lines.push("");
        lines.push(hypothesis);
        lines.push("");
        lines.push("> This is an unverified hypothesis.");
        lines.push("");
    }
    if (contract) {
        lines.push("## Repair relation graph");
        lines.push("");
        lines.push("This is an evidence-based candidate graph, not a complete dependency graph or call graph.");
        lines.push("");
        for (const edge of contract.repair_relation_graph.slice(0, 12)) {
            lines.push(`- \`${edge.from}\` -> \`${edge.to}\` (${edge.relation}, ${edge.confidence})`);
        }
        if (contract.repair_relation_graph.length > 12) {
            lines.push(`- ... ${contract.repair_relation_graph.length - 12} additional graph candidates omitted`);
        }
        lines.push("");
    }
    if (check && contract) {
        lines.push("## Changed files");
        lines.push("");
        lines.push("| File | Bucket | Result |");
        lines.push("|---|---|---|");
        for (const file of check.changed_files.slice(0, 20)) {
            const bucket = classifyChangedFile(file, contract);
            const finding = check.findings.find(item => item.file === file);
            lines.push(`| \`${file}\` | ${bucket} | ${findingResult(bucket, finding)} |`);
        }
        if (check.changed_files.length > 20) {
            lines.push("");
            lines.push(`Showing 20 changed files. ${check.changed_files.length - 20} additional files omitted.`);
        }
        lines.push("");
    }
    if (contract) {
        lines.push("## Repair scope");
        lines.push("");
        appendScopeSection(lines, "Allowed", contract.repair_scope.allowed.map(entry => entry.pattern));
        appendScopeSection(lines, "Review required", contract.repair_scope.review_required.map(entry => entry.pattern));
        appendScopeSection(lines, "Forbidden", contract.repair_scope.forbidden.map(entry => entry.pattern));
    }
    if (check?.concurrent_findings.length) {
        lines.push("## Concurrency findings");
        lines.push("");
        lines.push("| Severity | Finding | Other repair | Action |");
        lines.push("|---|---|---|---|");
        for (const finding of check.concurrent_findings.slice(0, 12)) {
            lines.push(`| ${finding.severity} | ${escapeTableCell(finding.kind)} | ${finding.other_repair_id ?? "-"} | ${finding.recommended_action} |`);
        }
        if (check.concurrent_findings.length > 12) {
            lines.push("");
            lines.push(`Showing 12 concurrency findings. ${check.concurrent_findings.length - 12} additional findings omitted.`);
        }
        lines.push("");
    }
    lines.push("## Agent next steps");
    lines.push("");
    for (const step of buildNextSteps(result)) {
        lines.push(`- ${step}`);
    }
    lines.push("");
    lines.push("## Artifacts");
    lines.push("");
    lines.push("- `repair_task.md`");
    lines.push("- `repair_report.md`");
    lines.push("- `repair_feedback.md`");
    lines.push("- `artifact_manifest.json`");
    lines.push("");
    return {
        marker: COMMENT_MARKER,
        markdown: lines.join("\n"),
    };
}
function appendScopeSection(lines, title, patterns) {
    lines.push(`### ${title}`);
    lines.push("");
    if (patterns.length === 0) {
        lines.push("- None");
        lines.push("");
        return;
    }
    for (const pattern of patterns.slice(0, 20)) {
        lines.push(`- \`${pattern}\``);
    }
    if (patterns.length > 20) {
        lines.push(`- ... ${patterns.length - 20} additional entries omitted`);
    }
    lines.push("");
}
function classifyChangedFile(path, contract) {
    if (contract.repair_scope.forbidden.some(entry => matchesPattern(path, entry.pattern))) {
        return "forbidden";
    }
    if (contract.repair_scope.review_required.some(entry => matchesPattern(path, entry.pattern))) {
        return "review_required";
    }
    if (contract.repair_scope.allowed.some(entry => matchesPattern(path, entry.pattern))) {
        return "allowed";
    }
    return "outside_scope";
}
function findingResult(bucket, finding) {
    if (finding?.kind === "stale_repair_contract")
        return "requires_replan";
    if (finding?.kind === "outside_scope_file")
        return "requires_scope_expansion";
    if (finding?.kind === "forbidden_file")
        return "fail";
    if (finding?.kind === "review_required_file")
        return "requires_review";
    if (bucket === "allowed")
        return "ok";
    return finding?.kind ?? bucket;
}
function buildNextSteps(result) {
    if (result.verdict === "requires_replan") {
        return ["Run repair plan again for the current PR base before continuing."];
    }
    if (result.runPhase === "intake_pending_audit") {
        return ["Human intake approval is required before Pantheon can generate a repair plan."];
    }
    if (result.runPhase === "plan_pending_audit") {
        return ["Human plan approval is required before Pantheon will treat this repair as approved."];
    }
    const steps = new Set();
    for (const action of result.check?.findings.flatMap(finding => finding.allowed_actions) ?? []) {
        if (action === "keep_for_human_review") {
            steps.add("Keep review-required files for human review.");
        }
        if (action === "request_scope_expansion") {
            steps.add("Request scope expansion before modifying additional files.");
        }
        if (action === "request_replan") {
            steps.add("Re-run repair plan for the current base state.");
        }
        if (action === "revert_file") {
            steps.add("Revert forbidden or out-of-scope files.");
        }
        if (action === "add_or_run_related_test") {
            steps.add("Add or run the related tests listed in the repair artifacts.");
        }
    }
    if (steps.size === 0) {
        steps.add("Continue inside the approved repair scope.");
    }
    return [...steps];
}
function escapeTableCell(value) {
    return value.replace(/\|/g, "\\|");
}
//# sourceMappingURL=githubRepairCommentRenderer.js.map