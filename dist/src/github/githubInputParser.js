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
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
export function parseFailConditions(raw) {
    const normalized = (raw ?? "forbidden,outside_scope")
        .split(",")
        .map(token => token.trim())
        .filter(token => token.length > 0);
    if (normalized.length === 0) {
        return ["forbidden", "outside_scope"];
    }
    if (normalized.includes("all"))
        return ["all"];
    if (normalized.includes("none"))
        return ["none"];
    const allowed = new Set(["forbidden", "outside_scope", "review_required"]);
    const result = normalized.filter(token => allowed.has(token));
    return result.length > 0 ? [...new Set(result)] : ["forbidden", "outside_scope"];
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
function parseArtifactMode(raw) {
    return raw === "debug" ? "debug" : "public";
}
function parseCommentMode(raw) {
    return raw === "off" ? "off" : "update";
}
function firstNonEmpty(...values) {
    for (const value of values) {
        if (value && value.trim().length > 0)
            return value.trim();
    }
    return "";
}
//# sourceMappingURL=githubInputParser.js.map