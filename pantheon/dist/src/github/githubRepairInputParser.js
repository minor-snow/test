import { extractPullRequestContext, loadGitHubEvent, parseBoolean, } from "./githubInputParser.js";
export function parseGitHubRepairInputs(env) {
    const event = loadGitHubEvent(env);
    const prContext = extractPullRequestContext(event);
    const repairId = firstNonEmpty(env.INPUT_REPAIR_ID);
    const agentBugReport = firstNonEmpty(env.INPUT_AGENT_BUG_REPORT);
    const repairIntent = firstNonEmpty(env.INPUT_REPAIR_INTENT);
    const suspectPaths = parseDelimitedList(env.INPUT_SUSPECT);
    const failingTests = parseDelimitedList(env.INPUT_FAILING_TESTS);
    const mustPreserve = parseDelimitedList(env.INPUT_MUST_PRESERVE);
    const sourceKind = resolveSourceKind({ repairId, agentBugReport, repairIntent });
    if (!repairId && !agentBugReport && !repairIntent) {
        throw new Error("Repair mode requires one of: repair_id, agent_bug_report, or repair_intent.");
    }
    if (repairIntent && suspectPaths.length === 0) {
        throw new Error("Inline repair_intent requires at least one suspect path.");
    }
    return {
        event,
        prContext,
        inputs: {
            mode: "repair",
            configPath: firstNonEmpty(env.INPUT_CONFIG_PATH, "pantheon.alpha.json") ?? "pantheon.alpha.json",
            repairId,
            agentBugReport,
            repairIntent,
            suspectPaths,
            failingTests,
            mustPreserve,
            auditMode: parseAuditMode(env.INPUT_AUDIT_MODE),
            artifactMode: parseArtifactMode(env.INPUT_ARTIFACT_MODE),
            postComment: parseBoolean(env.INPUT_POST_COMMENT, true),
            failOn: parseRepairFailConditions(env.INPUT_FAIL_ON),
            baseSha: prContext?.baseSha,
            headSha: prContext?.headSha,
            sourceKind,
        },
    };
}
export function parseDelimitedList(raw) {
    if (!raw)
        return [];
    return raw
        .split(/[\r\n,]+/)
        .map(value => value.trim())
        .filter(value => value.length > 0);
}
export function parseRepairFailConditions(raw) {
    const fallback = [
        "fail",
        "requires_replan",
        "requires_scope_expansion",
    ];
    const normalized = (raw ?? fallback.join(","))
        .split(",")
        .map(token => token.trim())
        .filter(token => token.length > 0);
    if (normalized.length === 0)
        return fallback;
    if (normalized.includes("all"))
        return ["all"];
    if (normalized.includes("none"))
        return ["none"];
    const allowed = new Set([
        "pass",
        "requires_review",
        "requires_scope_expansion",
        "requires_replan",
        "fail",
        "public_artifact_sanitizer_violation",
    ]);
    const result = normalized.filter(token => allowed.has(token));
    return result.length > 0 ? [...new Set(result)] : fallback;
}
function resolveSourceKind(input) {
    if (input.repairId)
        return "existing_repair_id";
    if (input.agentBugReport)
        return "agent_bug_report";
    return "inline_action_inputs";
}
function parseAuditMode(raw) {
    if (raw === "auto" || raw === "require_plan_approval" || raw === "require_all") {
        return raw;
    }
    return "require_plan_approval";
}
function parseArtifactMode(raw) {
    return raw === "debug" ? "debug" : "public";
}
function firstNonEmpty(...values) {
    for (const value of values) {
        if (value && value.trim().length > 0) {
            return value.trim();
        }
    }
    return undefined;
}
//# sourceMappingURL=githubRepairInputParser.js.map