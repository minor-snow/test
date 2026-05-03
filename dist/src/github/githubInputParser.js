import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
export function parseGitHubActionConfig(env) {
    const event = loadGitHubEvent(env);
    const prContext = extractPullRequestContext(event);
    const scopePatterns = parseMultilinePatterns(env.INPUT_SCOPE);
    if (scopePatterns.length === 0) {
        throw new Error("GitHub Action input 'scope' is required and must contain at least one non-empty pattern.");
    }
    const intent = firstNonEmpty(env.INPUT_INTENT, prContext?.title, "GitHub PR boundary check");
    const reviewPatterns = parseMultilinePatterns(env.INPUT_REVIEW);
    const forbidPatterns = parseMultilinePatterns(env.INPUT_FORBID);
    return {
        intent,
        scopePatterns,
        reviewPatterns,
        forbidPatterns,
        configPath: firstNonEmpty(env.INPUT_CONFIG_PATH, "pantheon.json"),
        failOn: parseFailConditions(env.INPUT_FAIL_ON),
        postComment: parseBoolean(env.INPUT_POST_COMMENT, true),
        uploadArtifacts: parseBoolean(env.INPUT_UPLOAD_ARTIFACTS, true),
        artifactMode: parseArtifactMode(env.INPUT_ARTIFACT_MODE),
        commentMode: parseCommentMode(env.INPUT_COMMENT_MODE),
        baseSha: prContext?.baseSha,
        headSha: prContext?.headSha,
    };
}
export function loadGitHubEvent(env) {
    const eventPath = env.GITHUB_EVENT_PATH;
    if (!eventPath)
        return null;
    const resolved = resolve(eventPath);
    if (!existsSync(resolved))
        return null;
    try {
        return JSON.parse(readFileSync(resolved, "utf-8"));
    }
    catch {
        return null;
    }
}
export function extractPullRequestContext(event) {
    if (!event?.repository?.owner?.login || !event.repository.name || !event.number) {
        return null;
    }
    return {
        owner: event.repository.owner.login,
        repo: event.repository.name,
        prNumber: event.number,
        baseSha: event.pull_request?.base?.sha,
        headSha: event.pull_request?.head?.sha,
        title: event.pull_request?.title,
    };
}
export function parseMultilinePatterns(raw) {
    if (!raw)
        return [];
    return raw
        .split(/[\r\n,]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
export function parseFailConditions(raw, defaultConditions = ["forbidden", "outside_scope", "sanitizer_violation"]) {
    if (!raw || raw.trim().length === 0) {
        return defaultConditions;
    }
    const normalized = raw
        .split(",")
        .map(token => token.trim().toLowerCase())
        .filter(token => token.length > 0);
    if (normalized.includes("all"))
        return ["all"];
    if (normalized.includes("none"))
        return ["none"];
    return [...new Set(normalized)];
}
export function parseBoolean(raw, fallback) {
    if (raw === undefined)
        return fallback;
    const normalized = raw.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized))
        return true;
    if (["false", "0", "no", "off"].includes(normalized))
        return false;
    return fallback;
}
export function parseGitHubChangeInputs(env) {
    const event = loadGitHubEvent(env);
    const prContext = extractPullRequestContext(event);
    const changeId = firstNonEmpty(env.INPUT_CHANGE_ID);
    if (!changeId) {
        throw new Error("Change mode requires change_id.");
    }
    return {
        event,
        prContext,
        inputs: {
            mode: "change",
            changeId,
            configPath: firstNonEmpty(env.INPUT_CONFIG_PATH, "pantheon.alpha.json"),
            artifactMode: parseArtifactMode(env.INPUT_ARTIFACT_MODE),
            commentMode: parseCommentMode(env.INPUT_COMMENT_MODE),
            postComment: parseBoolean(env.INPUT_POST_COMMENT, true),
            uploadArtifacts: parseBoolean(env.INPUT_UPLOAD_ARTIFACTS, true),
            failOn: parseChangeFailConditions(env.INPUT_FAIL_ON),
            baseSha: prContext?.baseSha,
            headSha: prContext?.headSha,
        },
    };
}
export function parseGitHubRepairInputs(env) {
    const event = loadGitHubEvent(env);
    const prContext = extractPullRequestContext(event);
    const repairId = firstNonEmpty(env.INPUT_REPAIR_ID);
    const agentBugReport = firstNonEmpty(env.INPUT_AGENT_BUG_REPORT);
    const repairIntent = firstNonEmpty(env.INPUT_REPAIR_INTENT);
    const suspectPaths = parseMultilinePatterns(env.INPUT_SUSPECT);
    const failingTests = parseMultilinePatterns(env.INPUT_FAILING_TESTS);
    const mustPreserve = parseMultilinePatterns(env.INPUT_MUST_PRESERVE);
    const sourceKind = resolveRepairSourceKind({ repairId, agentBugReport, repairIntent });
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
            configPath: firstNonEmpty(env.INPUT_CONFIG_PATH, "pantheon.alpha.json"),
            repairId,
            agentBugReport,
            repairIntent,
            suspectPaths,
            failingTests,
            mustPreserve,
            auditMode: parseRepairAuditMode(env.INPUT_AUDIT_MODE),
            artifactMode: parseArtifactMode(env.INPUT_ARTIFACT_MODE),
            postComment: parseBoolean(env.INPUT_POST_COMMENT, true),
            uploadArtifacts: parseBoolean(env.INPUT_UPLOAD_ARTIFACTS, true),
            failOn: parseRepairFailConditions(env.INPUT_FAIL_ON),
            baseSha: prContext?.baseSha,
            headSha: prContext?.headSha,
            sourceKind,
        },
    };
}
export function parseChangeFailConditions(raw) {
    return parseFailConditions(raw, ["fail", "requires_contract", "requires_replan", "requires_scope_expansion"]);
}
export function parseRepairFailConditions(raw) {
    return parseFailConditions(raw, ["fail", "requires_replan", "requires_scope_expansion"]);
}
function resolveRepairSourceKind(input) {
    if (input.repairId)
        return "existing_repair_id";
    if (input.agentBugReport)
        return "agent_bug_report";
    return "inline_action_inputs";
}
function parseRepairAuditMode(raw) {
    const normalized = raw?.trim().toLowerCase();
    if (normalized === "auto" || normalized === "require_plan_approval" || normalized === "require_all") {
        return normalized;
    }
    return "require_plan_approval";
}
function parseArtifactMode(raw) {
    return raw?.trim().toLowerCase() === "debug" ? "debug" : "public";
}
function parseCommentMode(raw) {
    return raw?.trim().toLowerCase() === "off" ? "off" : "update";
}
function firstNonEmpty(...values) {
    for (const value of values) {
        if (value && value.trim().length > 0)
            return value.trim();
    }
    return "";
}
/** @deprecated use parseMultilinePatterns */
export const parseDelimitedList = parseMultilinePatterns;
//# sourceMappingURL=githubInputParser.js.map