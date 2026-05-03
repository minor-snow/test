/**
 * P17a: Scoped Handoff Exporter
 *
 * Reads blast radius report + boundary graph + handoff package,
 * produces a ScopedImplementationBoundaryPackage.
 *
 * Tightening points applied:
 * 1. enforced_by: heuristic downstream match, labeled with enforcement_source
 * 2. forbidden_files: .pantheon/** .cursor/** hardcoded, project-specific from input
 * 3. handoff reference-only (no subset dump)
 *
 * ref: P17
 */
import type { BoundaryGraph } from "../boundary/boundaryTypes.js";
import type { BlastRadiusReport } from "../boundary/blastRadius.js";
import type { ScopedImplementationBoundaryPackage, HandoffReference, ScopedHandoffInput } from "./types.js";
export declare function buildScopedImplementationBoundaryPackage(input: {
    handoffPackageHash: string;
    boundaryGraph: BoundaryGraph;
    blastRadiusReport: BlastRadiusReport;
    options: ScopedHandoffInput;
}): ScopedImplementationBoundaryPackage;
export declare function buildHandoffReference(handoffPackageHash: string, handoffPackagePath: string, report: BlastRadiusReport, graph: BoundaryGraph): HandoffReference;
