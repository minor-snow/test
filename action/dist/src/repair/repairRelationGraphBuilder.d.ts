import type { RepoObservations } from "../repoObservation/types.js";
import type { GraphBuildStats, RepairRelationEdge, RepairSourceReport, RepairSuspectSurface } from "./types.js";
import type { PythonObservationSidecar } from "../repoObservation/python/types.js";
export type RepairRelationGraphResult = {
    readonly edges: readonly RepairRelationEdge[];
    readonly stats: GraphBuildStats;
};
export declare function buildRepairRelationGraph(input: {
    report: RepairSourceReport;
    suspectSurface: RepairSuspectSurface;
    observations: RepoObservations;
    pythonSidecar: PythonObservationSidecar | null;
}): RepairRelationGraphResult;
