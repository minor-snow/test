import { join } from "node:path";
export function getChangeRunsDir(repoRoot) {
    return join(repoRoot, ".pantheon", "change", "runs");
}
export function getChangeRunDir(repoRoot, changeId) {
    return join(getChangeRunsDir(repoRoot), changeId);
}
export function getChangeIntakePath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "change_intake.json");
}
export function getChangeTaskPath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "change_task.md");
}
export function getChangeContractPath(repoRoot, changeId, revision) {
    const file = revision === "latest" ? "change_contract.latest.json" : `change_contract.rev${revision}.json`;
    return join(getChangeRunDir(repoRoot, changeId), file);
}
export function getChangeScopePath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "change_scope.md");
}
export function getChangeChecklistPath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "change_checklist.md");
}
export function getChangeCheckPath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "change_check.json");
}
export function getChangeReportPath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "change_report.md");
}
export function getChangeFeedbackPath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "change_feedback.md");
}
export function getChangeAuditLogPath(repoRoot, changeId) {
    return join(getChangeRunDir(repoRoot, changeId), "audit.jsonl");
}
export function getChangeIndexStorePath(repoRoot) {
    return join(repoRoot, ".pantheon", "change", "index.json");
}
//# sourceMappingURL=changeArtifactLayout.js.map