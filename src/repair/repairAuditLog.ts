import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { RepairAuditLogEvent } from "./types.js";
import { repairRunPaths } from "./repairArtifactLayout.js";

export function appendRepairAuditEvent(repoRoot: string, repairId: string, event: RepairAuditLogEvent): void {
  const line = JSON.stringify(event) + "\n";
  appendFileSync(repairRunPaths(repoRoot, repairId).auditLog, line);
}

export function loadRepairAuditLog(repoRoot: string, repairId: string): RepairAuditLogEvent[] {
  const path = repairRunPaths(repoRoot, repairId).auditLog;
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf-8").trim();
  if (!text) return [];
  return text.split(/\r?\n/).map(line => JSON.parse(line) as RepairAuditLogEvent);
}

export function writeRepairAuditLog(repoRoot: string, repairId: string, events: readonly RepairAuditLogEvent[]): void {
  const path = repairRunPaths(repoRoot, repairId).auditLog;
  const text = events.map(event => JSON.stringify(event)).join("\n");
  writeFileSync(path, text ? `${text}\n` : "");
}
