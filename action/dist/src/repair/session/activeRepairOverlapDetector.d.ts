import type { RepairContract } from "../types.js";
import type { ConcurrentRepairFinding } from "./repairSessionTypes.js";
export declare function detectActiveScopePatternOverlaps(input: {
    contract: RepairContract;
    otherContracts: readonly RepairContract[];
}): readonly ConcurrentRepairFinding[];
export declare function detectActualChangedFileOverlaps(input: {
    repairId: string;
    changedFiles: readonly string[];
    otherContracts: readonly RepairContract[];
}): readonly ConcurrentRepairFinding[];
