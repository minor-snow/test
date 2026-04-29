/**
 * P18.1: Gate Completeness Registry Tests
 *
 * Validates that the registry is internally consistent
 * and references real source files and test files.
 *
 * ref: P18.1
 */

import { describe, it, expect } from "vitest";
import { GATE_REGISTRY, getAllGateIds, getGateById, getGatesByPhase } from "../src/gateRegistry.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

describe("P18.1: Gate Completeness Registry", () => {
  // -------------------------------------------------------------------------
  // Structural integrity
  // -------------------------------------------------------------------------

  it("has exactly 14 gates registered", () => {
    expect(GATE_REGISTRY.length).toBe(14);
  });

  it("all gate_ids are unique", () => {
    const ids = getAllGateIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every gate has a non-empty gate_id", () => {
    for (const gate of GATE_REGISTRY) {
      expect(gate.gate_id.length).toBeGreaterThan(0);
    }
  });

  it("every gate has a non-empty gate_name", () => {
    for (const gate of GATE_REGISTRY) {
      expect(gate.gate_name.length).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // Source file references are real
  // -------------------------------------------------------------------------

  it("every source_file references an existing file", () => {
    for (const gate of GATE_REGISTRY) {
      const fullPath = join(ROOT, gate.source_file);
      expect(existsSync(fullPath), `${gate.gate_id}: ${gate.source_file} does not exist`).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Regression test references are real files
  // -------------------------------------------------------------------------

  it("every regression_test file exists", () => {
    const seen = new Set<string>();
    for (const gate of GATE_REGISTRY) {
      for (const rt of gate.regression_tests) {
        if (seen.has(rt.file)) continue;
        seen.add(rt.file);
        const fullPath = join(ROOT, rt.file);
        expect(existsSync(fullPath), `${gate.gate_id}: regression test file ${rt.file} does not exist`).toBe(true);
      }
    }
  });

  it("every regression_test has file + name", () => {
    for (const gate of GATE_REGISTRY) {
      expect(gate.regression_tests.length, `${gate.gate_id}: no regression tests`).toBeGreaterThan(0);
      for (const rt of gate.regression_tests) {
        expect(rt.file.length).toBeGreaterThan(0);
        expect(rt.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("every regression_test name exists in the referenced test file", () => {
    // Cache file contents to avoid re-reading the same file
    const fileCache = new Map<string, string>();
    const missing: string[] = [];

    for (const gate of GATE_REGISTRY) {
      for (const rt of gate.regression_tests) {
        const fullPath = join(ROOT, rt.file);
        if (!existsSync(fullPath)) continue; // covered by file-exists test

        let content = fileCache.get(fullPath);
        if (!content) {
          content = readFileSync(fullPath, "utf-8");
          fileCache.set(fullPath, content);
        }

        if (!content.includes(rt.name)) {
          missing.push(`${gate.gate_id}: "${rt.name}" not found in ${rt.file}`);
        }
      }
    }

    expect(missing, `Stale regression test references:\n${missing.join("\n")}`).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Fail-closed completeness
  // -------------------------------------------------------------------------

  it("every gate has at least 1 fail_closed_case", () => {
    for (const gate of GATE_REGISTRY) {
      expect(gate.fail_closed_cases.length, `${gate.gate_id}: no fail_closed_cases`).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // Field ownership completeness
  // -------------------------------------------------------------------------

  it("every gate has at least 1 primary_owned_field", () => {
    for (const gate of GATE_REGISTRY) {
      expect(gate.primary_owned_fields.length, `${gate.gate_id}: no primary_owned_fields`).toBeGreaterThan(0);
    }
  });

  it("every gate has at least 1 required_check", () => {
    for (const gate of GATE_REGISTRY) {
      expect(gate.required_checks.length, `${gate.gate_id}: no required_checks`).toBeGreaterThan(0);
    }
  });

  it("every gate has at least 1 known_non_goal", () => {
    for (const gate of GATE_REGISTRY) {
      expect(gate.known_non_goals.length, `${gate.gate_id}: no known_non_goals`).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // Lookup helpers
  // -------------------------------------------------------------------------

  it("getGateById returns correct gate", () => {
    const gate = getGateById("scope_diff_validator");
    expect(gate).toBeDefined();
    expect(gate!.phase_introduced).toBe("P18");
  });

  it("getGateById returns undefined for unknown", () => {
    expect(getGateById("nonexistent_gate")).toBeUndefined();
  });

  it("getGatesByPhase returns correct gates", () => {
    const p4Gates = getGatesByPhase("P4");
    expect(p4Gates.length).toBeGreaterThanOrEqual(3);
    expect(p4Gates.every(g => g.phase_introduced === "P4")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // No overlap in primary_owned_fields (detect orphan responsibility)
  // -------------------------------------------------------------------------

  it("no field is primary-owned by zero gates (known field check)", () => {
    // Key fields that MUST be owned by at least one gate
    const criticalFields = [
      "artifact.sections[].commitments[].content_hash",
      "artifact.sections[].commitments[].text",
      "report.status",
    ];
    for (const field of criticalFields) {
      const owners = GATE_REGISTRY.filter(g => g.primary_owned_fields.includes(field));
      expect(owners.length, `${field}: not owned by any gate`).toBeGreaterThan(0);
    }
  });

  // -------------------------------------------------------------------------
  // Phase coverage
  // -------------------------------------------------------------------------

  it("covers gates from P2 through P18", () => {
    const phases = new Set(GATE_REGISTRY.map(g => g.phase_introduced));
    expect(phases.has("P2")).toBe(true);
    expect(phases.has("P4")).toBe(true);
    expect(phases.has("P8")).toBe(true);
    expect(phases.has("P18")).toBe(true);
  });
});
