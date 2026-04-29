/**
 * P25a.1: Python Observation Enhancer — Integration Tests
 *
 * Tests the full pipeline: RepoObservations → enhanceWithPythonObservations → PythonObservationSidecar.
 * Uses a synthetic Python fixture to cover all signal types.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { scanRepo } from "../../../src/repoObservation/repoScanner.js";
import { enhanceWithPythonObservations } from "../../../src/repoObservation/python/pythonObservationEnhancer.js";
import type { PythonObservationConfig } from "../../../src/repoObservation/python/types.js";
import { loadRepoObservationConfig } from "../../../src/repoObservation/repoObservationConfigLoader.js";
import { isPythonEcosystemFile, isPythonSourceExtension, isPythonRelevantFile, hasPythonSignals, isPythonManifestFile } from "../../../src/repoObservation/python/pythonEcosystemPatterns.js";

// ---------------------------------------------------------------------------
// Synthetic Python fixture
// ---------------------------------------------------------------------------

const FIXTURE_ROOT = join(import.meta.dirname ?? __dirname, "__py_fixture__");

function ensureFixture() {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });

  const dirs = [
    "myapp",
    "myapp/checkout",
    "myapp/checkout/tests",
    "myapp/payment",
    "myapp/payment/tests",
    "myapp/core",
    "myapp/plugins",
    "tests",
    ".git",
  ];

  for (const d of dirs) mkdirSync(join(FIXTURE_ROOT, d), { recursive: true });

  // __init__.py files
  for (const d of ["myapp", "myapp/checkout", "myapp/payment", "myapp/core", "myapp/plugins", "myapp/checkout/tests", "myapp/payment/tests"]) {
    writeFileSync(join(FIXTURE_ROOT, d, "__init__.py"), "");
  }

  // Source files with imports
  writeFileSync(join(FIXTURE_ROOT, "myapp/checkout/actions.py"), `
import os
import sys
from django.db import models
from .models import Checkout
from ..core import permissions
from myapp.payment import gateway
import celery
__import__("dynamic_module")
from myapp.checkout import (
    utils,
    helpers,
)
`);

  writeFileSync(join(FIXTURE_ROOT, "myapp/payment/gateway.py"), `
import os
from django.conf import settings
from myapp.core import permissions
from .models import Payment
import requests
`);

  writeFileSync(join(FIXTURE_ROOT, "myapp/core/permissions.py"), `
from django.contrib.auth import models as auth_models
`);

  writeFileSync(join(FIXTURE_ROOT, "myapp/plugins/manager.py"), `
import importlib
importlib.import_module("myapp.plugins.stripe")
`);

  // Test files
  writeFileSync(join(FIXTURE_ROOT, "myapp/checkout/tests/test_actions.py"), `
from myapp.checkout.actions import process_checkout
def test_checkout(): pass
`);

  writeFileSync(join(FIXTURE_ROOT, "myapp/payment/tests/test_gateway.py"), `
from myapp.payment.gateway import charge
def test_charge(): pass
`);

  writeFileSync(join(FIXTURE_ROOT, "tests/conftest.py"), `
import pytest
`);

  // pyproject.toml
  writeFileSync(join(FIXTURE_ROOT, "pyproject.toml"), `
[project]
name = "myapp"
dependencies = [
  "Django>=4.2",
  "celery[redis]>=5.0",
  "requests>=2.28",
]

[project.optional-dependencies]
dev = [
  "pytest>=7.0",
  "mypy>=1.0",
]
`);

  // requirements.txt
  writeFileSync(join(FIXTURE_ROOT, "requirements.txt"), `
Django>=4.2
celery[redis]
requests
`);

  // manage.py
  writeFileSync(join(FIXTURE_ROOT, "manage.py"), `#!/usr/bin/env python
import sys
`);

  // A .pyx file
  writeFileSync(join(FIXTURE_ROOT, "myapp/core/fast.pyx"), "# cython extension");

  // Dummy git HEAD for scanner
  writeFileSync(join(FIXTURE_ROOT, ".git/HEAD"), "ref: refs/heads/main");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pythonObservationEnhancer integration", () => {
  beforeAll(() => ensureFixture());

  function runEnhancer(config?: PythonObservationConfig) {
    const obsConfig = loadRepoObservationConfig(FIXTURE_ROOT);
    const observations = scanRepo({ repoRoot: FIXTURE_ROOT, config: obsConfig.config });
    return enhanceWithPythonObservations(observations, FIXTURE_ROOT, config);
  }

  it("produces full sidecar shape", () => {
    const result = runEnhancer();

    expect(result.schema_version).toBe("python_observations.v1");
    expect(result.repo.python_file_count).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.import_observations.length).toBeGreaterThan(0);
    expect(result.dependency_manifests.length).toBeGreaterThan(0);
    expect(result.test_mappings.length).toBeGreaterThan(0);
    expect(result.sensitive_zones.length).toBeGreaterThan(0);
    expect(result.unknowns.length).toBeGreaterThan(0);
    expect(result.quality).toBeDefined();
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("consumes PythonObservationConfig.project_packages", () => {
    // Without config: auto-detects "myapp" from myapp/__init__.py
    const auto = runEnhancer();
    const autoProjectImports = auto.import_observations.filter(i => i.status === "project_import");
    expect(autoProjectImports.length).toBeGreaterThan(0);
    expect(autoProjectImports.some(i => i.top_level_module === "myapp")).toBe(true);

    // With explicit config: override project packages
    const withConfig = runEnhancer({ project_packages: ["myapp", "mylib"] });
    const configProjectImports = withConfig.import_observations.filter(i => i.status === "project_import");
    expect(configProjectImports.length).toBeGreaterThan(0);
  });

  it("consumes sensitive_overrides", () => {
    const result = runEnhancer({
      sensitive_overrides: {
        "myapp/core/permissions.py": "access_control",
      },
    });

    const customZone = result.sensitive_zones.find(z => z.category === "access_control");
    expect(customZone).toBeDefined();
    expect(customZone!.source).toBe("config_override");
    expect(customZone!.matched_paths).toContain("myapp/core/permissions.py");
  });

  it("includes limitations including multiline import note", () => {
    const result = runEnhancer();
    expect(result.limitations.some(l => l.includes("Multi-line"))).toBe(true);
    expect(result.limitations.some(l => l.includes("runtime import resolution"))).toBe(true);
    expect(result.limitations.some(l => l.includes("TOML parser"))).toBe(true);
  });

  it("produces quality and unknown taxonomy from combined signals", () => {
    const result = runEnhancer();

    // Quality
    expect(result.quality.python_file_count).toBeGreaterThan(0);
    expect(result.quality.classified_ratio).toBeGreaterThan(0);
    expect(result.quality.import_observation_count).toBeGreaterThan(0);
    expect(result.quality.manifest_count).toBeGreaterThan(0);

    // Unknowns: .pyx should produce unsupported_python_artifact
    const unsupported = result.unknowns.find(u => u.category === "unsupported_python_artifact");
    expect(unsupported).toBeDefined();
    expect(unsupported!.classification).toBe("out_of_scope");

    // Dynamic imports
    const dynamic = result.unknowns.find(u => u.category === "dynamic_or_unresolved_import");
    expect(dynamic).toBeDefined();
    expect(dynamic!.classification).toBe("intrinsic");
  });

  it("parses multiline from x import (...)", () => {
    const result = runEnhancer();
    // actions.py has: from myapp.checkout import (\n    utils,\n    helpers,\n)
    const multilineImport = result.import_observations.find(
      i => i.from_file === "myapp/checkout/actions.py"
        && i.import_kind === "from_import"
        && i.raw_specifier.includes("myapp.checkout")
        && i.raw_specifier.includes("utils")
    );
    expect(multilineImport).toBeDefined();
    expect(multilineImport!.status).toBe("project_import");
  });

  it("classifies files into correct buckets", () => {
    const result = runEnhancer();
    const buckets = new Map<string, number>();
    for (const f of result.files) {
      buckets.set(f.bucket, (buckets.get(f.bucket) ?? 0) + 1);
    }

    expect(buckets.get("source")).toBeGreaterThan(0);
    expect(buckets.get("test")).toBeGreaterThan(0);
    expect(buckets.get("config")).toBeGreaterThan(0);
    expect(buckets.get("script")).toBeGreaterThan(0);
    expect(buckets.get("unsupported")).toBeGreaterThan(0);
  });

  it("maps test files correctly", () => {
    const result = runEnhancer();
    const actionsMapping = result.test_mappings.find(m => m.source_path === "myapp/checkout/actions.py");
    expect(actionsMapping).toBeDefined();
    expect(actionsMapping!.confidence).toBe("high");
    expect(actionsMapping!.existing_test_paths).toContain("myapp/checkout/tests/test_actions.py");
  });
});

// ---------------------------------------------------------------------------
// pythonEcosystemPatterns unit tests
// ---------------------------------------------------------------------------

describe("pythonEcosystemPatterns", () => {
  it("isPythonSourceExtension", () => {
    expect(isPythonSourceExtension("foo.py")).toBe(true);
    expect(isPythonSourceExtension("foo.pyi")).toBe(true);
    expect(isPythonSourceExtension("foo.ts")).toBe(false);
    expect(isPythonSourceExtension("foo.toml")).toBe(false);
  });

  it("isPythonEcosystemFile", () => {
    expect(isPythonEcosystemFile("pyproject.toml")).toBe(true);
    expect(isPythonEcosystemFile("requirements.txt")).toBe(true);
    expect(isPythonEcosystemFile("requirements-dev.txt")).toBe(true);
    expect(isPythonEcosystemFile("setup.cfg")).toBe(true);
    expect(isPythonEcosystemFile("package.json")).toBe(false);
  });

  it("isPythonRelevantFile", () => {
    expect(isPythonRelevantFile("foo.py")).toBe(true);
    expect(isPythonRelevantFile("pyproject.toml")).toBe(true);
    expect(isPythonRelevantFile("foo.ts")).toBe(false);
  });

  it("isPythonManifestFile", () => {
    expect(isPythonManifestFile("pyproject.toml")).toBe(true);
    expect(isPythonManifestFile("requirements.txt")).toBe(true);
    expect(isPythonManifestFile("uv.lock")).toBe(true);
    expect(isPythonManifestFile("poetry.lock")).toBe(true);
    expect(isPythonManifestFile("pdm.lock")).toBe(true);
    expect(isPythonManifestFile("tox.ini")).toBe(true);
    expect(isPythonManifestFile("noxfile.py")).toBe(true);
    expect(isPythonManifestFile("environment.yml")).toBe(true);
    expect(isPythonManifestFile(".flake8")).toBe(false);
  });

  it("hasPythonSignals detects Python repos", () => {
    expect(hasPythonSignals(["a.py", "b.py", "c.py"])).toBe(true);
    expect(hasPythonSignals(["pyproject.toml", "a.ts"])).toBe(true);
    expect(hasPythonSignals(["a.ts", "b.ts", "c.js"])).toBe(false);
  });
});
