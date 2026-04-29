/**
 * P15: Blast Radius Engine
 *
 * Deterministic traversal over P14 boundary graph.
 * Given changed node IDs, computes downstream impact by layer,
 * risk amplification, and critical paths to test obligations.
 *
 * No LLM. No graph mutation. No intent parsing.
 *
 * ref: P15
 */
import type { BoundaryGraph } from "./boundaryTypes.js";
export type BlastRadiusRequest = {
    changed_nodes: string[];
    change_description?: string;
};
export type RiskAmplification = {
    node_id: string;
    label: string;
    risk_level: "low" | "medium" | "high";
    reason: string;
    source_path: string[];
    affected_tests: string[];
};
export type CriticalPath = {
    path_id: string;
    from: string;
    to: string;
    nodes: string[];
    risk_level: "low" | "medium" | "high";
    reason: string;
};
export type BlastRadiusReport = {
    request: BlastRadiusRequest;
    generated_at: string;
    graph_hash: string;
    warnings: string[];
    invalid_nodes: string[];
    summary: {
        changed_nodes: number;
        valid_changed_nodes: number;
        direct_impact: number;
        total_downstream: number;
        affected_files: number;
        affected_symbols: number;
        affected_tests: number;
        highest_risk_level: "low" | "medium" | "high";
        risk_amplification_count: number;
    };
    by_layer: {
        architecture: string[];
        interface: string[];
        module: string[];
        handoff: string[];
        generated_files: string[];
        generated_symbols: string[];
        tests: string[];
    };
    risk_amplification: RiskAmplification[];
    critical_paths: CriticalPath[];
    paths_truncated: boolean;
    total_critical_paths_found: number;
    markdown: string;
};
export declare function computeBlastRadius(graph: BoundaryGraph, request: BlastRadiusRequest): BlastRadiusReport;
