import type { RepoObservations } from "../repoObservation/types.js";
import type { BugFinding, RepairSourceReport, RepairSuspectSurface } from "./types.js";
export declare function buildSuspectSurface(input: {
    report: RepairSourceReport;
    finding: BugFinding;
    observations: RepoObservations;
}): RepairSuspectSurface;
