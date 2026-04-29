/**
 * P15: Blast Radius Tests
 */

import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { buildBoundaryGraph } from "../../src/boundary/boundaryGraph.js";
import { computeBlastRadius } from "../../src/boundary/blastRadius.js";
import { generateKotlin } from "../../src/codegen/kotlinGenerator.js";
import type { ImplementationHandoffPackage } from "../../src/handoff/types.js";

const HANDOFF_PATH = join(
  process.cwd(), "data", "dogfood", "p10", "handoff", "handoff_package.json"
);

async function loadGraph() {
  const pkg: ImplementationHandoffPackage = JSON.parse(
    await fs.readFile(HANDOFF_PATH, "utf8")
  );
  const gen = generateKotlin(pkg);
  return buildBoundaryGraph(pkg, gen.files, gen.package_hash);
}

describe("blastRadius", () => {
  describe("single node", () => {
    it("arch block produces downstream impact", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001"],
      });

      expect(report.summary.valid_changed_nodes).toBe(1);
      expect(report.summary.total_downstream).toBeGreaterThan(0);
      expect(report.summary.affected_files).toBeGreaterThan(0);
      expect(report.summary.affected_tests).toBeGreaterThan(0);
      expect(report.by_layer.generated_files.length).toBeGreaterThan(0);
      expect(report.by_layer.tests.length).toBeGreaterThan(0);
    });

    it("handoff node produces narrower radius", async () => {
      const graph = await loadGraph();
      const archReport = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001"],
      });
      const handoffReport = computeBlastRadius(graph, {
        changed_nodes: ["hc:conflict_policy:patient_case_status"],
      });

      expect(handoffReport.summary.total_downstream).toBeLessThan(
        archReport.summary.total_downstream
      );
    });
  });

  describe("multiple nodes", () => {
    it("deduplicates downstream nodes", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_sync_001", "blk:arch:b_sync_003"],
      });

      // No duplicate file IDs
      const fileSet = new Set(report.by_layer.generated_files);
      expect(fileSet.size).toBe(report.by_layer.generated_files.length);
    });
  });

  describe("risk amplification", () => {
    it("detects high-risk conflict policy", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001"],
      });

      expect(report.summary.highest_risk_level).toBe("high");
      expect(report.risk_amplification.length).toBeGreaterThan(0);
      const highRisk = report.risk_amplification.filter(a => a.risk_level === "high");
      expect(highRisk.length).toBeGreaterThan(0);
    });

    it("detects forbidden assumption", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001"],
      });

      const faAmplifications = report.risk_amplification.filter(
        a => a.reason.includes("Forbidden assumption")
      );
      expect(faAmplifications.length).toBeGreaterThan(0);
    });
  });

  describe("critical paths", () => {
    it("includes shortest path to test", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001"],
      });

      expect(report.critical_paths.length).toBeGreaterThan(0);
      for (const cp of report.critical_paths) {
        expect(cp.nodes[0]).toBe("blk:arch:b_conflict_001");
        expect(cp.nodes[cp.nodes.length - 1]).toMatch(/^test:/);
        expect(cp.nodes.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("limits to MAX_CRITICAL_PATHS", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001"],
      });

      expect(report.critical_paths.length).toBeLessThanOrEqual(20);
    });
  });

  describe("edge cases", () => {
    it("empty input returns empty report", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, { changed_nodes: [] });

      expect(report.summary.valid_changed_nodes).toBe(0);
      expect(report.summary.total_downstream).toBe(0);
      expect(report.by_layer.generated_files).toHaveLength(0);
    });

    it("invalid node ID produces warning", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:nonexistent_block"],
      });

      expect(report.invalid_nodes).toContain("blk:arch:nonexistent_block");
      expect(report.warnings.length).toBeGreaterThan(0);
    });

    it("mix of valid and invalid nodes", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001", "blk:arch:nonexistent"],
      });

      expect(report.summary.valid_changed_nodes).toBe(1);
      expect(report.invalid_nodes).toContain("blk:arch:nonexistent");
      expect(report.summary.total_downstream).toBeGreaterThan(0);
    });
  });

  describe("markdown", () => {
    it("generates markdown report", async () => {
      const graph = await loadGraph();
      const report = computeBlastRadius(graph, {
        changed_nodes: ["blk:arch:b_conflict_001"],
        change_description: "Modify conflict resolution strategy",
      });

      expect(report.markdown).toContain("# Blast Radius Report");
      expect(report.markdown).toContain("b_conflict_001");
      expect(report.markdown).toContain("Modify conflict resolution strategy");
      expect(report.markdown).toContain("Risk Amplification");
    });
  });
});
