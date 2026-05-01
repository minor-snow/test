import type { RepoObservations } from "../repoObservation/types.js";
import type { PythonObservationSidecar } from "../repoObservation/python/types.js";
import type { TypeScriptObservationSidecar } from "../repoObservation/typescript/types.js";
import type { RepairImpactSurface, RepairScope, RepairSuspectSurface } from "./types.js";
export declare function buildRepairScope(input: {
    suspectSurface: RepairSuspectSurface;
    impactSurface: RepairImpactSurface;
    observations: RepoObservations;
    pythonSidecar: PythonObservationSidecar | null;
    typescriptSidecar?: TypeScriptObservationSidecar | null;
    protectedPatterns: readonly string[];
}): RepairScope;
