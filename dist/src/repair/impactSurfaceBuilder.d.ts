import type { RepoObservations } from "../repoObservation/types.js";
import type { PythonObservationSidecar } from "../repoObservation/python/types.js";
import type { BugFinding, RepairImpactSurface, RepairRelationEdge, RepairSourceReport, RepairSuspectSurface } from "./types.js";
export declare function buildImpactSurface(input: {
    report: RepairSourceReport;
    finding: BugFinding;
    suspectSurface: RepairSuspectSurface;
    relationGraph: readonly RepairRelationEdge[];
    observations: RepoObservations;
    pythonSidecar: PythonObservationSidecar | null;
}): RepairImpactSurface;
