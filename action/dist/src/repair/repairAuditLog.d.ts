import type { RepairAuditLogEvent } from "./types.js";
export declare function appendRepairAuditEvent(repoRoot: string, repairId: string, event: RepairAuditLogEvent): void;
export declare function loadRepairAuditLog(repoRoot: string, repairId: string): RepairAuditLogEvent[];
export declare function writeRepairAuditLog(repoRoot: string, repairId: string, events: readonly RepairAuditLogEvent[]): void;
