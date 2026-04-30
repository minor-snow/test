import { describe, expect, it } from "vitest";
import { classifyPythonLayout } from "../../../src/repoObservation/python/pythonLayoutClassifier.js";
import type { PythonDependencyManifest, PythonObservedFile, PythonFileBucket } from "../../../src/repoObservation/python/types.js";

function file(path: string, bucket: PythonFileBucket, extension = path.slice(path.lastIndexOf(".")) || ".py"): PythonObservedFile {
  return {
    path,
    bucket,
    extension,
    size_bytes: 1,
    evidence: [],
  };
}

function manifest(sourcePath: string): PythonDependencyManifest {
  return {
    source_path: sourcePath,
    source_type: "pyproject.toml",
    packages: [],
    dev_packages: [],
    confidence: "high",
    warnings: [],
  };
}

describe("pythonLayoutClassifier", () => {
  it("classifies django_project with django_app_layout", () => {
    const files = [
      file("manage.py", "script"),
      file("saleor/__init__.py", "source"),
      file("saleor/checkout/__init__.py", "source"),
      file("saleor/checkout/migrations/0001_initial.py", "migration"),
      file("saleor/checkout/tests/test_checkout.py", "test"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [manifest("pyproject.toml")],
      allPaths: files.map(f => f.path).concat("pyproject.toml"),
    });

    expect(layout.primary_layout).toBe("django_project");
    expect(layout.package_layout).toBe("django_app_layout");
    expect(layout.confidence).toBe("high");
  });

  it("classifies api_service from app plus alembic structure", () => {
    const files = [
      file("app/main.py", "source"),
      file("app/api/routes/items.py", "source"),
      file("alembic/versions/0001_init.py", "migration"),
      file("tests/test_items.py", "test"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [manifest("pyproject.toml")],
      allPaths: files.map(f => f.path).concat("pyproject.toml"),
    });

    expect(layout.primary_layout).toBe("api_service");
    expect(layout.package_layout).toBe("flat_package");
    expect(layout.confidence).toBe("medium");
  });

  it("classifies library_package with src_layout", () => {
    const files = [
      file("src/httpx/__init__.py", "source"),
      file("src/httpx/_client.py", "source"),
      file("src/httpx/py.typed", "source", ""),
      file("tests/test_client.py", "test"),
      file("docs/index.md", "docs", ".md"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [manifest("pyproject.toml")],
      allPaths: files.map(f => f.path).concat("pyproject.toml"),
    });

    expect(layout.primary_layout).toBe("library_package");
    expect(layout.package_layout).toBe("src_layout");
    expect(layout.confidence).toBe("high");
  });

  it("classifies namespace_package when src packages omit __init__.py", () => {
    const files = [
      file("src/acme/core.py", "source"),
      file("src/acme/utils.py", "source"),
      file("tests/test_core.py", "test"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [manifest("pyproject.toml")],
      allPaths: files.map(f => f.path).concat("pyproject.toml"),
    });

    expect(layout.package_layout).toBe("namespace_package");
  });

  it("classifies cli_app from explicit CLI entry points", () => {
    const files = [
      file("tool/__init__.py", "source"),
      file("tool/__main__.py", "source"),
      file("tool/commands.py", "source"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [],
      allPaths: files.map(f => f.path),
    });

    expect(layout.primary_layout).toBe("cli_app");
    expect(layout.package_layout).toBe("flat_package");
  });

  it("classifies data_pipeline from pipeline and etl paths", () => {
    const files = [
      file("workflow/pipelines/run.py", "source"),
      file("workflow/etl/load.py", "source"),
      file("scripts/bootstrap.py", "script"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [],
      allPaths: files.map(f => f.path),
    });

    expect(layout.primary_layout).toBe("data_pipeline");
  });

  it("classifies ml_project from train/predict and notebook signals", () => {
    const files = [
      file("models/train_model.py", "source"),
      file("models/predictor.py", "source"),
      file("notebooks/analysis.ipynb", "notebook", ".ipynb"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [],
      allPaths: files.map(f => f.path),
    });

    expect(layout.primary_layout).toBe("ml_project");
  });

  it("classifies monorepo when multiple top-level packages are present", () => {
    const files = [
      file("service1/__init__.py", "source"),
      file("service1/app.py", "source"),
      file("service2/__init__.py", "source"),
      file("service2/app.py", "source"),
      file("common/__init__.py", "source"),
      file("common/utils.py", "source"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [],
      allPaths: files.map(f => f.path),
    });

    expect(layout.primary_layout).toBe("monorepo");
    expect(layout.package_layout).toBe("flat_package");
  });

  it("classifies mixed when two primary layouts tie", () => {
    const files = [
      file("tool/__init__.py", "source"),
      file("tool/__main__.py", "source"),
      file("workflow/pipelines/run.py", "source"),
      file("workflow/etl/load.py", "source"),
    ];
    const layout = classifyPythonLayout({
      files,
      manifests: [],
      allPaths: files.map(f => f.path),
    });

    expect(layout.primary_layout).toBe("mixed");
    expect(layout.unknowns.some(u => u.reason.includes("Tied between"))).toBe(true);
  });
});
