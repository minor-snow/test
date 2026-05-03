import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { repairRunPaths } from "./repairArtifactLayout.js";
export function appendRepairAuditEvent(repoRoot, repairId, event) {
    const target = repairRunPaths(repoRoot, repairId).auditLog;
    mkdirSync(dirname(target), { recursive: true });
    const line = JSON.stringify(event) + "\n";
    appendFileSync(target, line);
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
    mkdirSync(dirname(path), { recursive: true });
    const text = events.map(event => JSON.stringify(event)).join("\n");
    writeFileSync(path, text ? `${text}\n` : "");
}
//# sourceMappingURL=repairAuditLog.js.map