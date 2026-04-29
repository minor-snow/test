/**
 * P24: pantheon check
 *
 * Reads git diff, verifies against saved scope, writes report + feedback.
 * Each check creates attempts/attempt_N/ and updates latest in .pantheon/.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { readGitDiffSummary } from "../diffWorkflow/gitDiffReader.js";
import { verifyDiffAgainstScope } from "../diffWorkflow/diffVerifier.js";
import { buildAgentFeedbackFromDiffVerification } from "../agentFeedback/diffFeedbackBuilder.js";
import { publicPaths, internalPaths } from "./artifactLayout.js";
import { buildPublicCheck } from "./publicCheckProjection.js";
import { renderPublicReportMarkdown, renderPublicFeedbackMarkdown } from "./markdownRenderers.js";
import { nextAttemptNumber, ensureAttemptDir, writeAttemptArtifacts, loadAttemptHistory, enrichCheckWithHistory } from "./attemptHistory.js";
export function cmdCheck(input) {
    const repoRoot = resolve(input.repoRoot);
    const baseRef = input.baseRef ?? "";
    const int = internalPaths(repoRoot);
    const pub = publicPaths(repoRoot);
    // 1. Load saved scope and contract
    if (!existsSync(int.scope)) {
        console.error("Error: no saved scope found. Run 'pantheon guard' first.");
        console.error(`  Expected: ${int.scope}`);
        process.exit(1);
    }
    if (!existsSync(int.contract)) {
        console.error("Error: no saved contract found. Run 'pantheon guard' first.");
        process.exit(1);
    }
    const scope = JSON.parse(readFileSync(int.scope, "utf-8"));
    const contract = JSON.parse(readFileSync(int.contract, "utf-8"));
    // Load observations (optional — for full report)
    let observations = null;
    if (existsSync(int.observations)) {
        observations = JSON.parse(readFileSync(int.observations, "utf-8"));
    }
    // 2. Read git diff
    const diff = readGitDiffSummary({ repoRoot, baseRef });
    if (diff.warnings.length > 0) {
        for (const w of diff.warnings)
            console.log("  Warning:", w);
    }
    if (diff.changed_files.length === 0) {
        console.log("Pantheon Check: no changed files detected.");
        return;
    }
    // 3. Verify
    const verification = verifyDiffAgainstScope({ diff, scope });
    // 4. Build feedback
    const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
    // 5. Build public check
    const repoInfo = {
        label: observations?.repo?.repo_root_label ?? "repo",
        head_commit: contract.refs.head_commit_hash ?? null,
        state: "checked",
    };
    const publicCheck = buildPublicCheck({
        verification,
        feedback,
        intent: contract.intent ?? "",
        repo: repoInfo,
    });
    // 6. Attempt tracking
    const attempt = nextAttemptNumber(repoRoot);
    const history = loadAttemptHistory(repoRoot);
    const checkWithHistory = enrichCheckWithHistory(publicCheck, attempt, [
        ...history,
        {
            attempt,
            verdict: publicCheck.verdict,
            violation_count: publicCheck.summary.outside_scope + publicCheck.summary.forbidden,
            artifact_dir: `.pantheon/attempts/attempt_${attempt}`,
            timestamp: new Date().toISOString(),
        },
    ]);
    // 7. Render user-facing markdown
    const reportMd = renderPublicReportMarkdown({ ...publicCheck, attempt });
    const feedbackMd = renderPublicFeedbackMarkdown({ ...publicCheck, attempt });
    // 8. Write latest (root)
    writeFileSync(pub.report, reportMd);
    writeFileSync(pub.feedback, feedbackMd);
    writeFileSync(pub.check, JSON.stringify(checkWithHistory, null, 2));
    // 9. Write attempt history
    const attemptDir = ensureAttemptDir(repoRoot, attempt);
    const diffNameStatus = diff.changed_files.map(f => `${f.status}\t${f.path}`).join("\n");
    writeAttemptArtifacts(attemptDir, {
        reportMd,
        feedbackMd,
        checkJson: JSON.stringify(checkWithHistory, null, 2),
        diffNameStatus,
    });
    // 10. Write internal
    writeFileSync(int.verification, JSON.stringify(verification, null, 2));
    writeFileSync(int.feedback, JSON.stringify(feedback, null, 2));
    // 11. Print summary
    console.log(`Pantheon Boundary Check (attempt ${attempt})\n`);
    console.log(`  Verdict: ${verification.verdict}`);
    console.log("");
    console.log(`  Changed files: ${verification.file_statuses.length}`);
    let inScope = 0, reviewReq = 0, outsideScope = 0, forbidden = 0;
    for (const fs of verification.file_statuses) {
        switch (fs.status) {
            case "allowed":
                inScope++;
                break;
            case "review_required":
                reviewReq++;
                break;
            case "outside_scope":
                outsideScope++;
                break;
            case "forbidden":
                forbidden++;
                break;
        }
    }
    console.log(`  In scope: ${inScope}`);
    if (reviewReq > 0)
        console.log(`  Review required: ${reviewReq}`);
    if (outsideScope > 0)
        console.log(`  Outside scope: ${outsideScope}`);
    if (forbidden > 0)
        console.log(`  Forbidden: ${forbidden}`);
    if (publicCheck.findings.length > 0) {
        console.log("");
        console.log("  Findings:");
        for (const f of publicCheck.findings) {
            console.log(`    [${f.severity}] ${f.file}: ${f.message}`);
        }
    }
    console.log("");
    console.log("  Reports:");
    console.log("    .pantheon/report.md    ← reviewer report");
    console.log("    .pantheon/feedback.md  ← agent retry feedback");
    console.log("    .pantheon/check.json   ← machine-readable result");
    console.log(`    .pantheon/attempts/attempt_${attempt}/  ← attempt archive`);
}
//# sourceMappingURL=cmdCheck.js.map