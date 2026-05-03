import type { RepairSession, RepairSessionIndex } from "./repairSessionTypes.js";
export declare function createEmptyRepairSessionIndex(): RepairSessionIndex;
export declare function upsertRepairSessionInIndex(index: RepairSessionIndex, session: RepairSession): RepairSessionIndex;
