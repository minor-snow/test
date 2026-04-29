import { describe, it, expect } from "vitest";
import {
  classifyPackageImport,
  isNodeBuiltin,
  extractPackageName,
} from "../../src/repoObservation/packageDependencyClassifier.js";
import type { PackageManifestObservation } from "../../src/repoObservation/types.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const MANIFEST: PackageManifestObservation = {
  package_json_path: "package.json",
  package_name: "test-project",
  dependencies: ["express", "zod", "@prisma/client"],
  dev_dependencies: ["vitest", "typescript", "@types/node"],
  peer_dependencies: ["react"],
  optional_dependencies: ["fsevents"],
  evidence: [{ type: "config", source_path: "package.json", value: "package manifest" }],
};

describe("isNodeBuiltin", () => {
  it("recognizes node: prefix", () => {
    expect(isNodeBuiltin("node:fs")).toBe(true);
    expect(isNodeBuiltin("node:path")).toBe(true);
    expect(isNodeBuiltin("node:child_process")).toBe(true);
  });

  it("recognizes bare builtin names", () => {
    expect(isNodeBuiltin("fs")).toBe(true);
    expect(isNodeBuiltin("path")).toBe(true);
    expect(isNodeBuiltin("crypto")).toBe(true);
  });

  it("rejects non-builtins", () => {
    expect(isNodeBuiltin("express")).toBe(false);
    expect(isNodeBuiltin("lodash")).toBe(false);
    expect(isNodeBuiltin("./local")).toBe(false);
  });
});

describe("extractPackageName", () => {
  it("extracts bare package name", () => {
    expect(extractPackageName("lodash")).toBe("lodash");
    expect(extractPackageName("zod")).toBe("zod");
  });

  it("extracts package root from subpath", () => {
    expect(extractPackageName("lodash/fp")).toBe("lodash");
    expect(extractPackageName("express/lib/router")).toBe("express");
  });

  it("extracts scoped package", () => {
    expect(extractPackageName("@scope/pkg")).toBe("@scope/pkg");
    expect(extractPackageName("@prisma/client")).toBe("@prisma/client");
  });

  it("extracts scoped package from subpath", () => {
    expect(extractPackageName("@scope/pkg/subpath")).toBe("@scope/pkg");
    expect(extractPackageName("@prisma/client/runtime")).toBe("@prisma/client");
  });

  it("returns null for relative paths", () => {
    expect(extractPackageName("./foo")).toBeNull();
    expect(extractPackageName("../bar")).toBeNull();
  });

  it("returns null for node: prefix", () => {
    expect(extractPackageName("node:fs")).toBeNull();
  });
});

describe("classifyPackageImport", () => {
  it("classifies Node builtin as builtin_node_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "node:fs",
      packageManifests: [MANIFEST],
    })).toBe("builtin_node_package");
  });

  it("classifies bare builtin as builtin_node_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "path",
      packageManifests: [MANIFEST],
    })).toBe("builtin_node_package");
  });

  it("classifies declared dependency as declared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "express",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("classifies declared devDependency as declared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "vitest",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("classifies declared peerDependency as declared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "react",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("classifies declared optionalDependency as declared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "fsevents",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("classifies scoped declared package as declared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "@prisma/client",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("classifies scoped package subpath as declared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "@prisma/client/runtime",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("classifies package subpath as declared_package when root is declared", () => {
    expect(classifyPackageImport({
      rawSpecifier: "zod/lib/types",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("classifies undeclared package as undeclared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "some-random-pkg",
      packageManifests: [MANIFEST],
    })).toBe("undeclared_package");
  });

  it("classifies undeclared scoped package as undeclared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "@unknown/lib",
      packageManifests: [MANIFEST],
    })).toBe("undeclared_package");
  });

  it("classifies as unknown_package when no manifests", () => {
    expect(classifyPackageImport({
      rawSpecifier: "express",
      packageManifests: [],
    })).toBe("unknown_package");
  });

  it("declared @types/ devDependency is declared_package", () => {
    expect(classifyPackageImport({
      rawSpecifier: "@types/node",
      packageManifests: [MANIFEST],
    })).toBe("declared_package");
  });

  it("builtin takes priority over declared package", () => {
    // "path" is both a builtin and could hypothetically be declared
    expect(classifyPackageImport({
      rawSpecifier: "path",
      packageManifests: [MANIFEST],
    })).toBe("builtin_node_package");
  });
});
