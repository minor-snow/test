/**
 * P25a: Python Unknown Taxonomy Tests
 */

import { describe, it, expect } from "vitest";
import { buildPythonUnknownTaxonomy } from "../../../src/repoObservation/python/pythonUnknownTaxonomy.js";
import type { PythonObservedFile, PythonImportObservation, PythonDependencyManifest, PythonTestMapping } from "../../../src/repoObservation/python/types.js";

describe("pythonUnknownTaxonomy", () => {
  const baseFiles: PythonObservedFile[] = [
    { path: "saleor/checkout/actions.py", bucket: "source", extension: ".py", size_bytes: 100, evidence: [] },
    { path: "unknown.py", bucket: "unknown", extension: ".py", size_bytes: 50, evidence: [] },
    { path: "analysis.ipynb", bucket: "notebook", extension: ".ipynb", size_bytes: 1000, evidence: [] },
    { path: "ext/fast.pyx", bucket: "unsupported", extension: ".pyx", size_bytes: 500, evidence: [] },
  ];

  const baseImports: PythonImportObservation[] = [
    { from_file: "a.py", raw_specifier: "__import__('x')", import_kind: "dynamic_import", status: "dynamic_or_unresolved", top_level_module: "x", confidence: "low" },
  ];

  const baseManifests: PythonDependencyManifest[] = [
    { source_path: "setup.py", source_type: "setup.py", packages: [], dev_packages: [], confidence: "low", warnings: ["weak"] },
  ];

  const baseMappings: PythonTestMapping[] = [
    { source_path: "saleor/orphan.py", candidate_test_paths: [], existing_test_paths: [], confidence: "unknown", reason: "no test" },
  ];

  it("classifies unclassified files as actionable", () => {
    const unknowns = buildPythonUnknownTaxonomy({ files: baseFiles, imports: [], manifests: [], testMappings: [] });
    const unclassified = unknowns.find(u => u.category === "unclassified_python_file");
    expect(unclassified).toBeDefined();
    expect(unclassified!.classification).toBe("actionable");
    expect(unclassified!.paths).toContain("unknown.py");
  });

  it("classifies dynamic imports as intrinsic", () => {
    const unknowns = buildPythonUnknownTaxonomy({ files: [], imports: baseImports, manifests: [], testMappings: [] });
    const dynamic = unknowns.find(u => u.category === "dynamic_or_unresolved_import");
    expect(dynamic).toBeDefined();
    expect(dynamic!.classification).toBe("intrinsic");
  });

  it("classifies unsupported artifacts as out_of_scope", () => {
    const unknowns = buildPythonUnknownTaxonomy({ files: baseFiles, imports: [], manifests: [], testMappings: [] });
    const unsupported = unknowns.find(u => u.category === "unsupported_python_artifact");
    expect(unsupported).toBeDefined();
    expect(unsupported!.classification).toBe("out_of_scope");
    expect(unsupported!.count).toBe(2); // .ipynb + .pyx
  });

  it("classifies low confidence manifests as actionable", () => {
    const unknowns = buildPythonUnknownTaxonomy({ files: [], imports: [], manifests: baseManifests, testMappings: [] });
    const lowConf = unknowns.find(u => u.category === "low_confidence_manifest");
    expect(lowConf).toBeDefined();
    expect(lowConf!.classification).toBe("actionable");
  });

  it("classifies test mapping unknowns as actionable", () => {
    const unknowns = buildPythonUnknownTaxonomy({ files: [], imports: [], manifests: [], testMappings: baseMappings });
    const mapping = unknowns.find(u => u.category === "test_mapping_unknown");
    expect(mapping).toBeDefined();
    expect(mapping!.classification).toBe("actionable");
  });

  it("always includes scope_granularity_limit", () => {
    const unknowns = buildPythonUnknownTaxonomy({ files: [], imports: [], manifests: [], testMappings: [] });
    const scope = unknowns.find(u => u.category === "scope_granularity_limit");
    expect(scope).toBeDefined();
    expect(scope!.classification).toBe("intrinsic");
  });

  it("produces all categories for comprehensive input", () => {
    const unknowns = buildPythonUnknownTaxonomy({ files: baseFiles, imports: baseImports, manifests: baseManifests, testMappings: baseMappings });
    const categories = unknowns.map(u => u.category);
    expect(categories).toContain("unclassified_python_file");
    expect(categories).toContain("dynamic_or_unresolved_import");
    expect(categories).toContain("unsupported_python_artifact");
    expect(categories).toContain("low_confidence_manifest");
    expect(categories).toContain("test_mapping_unknown");
    expect(categories).toContain("scope_granularity_limit");
  });
});
