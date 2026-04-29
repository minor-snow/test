import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { repairRunPaths } from "./repairArtifactLayout.js";
export function appendRepairAuditEvent(repoRoot, repairId, event) {
    const line = JSON.stringify(event) + "\n";
    appendFileSync(repairRunPaths(repoRoot, repairId).auditLog, line);
}
export function loadRepairAuditLog(repoRoot, repairId) {
    const path = repairRunPaths(repoRoot, repairId).auditLog;
    if (!existsSync(path))
        return [];
    const text = readFileSync(path, "utf-8").trim();
    if (!text)
        return [];
    return text.split(/\r?\n/).map(line => JSON.parse(line));
}
export function writeRepairAuditLog(repoRoot, repairId, events) {
    const path = repairRunPaths(repoRoot, repairId).auditLog;
    const text = events.map(event => JSON.stringify(event)).join("\n");
    writeFileSync(path, text ? `${text}\n` : "");
}
//# sourceMappingURL=repairAuditLog.js.map