/**
 * P14c: Boundary Consistency Gates (6 gates)
 * P14d: Boundary Queries (downstream, upstream, blast radius seeds)
 *
 * ref: P14c, P14d
 */

import type { BoundaryGraph, BoundaryNode } from "./boundaryTypes.js";
import type { ImplementationHandoffPackage } from "../handoff/types.js";

// ---------------------------------------------------------------------------
// Gate result
// ---------------------------------------------------------------------------

export type GateSeverity = "critical" | "warning" | "info";

export type GateResult = {
  gate_id: string;
  gate_name: string;
  status: "pass" | "warning" | "fail";
  severity: GateSeverity;
  covered: number;
  total: number;
  critical_failures: Array<{ node_id: string; message: string }>;
  warnings: Array<{ node_id: string; message: string }>;
};

// ---------------------------------------------------------------------------
// Helper: has downstream edge of given types
// ---------------------------------------------------------------------------

function hasDownstreamOfType(graph: BoundaryGraph, nodeId: string, types: string[]): boolean {
  return graph.edges.some(e => e.from === nodeId && types.includes(e.edge_type));
}

function hasUpstreamOfType(graph: BoundaryGraph, nodeId: string, types: string[]): boolean {
  return graph.edges.some(e => e.to === nodeId && types.includes(e.edge_type));
}

// ---------------------------------------------------------------------------
// Gate 1: Interface-relevant architecture coverage
// ---------------------------------------------------------------------------

export function gateArchToInterface(graph: BoundaryGraph): GateResult {
  const archNodes = graph.nodes.filter(n => n.kind === "architecture_block");
  const failures: GateResult["critical_failures"] = [];
  const warns: GateResult["warnings"] = [];

  for (const n of archNodes) {
    const hasDown = hasDownstreamOfType(graph, n.node_id, ["source_block_to_handoff"]);
    if (!hasDown) {
      if (n.critical) failures.push({ node_id: n.node_id, message: "Critical arch block has no downstream" });
      else warns.push({ node_id: n.node_id, message: "Non-critical arch block has no downstream" });
    }
  }

  return {
    gate_id: "interface_relevant_architecture_coverage",
    gate_name: "Interface-relevant architecture coverage",
    status: failures.length > 0 ? "fail" : warns.length > 0 ? "warning" : "pass",
    severity: "warning",
    covered: archNodes.length - failures.length - warns.length,
    total: archNodes.length,
    critical_failures: failures,
    warnings: warns,
  };
}

// ---------------------------------------------------------------------------
// Gate 2: Implementation-relevant interface coverage
// ---------------------------------------------------------------------------

export function gateInterfaceToModule(graph: BoundaryGraph): GateResult {
  const ifaceNodes = graph.nodes.filter(n => n.kind === "interface_block");
  const failures: GateResult["critical_failures"] = [];
  const warns: GateResult["warnings"] = [];

  for (const n of ifaceNodes) {
    const hasDown = hasDownstreamOfType(graph, n.node_id, ["source_block_to_handoff"]);
    if (!hasDown) {
      if (n.critical) failures.push({ node_id: n.node_id, message: "Critical iface block has no downstream" });
      else warns.push({ node_id: n.node_id, message: "Non-critical iface block has no downstream" });
    }
  }

  return {
    gate_id: "implementation_relevant_interface_coverage",
    gate_name: "Implementation-relevant interface coverage",
    status: failures.length > 0 ? "fail" : warns.length > 0 ? "warning" : "pass",
    severity: "warning",
    covered: ifaceNodes.length - failures.length - warns.length,
    total: ifaceNodes.length,
    critical_failures: failures,
    warnings: warns,
  };
}

// ---------------------------------------------------------------------------
// Gate 3: Module to handoff coverage
// ---------------------------------------------------------------------------

