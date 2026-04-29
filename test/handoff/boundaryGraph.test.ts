/**
 * P14: Boundary Graph Tests (v2 — uses src/boundary/)
 */

import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { buildBoundaryGraph } from "../../src/boundary/boundaryGraph.js";
import {
  runAllGates,
  gateHandoffToGenerated,
  gateRiskAndFATestCoverage,
  gateGeneratedProvenance,
  queryDownstream,
  queryUpstream,
  queryBlastRadiusSeeds,
} from "../../src/boundary/boundaryGatesAndQueries.js";
import { generateKotlin } from "../../src/codegen/kotlinGenerator.js";
import type { ImplementationHandoffPackage } from "../../src/handoff/types.js";

const HANDOFF_PATH = join(
  process.cwd(), "data", "dogfood", "p10", "handoff", "handoff_package.json"
);

async function loadPackage(): Promise<ImplementationHandoffPackage> {
  return JSON.parse(await fs.readFile(HANDOFF_PATH, "utf8"));
}

describe("boundaryGraph v2", () => {
  describe("graph construction", () => {
    it("builds graph with namespaced IDs", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      expect(graph.stats.node_count).toBeGreaterThan(0);
      expect(graph.stats.edge_count).toBeGreaterThan(0);
      expect(graph.handoff_package_hash).toBe(gen.package_hash);
      // Namespaced IDs
      expect(graph.nodes.some(n => n.node_id.startsWith("blk:arch:"))).toBe(true);
      expect(graph.nodes.some(n => n.node_id.startsWith("blk:iface:"))).toBe(true);
      expect(graph.nodes.some(n => n.node_id.startsWith("blk:mod:"))).toBe(true);
      expect(graph.nodes.some(n => n.node_id.startsWith("hc:"))).toBe(true);
      expect(graph.nodes.some(n => n.node_id.startsWith("file:"))).toBe(true);
      expect(graph.nodes.some(n => n.node_id.startsWith("sym:"))).toBe(true);
      expect(graph.nodes.some(n => n.node_id.startsWith("test:"))).toBe(true);
    });

    it("has nodes for all 6 layers", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const layers = new Set(graph.nodes.map(n => n.layer));
      expect(layers.size).toBe(6);
      for (const l of ["architecture", "interface", "module", "handoff", "generated", "test"]) {
        expect(layers).toContain(l);
      }
    });

    it("has 12 generated file nodes", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const genFiles = graph.nodes.filter(n => n.kind === "generated_file");
      expect(genFiles).toHaveLength(12);
    });

    it("has critical flags on nodes", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      // All data models are critical
      const dataModels = graph.nodes.filter(n => n.kind === "data_model");
      for (const dm of dataModels) expect(dm.critical).toBe(true);
      // Entities.kt is critical
      const entities = graph.nodes.find(n => n.node_id === "file:Entities.kt");
      expect(entities?.critical).toBe(true);
    });

    it("has edge IDs", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      for (const e of graph.edges) {
        expect(e.edge_id).toMatch(/^e_\d+$/);
      }
    });

    it("indexes are populated", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      expect(Object.keys(graph.indexes.by_kind).length).toBeGreaterThan(0);
      expect(Object.keys(graph.indexes.by_layer).length).toBe(6);
      expect(Object.keys(graph.indexes.by_source_block).length).toBeGreaterThan(0);
    });

    it("is deterministic", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const g1 = buildBoundaryGraph(pkg, gen.files, gen.package_hash);
      const g2 = buildBoundaryGraph(pkg, gen.files, gen.package_hash);
      expect(g1.stats.node_count).toBe(g2.stats.node_count);
      expect(g1.stats.edge_count).toBe(g2.stats.edge_count);
    });

    it("no critical orphan nodes", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);
      expect(graph.stats.orphan_critical_nodes).toHaveLength(0);
    });
  });

  describe("queries", () => {
    it("queryDownstream(blk:arch:b_conflict_001) returns generated files", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const down = queryDownstream(graph, "blk:arch:b_conflict_001");
      expect(down.length).toBeGreaterThan(0);
      const genFiles = down.filter(n => n.kind === "generated_file");
      expect(genFiles.length).toBeGreaterThan(0);
    });

    it("queryUpstream(file:contracts/Guards.kt) returns source blocks", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const up = queryUpstream(graph, "file:contracts/Guards.kt");
      expect(up.length).toBeGreaterThan(0);
      const archNodes = up.filter(n => n.layer === "architecture");
      expect(archNodes.length).toBeGreaterThan(0);
    });

    it("queryDownstream reaches test layer", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const down = queryDownstream(graph, "blk:arch:b_conflict_001");
      const tests = down.filter(n => n.layer === "test");
      expect(tests.length).toBeGreaterThan(0);
    });

    it("queryBlastRadiusSeeds groups results", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const blast = queryBlastRadiusSeeds(graph, ["blk:arch:b_sync_001"]);
      expect(blast.direct.length).toBeGreaterThan(0);
      expect(blast.downstream.length).toBeGreaterThan(0);
      expect(blast.generated_files.length).toBeGreaterThan(0);
    });
  });

  describe("consistency gates", () => {
    it("runs all 6 gates", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const results = runAllGates(graph);
      expect(results).toHaveLength(6);
    });

    it("gate 4 (handoff→generated) critical and passes", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const result = gateHandoffToGenerated(graph);
      expect(result.severity).toBe("critical");
      expect(result.status).toBe("pass");
    });

    it("gate 5 (risk+FA→test) critical and passes", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const result = gateRiskAndFATestCoverage(graph);
      expect(result.severity).toBe("critical");
      expect(result.status).toBe("pass");
    });

    it("gate 6 (reverse provenance) critical and passes", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const result = gateGeneratedProvenance(graph);
      expect(result.severity).toBe("critical");
      expect(result.status).toBe("pass");
    });

    it("no critical gate failures", async () => {
      const pkg = await loadPackage();
      const gen = generateKotlin(pkg);
      const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);

      const results = runAllGates(graph);
      const criticalFails = results.filter(r => r.status === "fail" && r.severity === "critical");
      expect(criticalFails).toHaveLength(0);
    });
  });
});
