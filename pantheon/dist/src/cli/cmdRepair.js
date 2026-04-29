import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readGitDiffSummary } from "../diffWorkflow/gitDiffReader.js";
import { loadPantheonConfig } from "./pantheonConfig.js";
import { loadRepoObservationConfig } from "../repoObservation/repoObservationConfigLoader.js";
import { scanRepo } from "../repoObservation/repoScanner.js";
import { hasPythonSignals } from "../repoObservation/python/pythonEcosystemPatterns.js";
import { enhanceWithPythonObservations } from "../repoObservation/python/pythonObservationEnhancer.js";
import { ensureRepairDirs, repairRunPaths } from "../repair/repairArtifactLayout.js";
import { appendRepairAuditEvent, } from "../repair/repairAuditLog.js";
import { loadRepairSourceReport, validateRepairSourceReport, } from "../repair/agentBugReportValidator.js";
import { buildBugFinding, buildUserBugReport, } from "../repair/bugFindingBuilder.js";
import { buildRepairContract } from "../repair/repairContractBuilder.js";
import { renderConsistencyChecklistMarkdown, renderRepairScopeMarkdown, renderRepairTaskMarkdown, } from "../repair/repairTaskRenderer.js";
import { buildHumanAuditDecision, writeHumanAuditDecision } from "../repair/humanAuditDecisionWriter.js";
import { applyHumanAuditDecision } from "../repair/repairPlanRevisioner.js";
import { buildRepairFeedbackFromCheck, deriveRepairVerdictFromFindings, verifyRepairDiff, } from "../repair/repairVerifier.js";
import { renderRepairFeedbackMarkdown } from "../repair/repairFeedbackRenderer.js";
import { renderRepairReportMarkdown } from "../repair/repairReportRenderer.js";
import { readJsonFile } from "../repair/repairUtils.js";
import { syntheticRepairDiffSchema, } from "../repair/types.js";
import { closeRepairSession, createRepairSession, listRepairSessions, loadLatestRepairId, loadRepairSession, updateRepairSession, updateSessionFromContract, } from "../repair/session/repairSessionStore.js";
import { captureRepoStateSnapshot } from "../repair/session/repoStateSnapshot.js";
import { detectStaleRepairPlan } from "../repair/session/stalePlanDetector.js";
import { detectActiveScopePatternOverlaps, detectActualChangedFileOverlaps, } from "../repair/session/activeRepairOverlapDetector.js";
export function cmdRepair(args) {
    const subcommand = args[0];
    switch (subcommand) {
        case "intake":
            cmdRepairIntake({
                repoRoot: getFlag(args, "repo") ?? ".",
                fromPath: getFlag(args, "from"),
                intent: getFlag(args, "intent"),
                suspectPaths: getAllFlags(args, "suspect"),
                failingTests: getAllFlags(args, "failing-test"),
                mustPreserve: getAllFlags(args, "must-preserve"),
                agentId: getFlag(args, "agent-id"),
                operatorId: getFlag(args, "operator") ?? "user",
            });
            return;
        case "plan":
            cmdRepairPlan({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                configPath: getFlag(args, "config"),
            });
            return;
        case "audit":
            cmdRepairAudit({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                targetRevision: Number.parseInt(requireFlag(args, "target-revision", "repair audit requires --target-revision <n>."), 10),
                gate: normalizeGate(requireFlag(args, "gate", "repair audit requires --gate <bug_intake|repair_plan|post_repair>.")),
                decision: getFlag(args, "decision") ?? "approve",
                reason: requireFlag(args, "reason", "repair audit requires --reason."),
                operatorId: getFlag(args, "operator") ?? "human",
                addReview: getAllFlags(args, "add-review"),
                addForbid: getAllFlags(args, "add-forbid"),
                addMustPreserve: getAllFlags(args, "add-must-preserve"),
            });
            return;
        case "check":
            cmdRepairCheck({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                baseRef: getFlag(args, "base"),
                diffJsonPath: getFlag(args, "diff-json"),
            });
            return;
        case "list":
            cmdRepairList({
                repoRoot: getFlag(args, "repo") ?? ".",
            });
            return;
        case "status":
            cmdRepairStatus({
                repoRoot: getFlag(args, "repo") ?? ".",
            });
            return;
        case "show":
            cmdRepairShow({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
            });
            return;
        case "close":
            cmdRepairClose({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                reason: requireFlag(args, "reason", "repair close requires --reason."),
            });
            return;
        case "abandon":
            cmdRepairAbandon({
                repoRoot: getFlag(args, "repo") ?? ".",
                repairId: requireRepairId(args, getFlag(args, "repo") ?? "."),
                reason: requireFlag(args, "reason", "repair abandon requires --reason."),
            });
            return;
        default:
            console.error("Usage:");
            console.error("  pantheon repair intake --from agent_bug_report.json [--agent-id claude-code]");
            console.error("  pantheon repair intake --intent \"...\" --suspect path [--failing-test path]");
            console.error("  pantheon repair plan --repair-id repair_abc123 [--config pantheon.alpha.json]");
            console.error("  pantheon repair audit --repair-id repair_abc123 --target-revision 1 --gate repair_plan --decision approve --reason \"...\"");
            console.error("  pantheon repair check --repair-id repair_abc123 [--base HEAD] [--diff-json path/to/synthetic_diff.json]");
            console.error("  pantheon repair list");
            console.error("  pantheon repair status");
            console.error("  pantheon repair show --repair-id repair_abc123");
            console.error("  pantheon repair close --repair-id repair_abc123 --reason \"merged\"");
            console.error("  pantheon repair abandon --repair-id repair_abc123 --reason \"superseded\"");
            process.exit(1);
    }
}
export function cmdRepairIntake(input) {
    const repoRoot = resolve(input.repoRoot);
    ensureRepairDirs(repoRoot);
    const report = resolveIntakeReport(repoRoot, input);
    const validation = validateRepairSourceReport(report, repoRoot);
    const finding = buildBugFinding(validation);
    const session = createRepairSession({
        repoRoot,
        agentId: input.agentId,
        source: report.schema_version === "agent_bug_report@0.1.0" ? "agent_bug_report" : "user_report",
        status: mapFindingStatusToSessionStatus(finding.status),
    });
    const paths = repairRunPaths(repoRoot, session.repair_id);
    if (report.schema_version === "agent_bug_report@0.1.0") {
        writeFileSync(paths.agentBugReport, JSON.stringify(report, null, 2));
    }
    else {
        writeFileSync(paths.userBugReport, JSON.stringify(report, null, 2));
    }
    writeFileSync(paths.bugFinding, JSON.stringify(finding, null, 2));
    appendRepairAuditEvent(repoRoot, session.repair_id, {
        timestamp: new Date().toISOString(),
        event: report.schema_version === "agent_bug_report@0.1.0" ? "agent_report_submitted" : "user_report_submitted",
        repair_id: session.repair_id,
        report_id: report.report_id,
        detail: report.summary,
    });
    appendRepairAuditEvent(repoRoot, session.repair_id, {
        timestamp: new Date().toISOString(),
        event: "bug_report_validated",
        repair_id: session.repair_id,
        report_id: report.report_id,
        finding_id: finding.finding_id,
        detail: finding.status,
    });
    console.log("Pantheon Repair Intake\n");
    console.log(`  Repair session: ${session.repair_id}`);
    console.log(`  Report: ${report.report_id}`);
    console.log(`  Finding: ${finding.status}`);
    console.log(`  Run: pantheon repair plan --repair-id ${session.repair_id}`);
    return session;
}
export function cmdRepairPlan(input) {
    const repoRoot = resolve(input.repoRoot);
    ensureRepairDirs(repoRoot);
    const session = loadRepairSession(repoRoot, input.repairId);
    const paths = repairRunPaths(repoRoot, input.repairId);
    const report = loadStoredRepairReport(paths);
    const finding = loadBugFinding(paths);
    if (finding.status !== "accepted") {
        throw new Error(`Repair plan requires an accepted BugFinding. Current status: ${finding.status}`);
    }
    const context = loadRepairPlanningContext(repoRoot, input.configPath);
    const repoState = captureRepoStateSnapshot({
        repoRoot,
        diffBase: null,
        source: "git",
    });
    const contract = buildRepairContract({
        repairId: session.repair_id,
        report,
        finding,
        observations: context.observations,
        pythonSidecar: context.pythonSidecar,
        protectedPatterns: context.protectedPatterns,
        userMustPreserve: report.schema_version === "user_bug_report@0.1.0" ? report.must_preserve : [],
        repoState,
    });
    writeRepairPlanArtifacts(repoRoot, report, finding, contract);
    updateSessionFromContract({
        repoRoot,
        repairId: contract.repair_id,
        revision: contract.revision,
        status: "plan_pending_audit",
        scopeSummary: buildScopeSummary(contract),
        riskLevel: deriveRiskLevel(contract),
        baseSha: contract.repo_state.base_sha,
    });
    const overlapFindings = detectActiveScopePatternOverlaps({
        contract,
        otherContracts: loadOtherActiveContracts(repoRoot, contract.repair_id),
    });
    for (const findingItem of overlapFindings) {
        appendRepairAuditEvent(repoRoot, contract.repair_id, {
            timestamp: new Date().toISOString(),
            event: "repair_analysis_generated",
            repair_id: contract.repair_id,
            detail: `${findingItem.kind}: ${findingItem.reason}`,
        });
    }
    appendRepairAuditEvent(repoRoot, contract.repair_id, {
        timestamp: new Date().toISOString(),
        event: "repair_analysis_generated",
        repair_id: contract.repair_id,
        report_id: report.report_id,
        finding_id: finding.finding_id,
        detail: contract.audit_status,
    });
    appendRepairAuditEvent(repoRoot, contract.repair_id, {
        timestamp: new Date().toISOString(),
        event: "repair_task_rendered",
        repair_id: contract.repair_id,
        detail: paths.task,
    });
    console.log("Pantheon Repair Plan\n");
    console.log(`  Repair: ${contract.repair_id}`);
    console.log(`  Revision: ${contract.revision}`);
    console.log(`  Audit status: ${contract.audit_status}`);
    if (overlapFindings.length > 0) {
        console.log(`  Concurrent findings: ${overlapFindings.length}`);
    }
    console.log(`  Output: ${paths.task}`);
}
export function cmdRepairAudit(input) {
    const repoRoot = resolve(input.repoRoot);
    ensureRepairDirs(repoRoot);
    const paths = repairRunPaths(repoRoot, input.repairId);
    const session = loadRepairSession(repoRoot, input.repairId);
    const decision = buildHumanAuditDecision({
        repairId: input.repairId,
        targetRevision: input.targetRevision,
        gate: input.gate,
        decision: normalizeDecision(input.gate, input.decision),
        operatorId: input.operatorId,
        reason: input.reason,
        addReview: input.addReview,
        addForbid: input.addForbid,
        addMustPreserve: input.addMustPreserve,
    });
    writeHumanAuditDecision(repoRoot, decision);
    if (input.gate === "bug_intake") {
        const finding = loadBugFinding(paths);
        const updatedFinding = applyBugIntakeDecision(finding, decision);
        writeFileSync(paths.bugFinding, JSON.stringify(updatedFinding, null, 2));
        updateRepairSession(repoRoot, input.repairId, current => ({
            ...current,
            status: mapFindingStatusToSessionStatus(updatedFinding.status),
            updated_at: new Date().toISOString(),
        }));
    }
    else {
        const contract = loadCurrentRepairContract(repoRoot, input.repairId);
        try {
            const updatedContract = applyHumanAuditDecision(contract, decision);
            const report = loadStoredRepairReport(paths);
            const finding = loadBugFinding(paths);
            writeRepairPlanArtifacts(repoRoot, report, finding, updatedContract);
            updateSessionFromContract({
                repoRoot,
                repairId: updatedContract.repair_id,
                revision: updatedContract.revision,
                status: mapAuditStatusToSessionStatus(updatedContract.audit_status),
                scopeSummary: buildScopeSummary(updatedContract),
                riskLevel: deriveRiskLevel(updatedContract),
                baseSha: updatedContract.repo_state.base_sha,
            });
        }
        catch (error) {
            appendRepairAuditEvent(repoRoot, input.repairId, {
                timestamp: new Date().toISOString(),
                event: input.gate === "post_repair" ? "human_post_repair_decision" : "human_plan_decision",
                repair_id: input.repairId,
                decision_id: decision.decision_id,
                detail: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: input.gate === "post_repair" ? "human_post_repair_decision" : input.gate === "repair_plan" ? "human_plan_decision" : "human_intake_decision",
        repair_id: input.repairId,
        decision_id: decision.decision_id,
        detail: `${decision.decision}: ${decision.reason}`,
    });
    console.log("Pantheon Repair Audit\n");
    console.log(`  Repair: ${session.repair_id}`);
    console.log(`  Gate: ${input.gate}`);
    console.log(`  Decision: ${decision.decision}`);
    console.log(`  Output: ${paths.humanAuditDecision(decision.decision_id)}`);
}
export function cmdRepairCheck(input) {
    const repoRoot = resolve(input.repoRoot);
    const contract = loadCurrentRepairContract(repoRoot, input.repairId);
    const paths = repairRunPaths(repoRoot, input.repairId);
    const report = loadStoredRepairReport(paths);
    const diff = readRepairDiff({
        repoRoot,
        baseRef: input.baseRef,
        diffJsonPath: input.diffJsonPath,
        changedFilesOverride: input.changedFilesOverride,
    });
    const filteredDiff = {
        ...diff,
        changed_files: diff.changed_files.filter((file) => !file.path.startsWith(".pantheon/repair/")),
    };
    const baseResult = verifyRepairDiff({
        contract,
        diff: filteredDiff,
    });
    const currentRepoState = input.diffJsonPath || input.changedFilesOverride
        ? captureRepoStateSnapshot({
            repoRoot,
            diffBase: contract.repo_state.base_sha,
            source: "synthetic",
        })
        : captureRepoStateSnapshot({
            repoRoot,
            diffBase: input.baseRef,
            source: "git",
        });
    const staleFindings = detectStaleRepairPlan({
        contractState: contract.repo_state,
        currentState: currentRepoState,
    }).map(finding => stalePlanToRepairFinding(finding));
    const overlapFindings = detectActualChangedFileOverlaps({
        repairId: contract.repair_id,
        changedFiles: filteredDiff.changed_files.map(file => file.path),
        otherContracts: loadOtherActiveContracts(repoRoot, contract.repair_id),
    });
    const overlapRepairFindings = overlapFindings.map(finding => concurrentToRepairFinding(finding));
    const findings = [
        ...baseResult.check.findings,
        ...staleFindings,
        ...overlapRepairFindings,
    ];
    const verdict = deriveRepairVerdictFromFindings(findings);
    const finalCheck = {
        ...baseResult.check,
        verdict,
        findings,
        concurrent_findings: [
            ...staleFindings.map(finding => repairFindingToConcurrentFinding(contract.repair_id, finding)),
            ...overlapFindings,
        ],
        summary: {
            ...baseResult.check.summary,
            warnings: findings.filter(finding => finding.severity === "warning").length,
        },
    };
    const feedback = buildRepairFeedbackFromCheck(finalCheck);
    writeFileSync(paths.check, JSON.stringify(finalCheck, null, 2));
    writeFileSync(paths.report, renderRepairReportMarkdown({ report, contract, check: finalCheck }));
    writeFileSync(paths.feedback, renderRepairFeedbackMarkdown(feedback));
    updateSessionFromContract({
        repoRoot,
        repairId: contract.repair_id,
        revision: contract.revision,
        status: mapVerdictToSessionStatus(finalCheck.verdict),
        scopeSummary: buildScopeSummary(contract),
        riskLevel: deriveRiskLevel(contract),
        baseSha: contract.repo_state.base_sha,
    });
    appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: "agent_repair_checked",
        repair_id: contract.repair_id,
        detail: finalCheck.verdict,
    });
    console.log("Pantheon Repair Check\n");
    console.log(`  Repair: ${contract.repair_id}`);
    console.log(`  Verdict: ${finalCheck.verdict}`);
    console.log(`  Changed files: ${finalCheck.summary.changed_files}`);
    if (finalCheck.concurrent_findings.length > 0) {
        console.log(`  Concurrent findings: ${finalCheck.concurrent_findings.length}`);
    }
    console.log(`  Output: ${paths.report}`);
}
export function cmdRepairList(input) {
    const repoRoot = resolve(input.repoRoot);
    const index = listRepairSessions(repoRoot);
    console.log("Pantheon Repair Sessions\n");
    if (index.active_repairs.length === 0 && index.closed_repairs.length === 0) {
        console.log("  No repair sessions.");
        return;
    }
    for (const session of index.active_repairs) {
        console.log(`  ${session.repair_id}  ${session.status}  rev=${session.current_revision}`);
    }
    for (const session of index.closed_repairs) {
        console.log(`  ${session.repair_id}  ${session.status}  rev=${session.current_revision}`);
    }
}
export function cmdRepairStatus(input) {
    const repoRoot = resolve(input.repoRoot);
    const index = listRepairSessions(repoRoot);
    console.log("Active repair sessions:\n");
    if (index.active_repairs.length === 0) {
        console.log("  None");
        return;
    }
    for (const session of index.active_repairs) {
        console.log(`${session.repair_id}`);
        console.log(`  agent: ${session.agent_id ?? "n/a"}`);
        console.log(`  status: ${session.status}`);
        console.log(`  revision: ${session.current_revision}`);
        console.log(`  base_sha: ${session.base_sha ?? "unknown"}`);
        console.log(`  risk: ${session.risk_level}`);
        console.log(`  allowed: ${session.scope_summary.allowed.join(", ") || "-"}`);
        console.log(`  review: ${session.scope_summary.review_required.join(", ") || "-"}`);
        console.log(`  forbidden: ${session.scope_summary.forbidden.join(", ") || "-"}`);
        console.log("");
    }
}
export function cmdRepairShow(input) {
    const repoRoot = resolve(input.repoRoot);
    const session = loadRepairSession(repoRoot, input.repairId);
    const paths = repairRunPaths(repoRoot, input.repairId);
    console.log("Pantheon Repair Session\n");
    console.log(`  Repair: ${session.repair_id}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Revision: ${session.current_revision}`);
    console.log(`  Directory: ${paths.dir}`);
    if (existsSync(paths.contractLatest)) {
        console.log(`  Contract: ${paths.contractLatest}`);
    }
}
export function cmdRepairClose(input) {
    const repoRoot = resolve(input.repoRoot);
    const session = closeRepairSession({
        repoRoot,
        repairId: input.repairId,
        status: "closed",
        reason: input.reason,
    });
    appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: "repair_closed",
        repair_id: input.repairId,
        detail: input.reason,
    });
    console.log(`Closed repair session ${session.repair_id}.`);
}
export function cmdRepairAbandon(input) {
    const repoRoot = resolve(input.repoRoot);
    const session = closeRepairSession({
        repoRoot,
        repairId: input.repairId,
        status: "abandoned",
        reason: input.reason,
    });
    appendRepairAuditEvent(repoRoot, input.repairId, {
        timestamp: new Date().toISOString(),
        event: "repair_closed",
        repair_id: input.repairId,
        detail: `abandoned: ${input.reason}`,
    });
    console.log(`Abandoned repair session ${session.repair_id}.`);
}
function resolveIntakeReport(repoRoot, input) {
    if (input.fromPath) {
        return loadRepairSourceReport(resolve(input.fromPath));
    }
    if (!input.intent) {
        throw new Error("repair intake requires --from <report.json> or --intent <summary>.");
    }
    if ((input.suspectPaths ?? []).length === 0) {
        throw new Error("repair intake requires at least one --suspect path for user-initiated repair.");
    }
    return buildUserBugReport({
        intent: input.intent,
        suspectPaths: input.suspectPaths ?? [],
        failingTests: input.failingTests ?? [],
        mustPreserve: input.mustPreserve ?? [],
        operatorId: input.operatorId ?? "user",
    });
}
function loadRepairPlanningContext(repoRoot, configPath = "pantheon.json") {
    const pantheonConfig = loadPantheonConfig(repoRoot, configPath);
    const repoObsConfig = loadRepoObservationConfig(repoRoot);
    const observations = scanRepo({
        repoRoot,
        config: {
            ...repoObsConfig.config,
            path_roles: {
                ...(repoObsConfig.config.path_roles ?? {}),
                ...Object.fromEntries(Object.entries(pantheonConfig.config.path_roles)
                    .filter(([, value]) => ["src", "test", "config", "generated", "docs", "script", "asset", "unknown"].includes(value))
                    .map(([key, value]) => [key, value])),
            },
        },
    });
    let pythonSidecar = null;
    if (hasPythonSignals(observations.observations.files.map(file => file.path))) {
        pythonSidecar = enhanceWithPythonObservations(observations, repoRoot, pantheonConfig.config.python
            ? {
                project_packages: pantheonConfig.config.python.project_packages,
                sensitive_overrides: pantheonConfig.config.python.sensitive_overrides,
            }
            : undefined);
    }
    return {
        observations,
        pythonSidecar,
        protectedPatterns: pantheonConfig.config.protected,
    };
}
function writeRepairPlanArtifacts(repoRoot, report, finding, contract) {
    const paths = repairRunPaths(repoRoot, contract.repair_id);
    if (report.schema_version === "agent_bug_report@0.1.0") {
        writeFileSync(paths.agentBugReport, JSON.stringify(report, null, 2));
    }
    else {
        writeFileSync(paths.userBugReport, JSON.stringify(report, null, 2));
    }
    writeFileSync(paths.bugFinding, JSON.stringify(finding, null, 2));
    writeFileSync(paths.contractRevision(contract.revision), JSON.stringify(contract, null, 2));
    writeFileSync(paths.contractLatest, JSON.stringify(contract, null, 2));
    writeFileSync(paths.relationGraph, JSON.stringify(contract.repair_relation_graph, null, 2));
    writeFileSync(paths.task, renderRepairTaskMarkdown({ report, finding, contract }));
    writeFileSync(paths.scope, renderRepairScopeMarkdown(contract));
    writeFileSync(paths.checklist, renderConsistencyChecklistMarkdown(contract));
}
function loadStoredRepairReport(paths) {
    if (existsSync(paths.agentBugReport)) {
        return readJsonFile(paths.agentBugReport);
    }
    if (existsSync(paths.userBugReport)) {
        return readJsonFile(paths.userBugReport);
    }
    throw new Error(`No repair report found for ${paths.repairId}.`);
}
function loadBugFinding(paths) {
    if (!existsSync(paths.bugFinding)) {
        throw new Error(`No bug finding found for ${paths.repairId}.`);
    }
    return readJsonFile(paths.bugFinding);
}
function loadCurrentRepairContract(repoRoot, repairId) {
    const session = loadRepairSession(repoRoot, repairId);
    if (session.current_revision < 1) {
        throw new Error(`Repair session ${repairId} has no generated repair plan yet.`);
    }
    const path = repairRunPaths(repoRoot, repairId).contractRevision(session.current_revision);
    if (!existsSync(path)) {
        throw new Error(`Repair contract revision ${session.current_revision} is missing for ${repairId}.`);
    }
    return readJsonFile(path);
}
function loadOtherActiveContracts(repoRoot, currentRepairId) {
    const index = listRepairSessions(repoRoot);
    const contracts = [];
    for (const session of index.active_repairs) {
        if (session.repair_id === currentRepairId || session.current_revision < 1) {
            continue;
        }
        const contractPath = repairRunPaths(repoRoot, session.repair_id).contractRevision(session.current_revision);
        if (existsSync(contractPath)) {
            contracts.push(readJsonFile(contractPath));
        }
    }
    return contracts;
}
function applyBugIntakeDecision(finding, decision) {
    switch (decision.decision) {
        case "accept_report":
            return { ...finding, status: "accepted", next_action: "repair_analysis" };
        case "reject_report":
            return { ...finding, status: "rejected", next_action: "none" };
        case "needs_more_evidence":
            return { ...finding, status: "needs_more_evidence", next_action: "await_more_evidence" };
        case "mark_duplicate":
            return { ...finding, status: "duplicate", next_action: "none" };
        case "convert_to_backlog":
            return { ...finding, status: "backlog_candidate", next_action: "none" };
        default:
            return finding;
    }
}
function readRepairDiff(input) {
    if (input.diffJsonPath) {
        const rawData = readJsonFile(resolve(input.diffJsonPath));
        const synthetic = syntheticRepairDiffSchema.parse(rawData);
        return {
            base_ref: "synthetic",
            changed_files: synthetic.changed_files.map(file => ({
                path: file.path,
                status: file.change_kind,
            })),
            warnings: [],
        };
    }
    return readGitDiffSummary({
        repoRoot: input.repoRoot,
        baseRef: input.baseRef ?? "",
        changedFilesOverride: input.changedFilesOverride,
    });
}
function buildScopeSummary(contract) {
    return {
        allowed: contract.repair_scope.allowed.map(entry => entry.pattern),
        review_required: contract.repair_scope.review_required.map(entry => entry.pattern),
        forbidden: contract.repair_scope.forbidden.map(entry => entry.pattern),
    };
}
function deriveRiskLevel(contract) {
    if (contract.repair_scope.forbidden.length > 0
        || contract.impact_surface.risk_areas.some(area => area.severity === "critical")) {
        return "high";
    }
    if (contract.repair_scope.review_required.length > 0
        || contract.impact_surface.unknowns.length > 0) {
        return "medium";
    }
    if (contract.repair_scope.allowed.length > 0) {
        return "low";
    }
    return "unknown";
}
function mapFindingStatusToSessionStatus(status) {
    switch (status) {
        case "accepted":
            return "intake_accepted";
        case "rejected":
            return "intake_rejected";
        default:
            return "intake_created";
    }
}
function mapAuditStatusToSessionStatus(status) {
    switch (status) {
        case "approved_repair_plan":
            return "plan_approved";
        case "approved_with_modifications":
            return "plan_restricted";
        case "manual_repair_required":
            return "manual_repair_required";
        default:
            return "plan_pending_audit";
    }
}
function mapVerdictToSessionStatus(verdict) {
    switch (verdict) {
        case "pass":
            return "repair_checked_pass";
        case "requires_review":
            return "repair_checked_requires_review";
        case "requires_scope_expansion":
            return "repair_checked_requires_scope_expansion";
        case "requires_replan":
            return "repair_checked_requires_replan";
        case "fail":
            return "repair_checked_fail";
    }
}
function stalePlanToRepairFinding(finding) {
    if (finding.kind === "stale_repair_contract") {
        return {
            kind: "stale_repair_contract",
            severity: "blocking",
            message: finding.reason,
            allowed_actions: ["request_replan"],
            requires_human: true,
            evidence: ["repo_state:base_sha_mismatch"],
        };
    }
    return {
        kind: "working_tree_changed",
        severity: "warning",
        message: finding.reason,
        allowed_actions: ["keep_for_human_review"],
        requires_human: false,
        evidence: ["repo_state:working_tree_changed"],
    };
}
function concurrentToRepairFinding(finding) {
    const actions = finding.recommended_action === "request_replan"
        ? ["request_replan"]
        : finding.recommended_action === "human_review"
            ? ["keep_for_human_review"]
            : ["keep_for_human_review"];
    const severity = finding.severity === "blocking"
        ? "blocking"
        : finding.severity === "requires_human_audit"
            ? "requires_human_audit"
            : "warning";
    return {
        kind: finding.kind,
        severity,
        message: finding.reason,
        allowed_actions: actions,
        requires_human: finding.severity === "blocking" || finding.severity === "requires_human_audit",
        bucket: finding.overlap?.bucket,
        other_repair_id: finding.other_repair_id,
        evidence: [
            `repair:${finding.repair_id}`,
            ...(finding.other_repair_id ? [`other_repair:${finding.other_repair_id}`] : []),
        ],
    };
}
function repairFindingToConcurrentFinding(repairId, finding) {
    return {
        kind: finding.kind === "stale_repair_contract" ? "stale_repair_contract" : "working_tree_changed",
        severity: finding.kind === "stale_repair_contract" ? "blocking" : "warning",
        repair_id: repairId,
        reason: finding.message,
        recommended_action: finding.kind === "stale_repair_contract" ? "request_replan" : "continue",
    };
}
function normalizeGate(value) {
    if (value === "intake")
        return "bug_intake";
    if (value === "plan")
        return "repair_plan";
    if (value === "post")
        return "post_repair";
    if (value === "bug_intake" || value === "repair_plan" || value === "post_repair") {
        return value;
    }
    throw new Error(`Unknown repair audit gate: ${value}`);
}
function normalizeDecision(gate, value) {
    const normalized = value.replace(/-/g, "_");
    const aliases = {
        bug_intake: {
            approve: "accept_report",
            accept: "accept_report",
            reject: "reject_report",
            needs_more_evidence: "needs_more_evidence",
            duplicate: "mark_duplicate",
            backlog: "convert_to_backlog",
        },
        repair_plan: {
            approve: "approve_repair_plan",
            restrict_scope: "restrict_scope",
            expand_review_scope: "expand_review_scope",
            add_must_preserve: "add_must_preserve",
            add_forbidden_area: "add_forbidden_area",
            require_manual_repair: "require_manual_repair",
        },
        post_repair: {
            approve: "approve_repair",
            request_revert: "request_revert",
            request_scope_expansion: "request_scope_expansion",
            keep_for_human_review: "keep_for_human_review",
            close_as_invalid: "close_as_invalid",
        },
    };
    return aliases[gate][normalized] ?? normalized;
}
function requireRepairId(args, repoRoot) {
    const explicit = getFlag(args, "repair-id");
    if (explicit)
        return explicit;
    const latest = loadLatestRepairId(resolve(repoRoot));
    const active = listRepairSessions(resolve(repoRoot)).active_repairs.map(session => session.repair_id);
    throw new Error(`repair_id is required for correctness. Active sessions: ${active.join(", ") || "none"}. Latest pointer exists: ${latest ?? "no"}.`);
}
function getFlag(args, name) {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1])
        return args[idx + 1];
    return undefined;
}
function getAllFlags(args, name) {
    const values = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === `--${name}` && args[i + 1]) {
            values.push(args[i + 1]);
            i++;
        }
    }
    return values;
}
function requireFlag(args, name, message) {
    const value = getFlag(args, name);
    if (!value)
        throw new Error(message);
    return value;
}
//# sourceMappingURL=cmdRepair.js.map