export function gateModuleToHandoff(graph: BoundaryGraph): GateResult {
  const modNodes = graph.nodes.filter(n => n.kind === "module_block");
  const failures: GateResult["critical_failures"] = [];

  for (const n of modNodes) {
    const hasDown = hasDownstreamOfType(graph, n.node_id, ["source_block_to_handoff"]);
    if (!hasDown) {
      failures.push({ node_id: n.node_id, message: "Module block has no handoff downstream" });
    }
  }

  return {
    gate_id: "module_to_handoff_coverage",
    gate_name: "Module to handoff contract coverage",
    status: failures.length > 0 ? "fail" : "pass",
    severity: "warning",
    covered: modNodes.length - failures.length,
    total: modNodes.length,
    critical_failures: failures,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Gate 4: Handoff to generated coverage
// ---------------------------------------------------------------------------

const GENERATIVE_KINDS = new Set(["data_model", "state_machine", "conflict_policy", "forbidden_assumption"]);

export function gateHandoffToGenerated(graph: BoundaryGraph): GateResult {
  const criticalHandoff = graph.nodes.filter(n => n.layer === "handoff" && n.critical && GENERATIVE_KINDS.has(n.kind));
  const failures: GateResult["critical_failures"] = [];

  for (const n of criticalHandoff) {
    const hasDown = hasDownstreamOfType(graph, n.node_id, [
      "handoff_to_generated_file", "enforces", "implements", "symbol_to_test",
    ]);
    if (!hasDown) {
      failures.push({ node_id: n.node_id, message: "Critical handoff node has no generated coverage" });
    }
  }

  return {
    gate_id: "handoff_to_generated_coverage",
    gate_name: "Handoff contract to generated artifact coverage",
    status: failures.length > 0 ? "fail" : "pass",
    severity: "critical",
    covered: criticalHandoff.length - failures.length,
    total: criticalHandoff.length,
    critical_failures: failures,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Gate 5: High-risk policy + FA test coverage
// ---------------------------------------------------------------------------

export function gateRiskAndFATestCoverage(graph: BoundaryGraph): GateResult {
  // Only check: high-risk conflict policies (those with test:policy: nodes) + all forbidden assumptions
  const testPolicyIds = new Set(
    graph.nodes.filter(n => n.node_id.startsWith("test:policy:")).map(n => {
      // test:policy:X → hc:conflict_policy:X
      const field = n.node_id.replace("test:policy:", "");
      return `hc:conflict_policy:${field}`;
    })
  );
  const highRisk = graph.nodes.filter(n =>
    (n.kind === "forbidden_assumption" && n.critical) ||
    (n.kind === "conflict_policy" && testPolicyIds.has(n.node_id))
  );
  const failures: GateResult["critical_failures"] = [];

  for (const n of highRisk) {
    const hasTest = hasDownstreamOfType(graph, n.node_id, ["symbol_to_test", "enforces"]);
    if (!hasTest) {
      failures.push({ node_id: n.node_id, message: "High-risk/FA node has no test/enforcement" });
    }
  }

  return {
    gate_id: "risk_and_forbidden_test_coverage",
    gate_name: "High-risk policy and forbidden assumption test/enforcement coverage",
    status: failures.length > 0 ? "fail" : "pass",
    severity: "critical",
    covered: highRisk.length - failures.length,
    total: highRisk.length,
    critical_failures: failures,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Gate 6: Generated provenance coverage (reverse)
// ---------------------------------------------------------------------------

export function gateGeneratedProvenance(graph: BoundaryGraph): GateResult {
  const criticalGenFiles = graph.nodes.filter(n => n.kind === "generated_file" && n.critical);
  const failures: GateResult["critical_failures"] = [];

  for (const n of criticalGenFiles) {
    const hasUp = hasUpstreamOfType(graph, n.node_id, [
      "handoff_to_generated_file", "enforces", "implements",
    ]);
    if (!hasUp) {
      failures.push({ node_id: n.node_id, message: "Critical generated file has no upstream provenance" });
    }
  }

  return {
    gate_id: "generated_provenance_coverage",
    gate_name: "Generated file reverse provenance coverage",
    status: failures.length > 0 ? "fail" : "pass",
    severity: "critical",
    covered: criticalGenFiles.length - failures.length,
    total: criticalGenFiles.length,
    critical_failures: failures,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Run all gates
// ---------------------------------------------------------------------------

export function runAllGates(graph: BoundaryGraph): GateResult[] {
  return [
    gateArchToInterface(graph),
    gateInterfaceToModule(graph),
    gateModuleToHandoff(graph),
    gateHandoffToGenerated(graph),
    gateRiskAndFATestCoverage(graph),
    gateGeneratedProvenance(graph),
  ];
}

// ---------------------------------------------------------------------------
// P14d: Queries
// ---------------------------------------------------------------------------

/** BFS downstream from a node */
export function queryDownstream(graph: BoundaryGraph, nodeId: string): BoundaryNode[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of graph.edges) {
      if (e.from === current && !visited.has(e.to)) queue.push(e.to);
    }
  }
  visited.delete(nodeId);
  return graph.nodes.filter(n => visited.has(n.node_id));
}

/** BFS upstream from a node */
export function queryUpstream(graph: BoundaryGraph, nodeId: string): BoundaryNode[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of graph.edges) {
      if (e.to === current && !visited.has(e.from)) queue.push(e.from);
    }
  }
  visited.delete(nodeId);
  return graph.nodes.filter(n => visited.has(n.node_id));
}

/** Blast radius seeds: given node IDs, return grouped downstream impact */
export function queryBlastRadiusSeeds(
  graph: BoundaryGraph,
  nodeIds: string[],
): {
  direct: BoundaryNode[];
  downstream: BoundaryNode[];
  generated_files: BoundaryNode[];
  generated_symbols: BoundaryNode[];
  tests: BoundaryNode[];
} {
  // Direct: immediate neighbors
  const directIds = new Set<string>();
  for (const id of nodeIds) {
    for (const e of graph.edges) {
      if (e.from === id) directIds.add(e.to);
    }
  }

  // Full downstream
  const allDown = new Set<string>();
  for (const id of nodeIds) {
    for (const n of queryDownstream(graph, id)) allDown.add(n.node_id);
  }

  const downstream = graph.nodes.filter(n => allDown.has(n.node_id));

  return {
    direct: graph.nodes.filter(n => directIds.has(n.node_id)),
    downstream,
    generated_files: downstream.filter(n => n.kind === "generated_file"),
    generated_symbols: downstream.filter(n => n.kind === "generated_symbol"),
    tests: downstream.filter(n => n.kind === "test_obligation"),
  };
}
