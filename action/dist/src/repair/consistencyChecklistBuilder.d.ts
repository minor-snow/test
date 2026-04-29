import type { RepoObservations } from "../repoObservation/types.js";
import type { PythonObservationSidecar } from "../repoObservation/python/types.js";
import type { RepairConsistencyCheck, RepairImpactSurface, RepairTestSignals } from "./types.js";
export declare function buildConsistencyChecklist(input: {
    observations: RepoObservations;
    pythonSidecar: PythonObservationSidecar | null;
    impactSurface: RepairImpactSurface;
    testSignals: RepairTestSignals;
    userMustPreserve: readonly string[];
}): RepairConsistencyCheck[];
