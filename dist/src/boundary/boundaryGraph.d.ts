/**
 * P14a: Boundary Graph Builder
 *
 * Builds a BoundaryGraph from handoff_package.json and generated file list.
 * All provenance is derived — no new truth created.
 *
 * ref: P14a
 */
import type { ImplementationHandoffPackage } from "../handoff/types.js";
import type { BoundaryGraph } from "./boundaryTypes.js";
export declare function buildBoundaryGraph(pkg: ImplementationHandoffPackage, generatedFiles: Array<{
    fileName: string;
}>, packageHash: string): BoundaryGraph;
