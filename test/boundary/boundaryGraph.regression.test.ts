/**
 * P18.5-C: BoundaryGraph Regression Tests
 *
 * Uses a self-contained fixture to verify graph structure stability.
 * If the boundary graph logic changes, these tests catch silent degradation.
 *
 * ref: P18.5-C
 */

import { describe, it, expect } from "vitest";
import {
  buildRegressionGraph,
  REGRESSION_EXPECTED_SUMMARY,
} from "../fixtures/governance/boundaryGraphRegressionFixture.js";
import type { BoundaryNode, BoundaryEdge } from "../../src/boundary/boundaryTypes.js";

describe("P18.5-C: BoundaryGraph Regression — Structure", () => {
  const graph = buildRegressionGraph();

  it("has expected node count", () => {
    expect(graph.stats.node_count).toBe(REGRESSION_EXPECTED_SUMMARY.node_count);
  });

  it("has expected edge count", () => {
    expect(graph.stats.edge_count).toBe(REGRESSION_EXPECTED_SUMMARY.edge_count);
  });

  it("covers all expected layers", () => {
    const layers = new Set(graph.nodes.map((n: BoundaryNode) => n.layer));
    for (const expected of REGRESSION_EXPECTED_SUMMARY.layers) {
      expect(layers.has(expected), `missing layer: ${expected}`).toBe(true);
    }
  });

  it("has expected critical node count", () => {
    const criticalCount = graph.nodes.filter((n: BoundaryNode) => n.critical).length;
    expect(criticalCount).toBe(REGRESSION_EXPECTED_SUMMARY.critical_node_count);
  });

  it("indexes by_kind are populated", () => {
    expect(Object.keys(graph.indexes.by_kind).length).toBeGreaterThan(0);
    for (const [kind, nodeIds] of Object.entries(graph.indexes.by_kind)) {
      expect((nodeIds as string[]).length, `by_kind[${kind}] is empty`).toBeGreaterThan(0);
    }
  });

  it("indexes by_layer are populated", () => {
    expect(Object.keys(graph.indexes.by_layer).length).toBeGreaterThan(0);
  });

  it("no duplicate node IDs", () => {
    const ids = graph.nodes.map((n: BoundaryNode) => n.node_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no duplicate edge IDs", () => {
    const ids = graph.edges.map((e: BoundaryEdge) => e.edge_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all edge endpoints reference existing nodes", () => {
    const nodeIds = new Set(graph.nodes.map((n: BoundaryNode) => n.node_id));
    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.from), `edge ${edge.edge_id}: from ${edge.from} not in nodes`).toBe(true);
      expect(nodeIds.has(edge.to), `edge ${edge.edge_id}: to ${edge.to} not in nodes`).toBe(true);
    }
  });

  it("no orphan critical nodes", () => {
    expect(graph.stats.orphan_critical_nodes).toHaveLength(0);
  });
});

describe("P18.5-C: BoundaryGraph Regression — Traversal", () => {
  const graph = buildRegressionGraph();

  it("architecture node can reach test node via edges", () => {
    const archNode = "blk:arch:reg_arch_a";
    const testNode = "test:policy:reg_test_t";

    // BFS traversal
    const adjacency = new Map<string, string[]>();
    for (const edge of graph.edges) {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      adjacency.get(edge.from)!.push(edge.to);
    }

    const visited = new Set<string>();
    const queue = [archNode];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = adjacency.get(current) ?? [];
      queue.push(...neighbors);
    }

    expect(visited.has(testNode), "arch node cannot reach test node").toBe(true);
  });

  it("module_m2 connects to module_m1 via implements edge", () => {
    const implEdge = graph.edges.find(
      (e: BoundaryEdge) => e.from === "blk:mod:reg_mod_m2" && e.to === "blk:mod:reg_mod_m1"
    );
    expect(implEdge).toBeDefined();
    expect(implEdge!.edge_type).toBe("implements");
  });

  it("generated file is downstream of handoff", () => {
    const edge = graph.edges.find(
      (e: BoundaryEdge) => e.from.startsWith("hc:") && e.to.startsWith("file:")
    );
    expect(edge).toBeDefined();
    expect(edge!.edge_type).toBe("handoff_to_generated_file");
  });
});

describe("P18.5-C: BoundaryGraph Regression — Canonical Summary Stability", () => {
  const graph = buildRegressionGraph();

  it("canonical summary matches expected snapshot", () => {
    const layers = [...new Set(graph.nodes.map((n: BoundaryNode) => n.layer))].sort();
    const criticalCount = graph.nodes.filter((n: BoundaryNode) => n.critical).length;

    // BFS to check path existence
    const adjacency = new Map<string, string[]>();
    for (const edge of graph.edges) {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      adjacency.get(edge.from)!.push(edge.to);
    }

    const visited = new Set<string>();
    const queue = ["blk:arch:reg_arch_a"];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = adjacency.get(current) ?? [];
      queue.push(...neighbors);
    }
    const archToTestExists = visited.has("test:policy:reg_test_t");

    const summary = {
      node_count: graph.stats.node_count,
      edge_count: graph.stats.edge_count,
      layers,
      critical_node_count: criticalCount,
      arch_to_test_path_exists: archToTestExists,
    };

    expect(summary.node_count).toBe(REGRESSION_EXPECTED_SUMMARY.node_count);
    expect(summary.edge_count).toBe(REGRESSION_EXPECTED_SUMMARY.edge_count);
    expect(summary.layers).toEqual([...REGRESSION_EXPECTED_SUMMARY.layers].sort());
    expect(summary.critical_node_count).toBe(REGRESSION_EXPECTED_SUMMARY.critical_node_count);
    expect(summary.arch_to_test_path_exists).toBe(REGRESSION_EXPECTED_SUMMARY.arch_to_test_path_exists);
  });
});
