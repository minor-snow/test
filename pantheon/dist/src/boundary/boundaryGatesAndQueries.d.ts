/**
 * P14c: Boundary Consistency Gates (6 gates)
 * P14d: Boundary Queries (downstream, upstream, blast radius seeds)
 *
 * ref: P14c, P14d
 */
import type { BoundaryGraph, BoundaryNode } from "./boundaryTypes.js";
export type GateSeverity = "critical" | "warning" | "info";
export type GateResult = {
    gate_id: string;
    gate_name: string;
    status: "pass" | "warning" | "fail";
    severity: GateSeverity;
    covered: number;
    total: number;
    critical_failures: Array<{
        node_id: string;
        message: string;
    }>;
    warnings: Array<{
        node_id: string;
        message: string;
    }>;
};
export declare function gateArchToInterface(graph: BoundaryGraph): GateResult;
export declare function gateInterfaceToModule(graph: BoundaryGraph): GateResult;
export declare function gateModuleToHandoff(graph: BoundaryGraph): GateResult;
export declare function gateHandoffToGenerated(graph: BoundaryGraph): GateResult;
export declare function gateRiskAndFATestCoverage(graph: BoundaryGraph): GateResult;
export declare function gateGeneratedProvenance(graph: BoundaryGraph): GateResult;
export declare function runAllGates(graph: BoundaryGraph): GateResult[];
/** BFS downstream from a node */
export declare function queryDownstream(graph: BoundaryGraph, nodeId: string): BoundaryNode[];
/** BFS upstream from a node */
export declare function queryUpstream(graph: BoundaryGraph, nodeId: string): BoundaryNode[];
/** Blast radius seeds: given node IDs, return grouped downstream impact */
export declare function queryBlastRadiusSeeds(graph: BoundaryGraph, nodeIds: string[]): {
    direct: BoundaryNode[];
    downstream: BoundaryNode[];
    generated_files: BoundaryNode[];
    generated_symbols: BoundaryNode[];
    tests: BoundaryNode[];
};
