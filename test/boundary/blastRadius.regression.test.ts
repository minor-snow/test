/**
 * P18.5-C: BlastRadius Regression Tests
 *
 * Uses the self-contained regression fixture to verify blast radius
 * computation stability. Does not depend on real handoff packages.
 *
 * ref: P18.5-C
 */

import { describe, it, expect } from "vitest";
import { buildRegressionGraph } from "../fixtures/governance/boundaryGraphRegressionFixture.js";
import { computeBlastRadius } from "../../src/boundary/blastRadius.js";

describe("P18.5-C: BlastRadius Regression — Fixture-based", () => {
  const graph = buildRegressionGraph();

  it("arch node change produces downstream impact to test layer", () => {
    const report = computeBlastRadius(graph, {
      changed_nodes: ["blk:arch:reg_arch_a"],
    });

    expect(report.summary.valid_changed_nodes).toBe(1);
    expect(report.summary.total_downstream).toBeGreaterThan(0);
    expect(report.summary.affected_tests).toBeGreaterThan(0);
  });

  it("handoff node change produces narrower radius than arch node", () => {
    const archReport = computeBlastRadius(graph, {
      changed_nodes: ["blk:arch:reg_arch_a"],
    });
    const handoffReport = computeBlastRadius(graph, {
      changed_nodes: ["hc:contract_definition:reg_handoff_h"],
    });

    expect(handoffReport.summary.total_downstream).toBeLessThanOrEqual(
      archReport.summary.total_downstream,
    );
  });

  it("generated file node change has very narrow radius", () => {
    const report = computeBlastRadius(graph, {
      changed_nodes: ["file:RegGenerated.kt"],
    });

    expect(report.summary.valid_changed_nodes).toBe(1);
    // Should reach symbol and test, but not upstream
    expect(report.summary.total_downstream).toBeLessThanOrEqual(3);
  });

  it("empty input returns empty report", () => {
    const report = computeBlastRadius(graph, { changed_nodes: [] });
    expect(report.summary.valid_changed_nodes).toBe(0);
    expect(report.summary.total_downstream).toBe(0);
  });

  it("invalid node ID produces warning", () => {
    const report = computeBlastRadius(graph, {
      changed_nodes: ["blk:arch:nonexistent_regression_node"],
    });

    expect(report.invalid_nodes).toContain("blk:arch:nonexistent_regression_node");
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it("blast radius summary is stable across repeated computations", () => {
    const report1 = computeBlastRadius(graph, {
      changed_nodes: ["blk:arch:reg_arch_a"],
    });
    const report2 = computeBlastRadius(graph, {
      changed_nodes: ["blk:arch:reg_arch_a"],
    });

    expect(report1.summary.valid_changed_nodes).toBe(report2.summary.valid_changed_nodes);
    expect(report1.summary.total_downstream).toBe(report2.summary.total_downstream);
    expect(report1.summary.affected_files).toBe(report2.summary.affected_files);
    expect(report1.summary.affected_tests).toBe(report2.summary.affected_tests);
  });
});
