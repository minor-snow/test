import type { RepoObservations } from "../repoObservation/types.js";
import type { PythonObservationSidecar } from "../repoObservation/python/types.js";
import type { RepairContract, RepairSourceReport } from "./types.js";
import type { BugFinding } from "./types.js";
import type { RepoStateSnapshot } from "./session/repairSessionTypes.js";
import type { ArchitectureContract } from "../architecture/types.js";
export declare function buildRepairContract(input: {
    repairId: string;
    report: RepairSourceReport;
    finding: BugFinding;
    observations: RepoObservations;
    pythonSidecar: PythonObservationSidecar | null;
    protectedPatterns: readonly string[];
    userMustPreserve: readonly string[];
    repoState: RepoStateSnapshot;
    architectureContract?: ArchitectureContract;
}): RepairContract;
