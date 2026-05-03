import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { verifyChangeDiff } from "../change/changeVerifier.js";
import { renderChangeReport } from "../change/changeReportRenderer.js";
import { renderChangeFeedback } from "../change/changeFeedbackRenderer.js";
import { writeChangeCheckEvent } from "../change/changeGovernanceEventWriter.js";
import { writeChangeReviewRequest } from "../change/changeReviewRequestBuilder.js";
import { getChangeContractPath, getChangeCheckPath, getChangeReportPath, getChangeFeedbackPath } from "../change/changeArtifactLayout.js";
import { loadBaseArchitectureContract } from "../architecture/baseBranchArchitectureLoader.js";
import { adaptArchitectureConstraints } from "../change/architectureConstraintAdapter.js";
export function runChangeCheck(repoRoot, options) {
    const root = resolve(repoRoot);
    const contractPath = getChangeContractPath(root, options.changeId, "latest");
    if (!existsSync(contractPath)) {
        console.error(`Change contract not found: ${contractPath}`);
        process.exit(1);
    }
    const contract = JSON.parse(readFileSync(contractPath, "utf-8"));
    const baseRef = options.base || contract.repo_state.base_sha || "HEAD";
    const headRef = options.head || "HEAD";
    // Compute diff
    let diffOutput = "";
    try {
        diffOutput = execFileSync("git", ["diff", "--name-status", baseRef, headRef], {
            cwd: root,
            encoding: "utf-8",
        });
    }
    catch (err) {
        console.error("Failed to compute git diff.");
        process.exit(1);
    }
    const changed_files = diffOutput
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
        const parts = line.split(/\s+/);
        const statusChar = parts[0][0];
        const path = parts[parts.length - 1]; // Handles R100 cases
        let status = "modified";
        if (statusChar === "A")
            status = "added";
        else if (statusChar === "D")
            status = "deleted";
        else if (statusChar === "R")
            status = "renamed";
        return { path, status };
    });
    // Check if architecture_contract.json was modified
    const archContractModified = changed_files.some(f => f.path === ".pantheon/architecture/architecture_contract.json");
    // Load base architecture constraints if in CI mode
    let baseArchContract = null;
    if (options.base) {
        const result = loadBaseArchitectureContract(root, options.base);
        if (result.status === "loaded" && result.contract) {
            baseArchContract = result.contract;
            const adapterResult = adaptArchitectureConstraints({
                contract: baseArchContract,
                targetSubjects: [],
                targetPathPatterns: [],
            });
            // Inject into contract scope
            for (const entry of adapterResult.entries) {
                if (entry.bucket === "forbidden")
                    contract.scope.forbidden.push(entry);
                else if (entry.bucket === "review_required")
                    contract.scope.review_required.push(entry);
                else if (entry.bucket === "allowed")
                    contract.scope.allowed.push(entry);
            }
        }
    }
    const result = verifyChangeDiff({
        contract,
        diff: {
            base_ref: baseRef || "",
            changed_files,
            warnings: [],
        }
    });
    if (archContractModified) {
        // If the PR touches the architecture contract, forcibly append a finding
        result.findings.push({
            kind: "architecture_contract_modified",
            message: "This change modifies the architecture contract. The base branch architecture contract was used to evaluate business code changes.",
            severity: "warning",
            files: [".pantheon/architecture/architecture_contract.json"],
        });
        if (result.verdict === "pass") {
            result.verdict = "requires_review"; // Force review if contract is modified
        }
    }
    const checkPath = getChangeCheckPath(root, options.changeId);
    const reportPath = getChangeReportPath(root, options.changeId);
    const feedbackPath = getChangeFeedbackPath(root, options.changeId);
    writeFileSync(checkPath, JSON.stringify(result, null, 2) + "\n");
    writeFileSync(reportPath, renderChangeReport(result));
    writeFileSync(feedbackPath, renderChangeFeedback(result));
    writeChangeCheckEvent(root, result);
    writeChangeReviewRequest(root, result);
    if (options.format === "json") {
        console.log(JSON.stringify(result, null, 2));
    }
    else {
        console.log(renderChangeReport(result));
    }
    let exitCode = 0;
    if (options.failOn === "all") {
        if (result.verdict !== "pass")
            exitCode = 1;
    }
    else if (options.failOn === "blocking" || options.failOn === undefined) {
        if (result.verdict === "fail" || result.verdict === "requires_contract" || result.verdict === "requires_replan" || result.verdict === "requires_scope_expansion") {
            exitCode = 1;
        }
    }
    process.exit(exitCode);
}
//# sourceMappingURL=cmdChangeCheck.js.map