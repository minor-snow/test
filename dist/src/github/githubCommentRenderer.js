import { renderArchitectureFindings } from "../architecture/architectureFindingRenderer.js";
import { matchesPattern } from "../repair/repairUtils.js";
export function renderArchitectureFindingsSection(findings, baseSha) {
    const sharedFindings = findings
        .map(normalizeArchitectureFinding)
        .filter((finding) => finding !== null);
    if (sharedFindings.length === 0) {
        return "";
    }
    const rendered = renderArchitectureFindings({
        findings: sharedFindings,
        format: "markdown",
        audience: "github",
    });
    const lines = ["### Architecture Findings"];
    if (baseSha) {
        lines.push("");
        lines.push(`Evaluated against the base branch architecture contract (\`${baseSha.slice(0, 8)}\`).`);
    }
    lines.push("");
    lines.push(rendered.markdown);
    return lines.join("\n");
}
function normalizeArchitectureFinding(finding) {
    switch (finding.kind) {
        case "architecture_forbidden":
            return {
                kind: "architecture_forbidden_path",
                message: finding.message,
                files: finding.files ?? [],
                severity: "blocking",
            };
        case "architecture_review_required":
            return {
                kind: "architecture_boundary_crossed",
                message: finding.message,
                files: finding.files ?? [],
                severity: "review",
            };
        case "architecture_contract_modified":
            return {
                kind: "architecture_contract_modified",
                message: finding.message,
                files: finding.files ?? [],
                severity: "review",
            };
        case "architecture_advisory":
            return {
                kind: "architecture_advisory",
                message: finding.message,
                files: finding.files ?? [],
                severity: "info",
            };
        default:
            return null;
    }
}
// ---------------------------------------------------------------------------
// Standard Boundary Check Renderer
// ---------------------------------------------------------------------------
export const PANTHEON_BOUNDARY_CHECK_MARKER = "<!-- pantheon-boundary-check-v0 -->";
export function renderGitHubPrComment(check) {
    const lines = [];
    const reviewFindings = check.findings.filter(f => f.severity === "review_required");
    const blockingFindings = check.findings.filter(f => f.kind === "forbidden_file_modified" || f.kind === "outside_scope_file");
    const architectureFindings = check.findings.filter(f => f.kind.startsWith("architecture_"));
    lines.push(PANTHEON_BOUNDARY_CHECK_MARKER);
    lines.push(`## Pantheon Boundary Check [${labelForVerdict(check.verdict)}]`);
    lines.push("");
    lines.push(`**Verdict:** \`${check.verdict}\``);
    lines.push("");
    lines.push(renderBoundarySummaryTable(check));
    lines.push("");
    if (blockingFindings.length > 0) {
        lines.push("### Blocking boundary violations");
        lines.push("");
        for (const finding of blockingFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\``);
            lines.push(`  - Reason: ${summarizeBoundaryReason(finding)}`);
            lines.push(`  - Required action: ${formatAllowedActions(finding.allowed_actions)}`);
        }
        lines.push("");
        lines.push("Use `feedback.md` to instruct the agent to recover.");
        lines.push("");
    }
    else if (reviewFindings.length > 0) {
        lines.push("No blocking boundary violations found.");
        lines.push("");
        lines.push("### Files requiring human review");
        lines.push("");
        for (const finding of reviewFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\``);
            lines.push(`  - Reason: ${summarizeBoundaryReason(finding)}`);
            lines.push("  - Suggested action: review before merge");
        }
        lines.push("");
    }
    else {
        lines.push("No boundary violations detected.");
        lines.push("");
    }
    if (architectureFindings.length > 0) {
        lines.push(renderArchitectureFindingsSection(architectureFindings, check.repo.head_commit));
        lines.push("");
    }
    lines.push("Artifacts:");
    lines.push("- `report.md`");
    lines.push("- `check.json`");
    if (check.findings.length > 0)
        lines.push("- `feedback.md`");
    return {
        marker: PANTHEON_BOUNDARY_CHECK_MARKER,
        markdown: lines.join("\n"),
    };
}
export function renderGitHubStepSummary(check, metadata) {
    const lines = [];
    lines.push("# Pantheon Boundary Check");
    lines.push("");
    lines.push(`Verdict: \`${check.verdict}\``);
    lines.push("");
    if (metadata?.baseSha || metadata?.headSha) {
        lines.push("| Diff | Value |");
        lines.push("|---|---|");
        if (metadata.baseSha)
            lines.push(`| Base | \`${metadata.baseSha.slice(0, 12)}\` |`);
        if (metadata.headSha)
            lines.push(`| Head | \`${metadata.headSha.slice(0, 12)}\` |`);
        lines.push("");
    }
    lines.push(renderBoundarySummaryTable(check));
    lines.push("");
    const blockingFindings = check.findings.filter(f => f.kind === "forbidden_file_modified" || f.kind === "outside_scope_file");
    const reviewFindings = check.findings.filter(f => f.severity === "review_required");
    const architectureFindings = check.findings.filter(f => f.kind.startsWith("architecture_"));
    if (blockingFindings.length > 0) {
        lines.push("Blocking boundary violations detected.");
        lines.push("");
        for (const finding of blockingFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\` - ${summarizeBoundaryReason(finding)}`);
        }
        lines.push("");
    }
    else if (reviewFindings.length > 0) {
        lines.push("No blocking boundary violations found.");
        lines.push("");
        lines.push("Files requiring human review:");
        for (const finding of reviewFindings.slice(0, 10)) {
            lines.push(`- \`${finding.file}\` - ${summarizeBoundaryReason(finding)}`);
        }
        lines.push("");
    }
    else {
        lines.push("No boundary violations detected.");
        lines.push("");
    }
    if (architectureFindings.length > 0) {
        lines.push(renderArchitectureFindingsSection(architectureFindings, metadata?.baseSha ?? check.repo.head_commit));
        lines.push("");
    }
    lines.push("See `pantheon-report/` for generated artifacts.");
    return { markdown: lines.join("\n") };
}
function renderBoundarySummaryTable(check) {
    return [
        "| Category | Count |",
        "|---|---:|",
        `| In allowed scope | ${check.summary.in_scope} |`,
        `| Review required | ${check.summary.review_required} |`,
        `| Forbidden | ${check.summary.forbidden} |`,
        `| Outside scope | ${check.summary.outside_scope} |`,
    ].join("\n");
}
function labelForVerdict(verdict) {
    if (verdict === "pass")
        return "PASS";
    if (verdict === "requires_review")
        return "WARN";
    return "BLOCKED";
}
function summarizeBoundaryReason(finding) {
    if (finding.kind === "forbidden_file_modified") {
        if (finding.file.includes(".pantheon/"))
            return "governance policy tamper attempt";
        return "forbidden boundary";
    }
    if (finding.kind === "outside_scope_file")
        return "outside authorized scope";
    if (finding.kind === "fake_approval")
        return "unauthorized or untrusted approval bypass attempt";
    if (finding.severity === "review_required")
        return "matched review-required boundary";
    return finding.message;
}
function formatAllowedActions(actions) {
    if (actions.length === 0)
        return "review manually";
    return actions.map(action => `\`${action}\``).join(" or ");
}
// ---------------------------------------------------------------------------
// Change Mode Renderer
// ---------------------------------------------------------------------------
export const PANTHEON_CHANGE_COMMENT_MARKER = "<!-- pantheon_change_governance_comment -->";
export function renderChangePrComment(check, context) {
    const marker = PANTHEON_CHANGE_COMMENT_MARKER;
    let md = `${marker}\n`;
    md += "## Pantheon Change Governance\n\n";
    md += `**Verdict:** \`${check.verdict}\`\n\n`;
    if (context?.type) {
        md += `**Change type:** \`${context.type}\`\n\n`;
    }
    const archSection = renderArchitectureFindingsSection(check.findings, context?.baseSha || null);
    if (archSection) {
        md += `${archSection}\n\n`;
    }
    const nonArchFindings = check.findings.filter(f => !f.kind.startsWith("architecture_"));
    if (nonArchFindings.length > 0) {
        md += "### Findings\n\n";
        for (const finding of nonArchFindings) {
            md += `- **${finding.kind}**: ${finding.message}`;
            if (finding.files && finding.files.length > 0) {
                md += ` (affected files: ${finding.files.map(f => `\`${f}\``).join(", ")})`;
            }
            md += "\n";
        }
        md += "\n";
    }
    if (check.verdict === "requires_scope_expansion") {
        md += "### Next Action Required\n\n";
        md += "- **Requires scope expansion**: Some modified files are outside the current authorized scope.\n";
        md += "- Please revert changes to out-of-scope files or request a scope expansion.\n\n";
    }
    else if (check.verdict === "fail") {
        md += "### Next Action Required\n\n";
        md += "- **Blocked**: Forbidden files have been modified.\n";
        md += "- Please revert changes to forbidden files to proceed.\n\n";
    }
    md += "### Summary\n\n";
    md += `- Changed files: ${check.changed_files.length}\n`;
    md += `- Allowed: ${check.bucket_counts.allowed}\n`;
    md += `- Review required: ${check.bucket_counts.review_required}\n`;
    md += `- Forbidden: ${check.bucket_counts.forbidden}\n`;
    md += `- Outside scope: ${check.bucket_counts.outside_scope}\n`;
    return { marker, markdown: md };
}
export function renderChangeStepSummary(check, context) {
    const { markdown } = renderChangePrComment(check, context);
    return { markdown };
}
// ---------------------------------------------------------------------------
// Contract Gate (P29.5) Renderer
// ---------------------------------------------------------------------------
export const PANTHEON_GATE_COMMENT_MARKER = "<!-- pantheon-contract-gate-v1 -->";
export function renderContractGatePrComment(result) {
    const lines = [];
    lines.push(PANTHEON_GATE_COMMENT_MARKER);
    lines.push(`## Pantheon Governance Gate [${labelForGateVerdict(result.verdict)}]`);
    lines.push("");
    lines.push(`**Verdict:** \`${result.verdict}\``);
    lines.push(`**Risk Level:** \`${result.risk_level}\``);
    lines.push("");
    if (result.required_action.why.length > 0) {
        lines.push("### Why this PR is blocked");
        for (const why of result.required_action.why) {
            lines.push(`- ${why}`);
        }
        lines.push("");
    }
    if (result.required_action.next.length > 0) {
        lines.push("### Required Actions");
        for (const next of result.required_action.next) {
            lines.push(`- ${next}`);
        }
        lines.push("");
    }
    if (result.findings.length > 0) {
        lines.push("### Findings");
        lines.push("");
        lines.push("| Severity | Kind | Message |");
        lines.push("|---|---|---|");
        for (const finding of result.findings.slice(0, 10)) {
            lines.push(`| ${finding.severity} | \`${finding.kind}\` | ${finding.message} |`);
        }
        lines.push("");
    }
    const riskyFiles = result.changed_files.filter(f => f.contract_required || f.trusted_approval_required);
    if (riskyFiles.length > 0) {
        lines.push("### Risky Changes Detected");
        lines.push("");
        lines.push("| File | Bucket | Risk | Reasons |");
        lines.push("|---|---|---|---|");
        for (const file of riskyFiles.slice(0, 15)) {
            lines.push(`| \`${file.path}\` | ${file.bucket} | ${file.risk_level} | ${file.reasons.join(", ")} |`);
        }
        lines.push("");
    }
    lines.push("---");
    lines.push(`*Policy Source: ${result.policy_source.status === "loaded" ? `base branch (\`${result.policy_source.base_sha?.slice(0, 8)}\`)` : "missing (using defaults)"}*`);
    return {
        marker: PANTHEON_GATE_COMMENT_MARKER,
        markdown: lines.join("\n"),
    };
}
export function renderContractGateStepSummary(result) {
    const { markdown } = renderContractGatePrComment(result);
    return { markdown };
}
function labelForGateVerdict(verdict) {
    switch (verdict) {
        case "pass": return "PASS";
        case "requires_review": return "WARN";
        default: return "BLOCKED";
    }
}
// ---------------------------------------------------------------------------
// Repair Mode Renderer
// ---------------------------------------------------------------------------
export const PANTHEON_REPAIR_COMMENT_MARKER = "<!-- pantheon-repair-gate-v0 -->";
export function renderGitHubRepairComment(result) {
    const lines = [];
    const contract = result.contract;
    const check = result.check;
    const hypothesis = "agent_hypothesis" in result.report ? result.report.agent_hypothesis : undefined;
    lines.push(PANTHEON_REPAIR_COMMENT_MARKER);
    lines.push("# Pantheon Repair Gate");
    lines.push("");
    lines.push("## Verdict");
    lines.push("");
    lines.push(`\`${result.verdict}\``);
    lines.push("");
    const archSection = check ? renderArchitectureFindingsSection(check.findings, result.inputs.baseSha || null) : "";
    if (archSection) {
        lines.push(archSection);
        lines.push("");
    }
    const nonArchFindings = check?.findings.filter(f => !f.kind.startsWith("architecture_")) ?? [];
    if (result.verdict === "requires_review") {
        lines.push("## Human review required");
        lines.push("");
        lines.push("This PR touched files that the repair contract marks as review-required.");
        lines.push("");
        const reviewFindings = nonArchFindings.filter(finding => finding.kind === "review_required_file");
        if (reviewFindings.length > 0) {
            lines.push("| File | Reason |");
            lines.push("|---|---|");
            for (const finding of reviewFindings.slice(0, 20)) {
                lines.push(`| \`${finding.file}\` | ${escapeTableCell(finding.message)} |`);
            }
            if (reviewFindings.length > 20) {
                lines.push("");
                lines.push(`Showing 20 files. ${reviewFindings.length - 20} additional review-required files omitted.`);
            }
            lines.push("");
        }
        lines.push("");
        lines.push("## Agent next steps");
        lines.push("");
        lines.push("- A human reviewer should inspect these changes.");
        lines.push("- The agent should stop modifying review-required files.");
        lines.push("- If additional files are needed, request scope expansion.");
        lines.push("");
    }
    else if (result.verdict !== "pass") {
        lines.push("## Blocked");
        lines.push("");
        lines.push("This PR cannot be accepted under the current repair contract.");
        lines.push("");
        lines.push("Why:");
        lines.push("");
        let reasonCount = 1;
        if (check?.concurrent_findings.some(f => f.kind === "stale_repair_contract")) {
            lines.push(`${reasonCount++}. The repair contract is stale because the PR base changed after the plan was created.`);
        }
        const outsideFiles = nonArchFindings.filter(f => f.kind === "outside_scope_file");
        if (outsideFiles.length > 0) {
            if (outsideFiles.length === 1) {
                lines.push(`${reasonCount++}. \`${outsideFiles[0].file}\` is outside the approved repair scope.`);
            }
            else {
                lines.push(`${reasonCount++}. ${outsideFiles.length} files are outside the approved repair scope (e.g. \`${outsideFiles[0].file}\`).`);
            }
        }
        const forbiddenFiles = nonArchFindings.filter(f => f.kind === "forbidden_file");
        if (forbiddenFiles.length > 0) {
            lines.push(`${reasonCount++}. Modified files are forbidden by the current repair scope.`);
        }
        if (result.runPhase === "intake_pending_audit" || result.runPhase === "plan_pending_audit") {
            lines.push(`${reasonCount++}. The repair plan requires human audit approval before the agent can continue.`);
        }
        if (reasonCount === 1) {
            lines.push("1. The repair governance checks failed.");
        }
        lines.push("");
        lines.push("## Agent next steps");
        const nextSteps = buildRepairNextSteps(result);
        for (const step of nextSteps) {
            lines.push(`- ${step}`);
        }
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
            const bucket = classifyRepairChangedFile(file, contract);
            const finding = check.findings.find(item => item.file === file);
            lines.push(`| \`${file}\` | ${bucket} | ${findingRepairResult(bucket, finding)} |`);
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
        appendRepairScopeSection(lines, "Allowed", contract.repair_scope.allowed.map(entry => entry.pattern));
        appendRepairScopeSection(lines, "Review required", contract.repair_scope.review_required.map(entry => entry.pattern));
        appendRepairScopeSection(lines, "Forbidden", contract.repair_scope.forbidden.map(entry => entry.pattern));
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
    lines.push("## Artifacts");
    lines.push("");
    lines.push("- `repair_task.md`");
    lines.push("- `repair_report.md`");
    lines.push("- `repair_feedback.md`");
    if (result.verdict !== "pass") {
        lines.push("- `review_request.md`");
    }
    lines.push("- `artifact_manifest.json`");
    lines.push("");
    return {
        marker: PANTHEON_REPAIR_COMMENT_MARKER,
        markdown: lines.join("\n"),
    };
}
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
    if (result.verdict === "requires_review") {
        lines.push("Human review required. See review_request.md in pantheon-repair-report/.");
        lines.push("");
    }
    else if (result.verdict === "requires_replan" || result.verdict === "requires_scope_expansion" || result.verdict === "fail") {
        lines.push("Blocked. See the PR comment, repair_feedback.md, and review_request.md for the next action.");
        lines.push("");
    }
    lines.push("See PR comment and artifacts for details.");
    lines.push("");
    return {
        markdown: lines.join("\n"),
    };
}
// ---------------------------------------------------------------------------
// Helpers (Private)
// ---------------------------------------------------------------------------
function appendRepairScopeSection(lines, title, patterns) {
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
function classifyRepairChangedFile(path, contract) {
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
function findingRepairResult(bucket, finding) {
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
function buildRepairNextSteps(result) {
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
//# sourceMappingURL=githubCommentRenderer.js.map