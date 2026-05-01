/**
 * P28c: TypeScript/JavaScript Base Adapter — Orchestrator
 *
 * Takes RepoObservations from the existing repoScanner.ts (which already
 * handles TS/JS file enumeration, import extraction, etc.) and produces
 * a TypeScriptObservationSidecar with TS/JS-specific enrichment.
 *
 * Pipeline:
 *   1. Project classification (layout, file bucketing)
 *   2. Framework & role detection
 *   3. Test mapping (unit/integration/e2e split)
 *   4. Risk preset validation
 *   5. Workspace detection
 *   6. Sensitive zone detection
 *   7. Support level assessment
 *   8. Quality metrics
 *
 * Does NOT use TypeScript compiler API. Heuristic-only.
 */
import type { RepoObservations } from "../types.js";
import type { TypeScriptObservationSidecar, TypeScriptSupportAssessment } from "./types.js";
export type TypeScriptAdapterInput = {
    readonly repoRoot: string;
    readonly observations: RepoObservations;
};
export type TypeScriptAdapterOutput = {
    readonly sidecar: TypeScriptObservationSidecar;
    readonly support: TypeScriptSupportAssessment;
};
export declare function produceTypeScriptObservations(input: TypeScriptAdapterInput): TypeScriptAdapterOutput;
