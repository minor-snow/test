/**
 * P30-11B: Architecture Finding Renderer
 *
 * Pure, platform-neutral renderer for formatting ArchitectureFinding objects
 * into human-readable text (Markdown or Plain Text).
 *
 * This serves as the single source of truth for architecture wording, ensuring
 * that CLI, Review Queues, and GitHub PR comments remain consistent.
 *
 * ref: P30
 */
/**
 * Render a list of architecture findings into formatted text.
 * Strictly groups by severity and enforces wording safeguards.
 */
export function renderArchitectureFindings(input) {
    const { findings, format = "markdown", audience = "cli", contract_summary } = input;
    const blocking = [];
    const review = [];
    const info = [];
    for (const f of findings) {
        if (f.severity === "blocking")
            blocking.push(f);
        else if (f.severity === "review")
            review.push(f);
        else
            info.push(f);
    }
    // Deterministic sorting (by kind, then subject)
    const sortFindings = (arr) => {
        arr.sort((a, b) => {
            if (a.kind !== b.kind)
                return a.kind.localeCompare(b.kind);
            const subjA = a.subject ?? "";
            const subjB = b.subject ?? "";
            return subjA.localeCompare(subjB);
        });
    };
    sortFindings(blocking);
    sortFindings(review);
    sortFindings(info);
    let markdownLines = [];
    let plainLines = [];
    if (findings.length === 0) {
        markdownLines.push("No architecture findings triggered.");
        plainLines.push("No architecture findings triggered.");
    }
    else {
        markdownLines.push("## Architecture Findings\n");
        plainLines.push("Architecture Findings\n");
        if (contract_summary) {
            markdownLines.push(`Contract ID: \`${contract_summary.architecture_contract_id}\` (Revision ${contract_summary.revision})\n`);
            plainLines.push(`Contract ID: ${contract_summary.architecture_contract_id} (Revision ${contract_summary.revision})\n`);
        }
        if (blocking.length > 0) {
            markdownLines.push(`### Blocking (${blocking.length})`);
            plainLines.push(`[BLOCKING] (${blocking.length})`);
            for (const f of blocking) {
                renderFinding(f, markdownLines, plainLines, format, audience);
            }
            markdownLines.push("");
            plainLines.push("");
        }
        if (review.length > 0) {
            markdownLines.push(`### Review Required (${review.length})`);
            plainLines.push(`[REVIEW REQUIRED] (${review.length})`);
            for (const f of review) {
                renderFinding(f, markdownLines, plainLines, format, audience);
            }
            markdownLines.push("");
            plainLines.push("");
        }
        if (info.length > 0) {
            markdownLines.push(`### Info (${info.length})`);
            plainLines.push(`[INFO] (${info.length})`);
            for (const f of info) {
                renderFinding(f, markdownLines, plainLines, format, audience);
            }
            markdownLines.push("");
            plainLines.push("");
        }
    }
    return {
        markdown: markdownLines.join("\n").trim(),
        plain: plainLines.join("\n").trim(),
        blocking_count: blocking.length,
        review_count: review.length,
        info_count: info.length,
    };
}
// ---------------------------------------------------------------------------
// Internal Rendering
// ---------------------------------------------------------------------------
function renderFinding(finding, markdownLines, plainLines, format, audience) {
    const safeFiles = finding.files.map(sanitizePath);
    const primaryFile = safeFiles.length > 0 ? safeFiles[0] : "workspace";
    const otherFilesCount = safeFiles.length > 1 ? safeFiles.length - 1 : 0;
    const fileRefMd = safeFiles.length > 0 ? `\`${primaryFile}\`` : "This change";
    const fileRefPlain = safeFiles.length > 0 ? primaryFile : "This change";
    let titleMd = "";
    let titlePlain = "";
    let nextStepsMd = [];
    let nextStepsPlain = [];
    // Wording Engine
    switch (finding.kind) {
        case "architecture_forbidden_path":
            titleMd = `- ${fileRefMd} is forbidden by the accepted architecture contract.`;
            titlePlain = `- ${fileRefPlain} is forbidden by the accepted architecture contract.`;
            nextStepsMd.push("  - Next: remove this change or request an architecture contract update.");
            nextStepsPlain.push("  - Next: remove this change or request an architecture contract update.");
            break;
        case "architecture_boundary_crossed":
            titleMd = `- ${fileRefMd} crosses a review-required architecture boundary.`;
            titlePlain = `- ${fileRefPlain} crosses a review-required architecture boundary.`;
            nextStepsMd.push("  - Next: request architecture review or re-plan the change.");
            nextStepsPlain.push("  - Next: request architecture review or re-plan the change.");
            break;
        case "architecture_scope_crossed":
            titleMd = `- ${fileRefMd} crosses into an architecture boundary not requested in the change scope.`;
            titlePlain = `- ${fileRefPlain} crosses into an architecture boundary not requested in the change scope.`;
            nextStepsMd.push("  - Next: request architecture review or expand the authorized change scope.");
            nextStepsPlain.push("  - Next: request architecture review or expand the authorized change scope.");
            break;
        case "architecture_dependency_boundary_review":
            // SAFEGUARD: Never say "depends on". Only say "touches both sides".
            titleMd = `- This change touches both sides of a declared boundary${finding.subject && finding.object ? ` (\`${finding.subject}\` and \`${finding.object}\`)` : ""}.`;
            titlePlain = `- This change touches both sides of a declared boundary${finding.subject && finding.object ? ` (${finding.subject} and ${finding.object})` : ""}.`;
            nextStepsMd.push("  - Next: request architecture review to ensure proper isolation.");
            nextStepsPlain.push("  - Next: request architecture review to ensure proper isolation.");
            break;
        case "architecture_external_boundary_review":
            titleMd = `- ${fileRefMd} touches a declared external service boundary.`;
            titlePlain = `- ${fileRefPlain} touches a declared external service boundary.`;
            nextStepsMd.push("  - Next: request architecture review to ensure external safety.");
            nextStepsPlain.push("  - Next: request architecture review to ensure external safety.");
            break;
        case "architecture_contract_modified":
            titleMd = `- The architecture contract itself was modified in this change.`;
            titlePlain = `- The architecture contract itself was modified in this change.`;
            nextStepsMd.push("  - Next: requires direct repository administrator review.");
            nextStepsPlain.push("  - Next: requires direct repository administrator review.");
            break;
        case "architecture_advisory":
            // SAFEGUARD: Check for depends_on wording violations and neutralize them.
            let safeMsg = finding.message;
            if (safeMsg.includes("depends_on")) {
                safeMsg = safeMsg.replace(/depends_on/g, "advisory dependency limit");
            }
            titleMd = `- ${fileRefMd} touches an advisory boundary${finding.subject ? ` (\`${finding.subject}\`)` : ""}.`;
            titlePlain = `- ${fileRefPlain} touches an advisory boundary${finding.subject ? ` (${finding.subject})` : ""}.`;
            nextStepsMd.push(`  - Message: ${safeMsg}`);
            nextStepsPlain.push(`  - Message: ${safeMsg}`);
            nextStepsMd.push("  - Note: This does not prove a dependency violation. Informational only.");
            nextStepsPlain.push("  - Note: This does not prove a dependency violation. Informational only.");
            break;
        default:
            titleMd = `- ${fileRefMd} triggered an architecture constraint.`;
            titlePlain = `- ${fileRefPlain} triggered an architecture constraint.`;
    }
    // Push the title
    markdownLines.push(titleMd);
    plainLines.push(titlePlain);
    // Push context
    if (finding.constraint_id) {
        markdownLines.push(`  - Constraint: \`${finding.constraint_id}\``);
        plainLines.push(`  - Constraint: ${finding.constraint_id}`);
    }
    if (otherFilesCount > 0) {
        markdownLines.push(`  - Files: \`${primaryFile}\` and ${otherFilesCount} other(s).`);
        plainLines.push(`  - Files: ${primaryFile} and ${otherFilesCount} other(s).`);
    }
    else if (safeFiles.length === 1 && finding.kind === "architecture_dependency_boundary_review") {
        // For dependency boundaries, we usually don't use fileRefMd in the title, so list files here
        markdownLines.push(`  - Files: \`${primaryFile}\``);
        plainLines.push(`  - Files: ${primaryFile}`);
    }
    else if (safeFiles.length > 1 && finding.kind === "architecture_dependency_boundary_review") {
        markdownLines.push(`  - Files: \`${primaryFile}\` and ${otherFilesCount} other(s).`);
        plainLines.push(`  - Files: ${primaryFile} and ${otherFilesCount} other(s).`);
    }
    // Push next steps
    for (const step of nextStepsMd)
        markdownLines.push(step);
    for (const step of nextStepsPlain)
        plainLines.push(step);
}
/**
 * Sanitizes a path to ensure it is relative and does not expose local filesystem secrets.
 */
function sanitizePath(filePath) {
    // Reject absolute paths
    if (filePath.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith("\\\\")) {
        return "<redacted_absolute_path>";
    }
    // Reject paths trying to break out
    if (filePath.includes("../") || filePath.includes("..\\")) {
        return "<redacted_relative_escape>";
    }
    return filePath;
}
//# sourceMappingURL=architectureFindingRenderer.js.map