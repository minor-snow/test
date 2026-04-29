/**
 * P25a: Python Dependency Extractor Tests
 */

import { describe, it, expect } from "vitest";
import { extractPythonDependencies, normalizePackageName, buildDeclaredPackageSet } from "../../../src/repoObservation/python/pythonDependencyExtractor.js";

describe("pythonDependencyExtractor", () => {
  describe("pyproject.toml", () => {
    it("extracts [project] dependencies", () => {
      const content = `
[project]
name = "my-app"
dependencies = [
  "Django>=4.2",
  "graphene-django",
  "celery[redis]>=5.0",
]
`;
      const r = extractPythonDependencies({ filePath: "pyproject.toml", content });
      expect(r.source_type).toBe("pyproject.toml");
      expect(r.packages).toContain("django");
      expect(r.packages).toContain("graphene_django");
      expect(r.packages).toContain("celery");
      expect(r.confidence).toBe("high");
    });

    it("extracts [tool.poetry.dependencies]", () => {
      const content = `
[tool.poetry.dependencies]
python = "^3.10"
django = "^4.2"
graphene-django = "^3.0"
`;
      const r = extractPythonDependencies({ filePath: "pyproject.toml", content });
      expect(r.packages).toContain("django");
      expect(r.packages).toContain("graphene_django");
      expect(r.packages).not.toContain("python");
    });

    it("extracts [tool.poetry.dev-dependencies]", () => {
      const content = `
[tool.poetry.dependencies]
django = "^4.2"

[tool.poetry.dev-dependencies]
pytest = "^7.0"
mypy = "^1.0"
`;
      const r = extractPythonDependencies({ filePath: "pyproject.toml", content });
      expect(r.packages).toContain("django");
      expect(r.dev_packages).toContain("pytest");
      expect(r.dev_packages).toContain("mypy");
    });

    it("returns low confidence for empty pyproject.toml", () => {
      const content = `
[project]
name = "empty-app"
version = "0.1.0"
`;
      const r = extractPythonDependencies({ filePath: "pyproject.toml", content });
      expect(r.confidence).toBe("low");
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("requirements.txt", () => {
    it("extracts package names", () => {
      const content = `
Django>=4.2
graphene-django==3.0.0
celery[redis]>=5.0,<6.0
# this is a comment
requests~=2.28

-r requirements-base.txt
`;
      const r = extractPythonDependencies({ filePath: "requirements.txt", content });
      expect(r.source_type).toBe("requirements.txt");
      expect(r.packages).toContain("django");
      expect(r.packages).toContain("graphene_django");
      expect(r.packages).toContain("celery");
      expect(r.packages).toContain("requests");
      expect(r.confidence).toBe("high");
    });

    it("classifies requirements-dev.txt as dev packages", () => {
      const content = "pytest\nmypy\nblack";
      const r = extractPythonDependencies({ filePath: "requirements-dev.txt", content });
      expect(r.source_type).toBe("requirements-dev.txt");
      expect(r.dev_packages).toContain("pytest");
      expect(r.packages).toHaveLength(0);
    });

    it("skips git+ and -e entries", () => {
      const content = "-e .\ngit+https://github.com/org/repo.git\ndjango";
      const r = extractPythonDependencies({ filePath: "requirements.txt", content });
      expect(r.packages).toEqual(["django"]);
    });
  });

  describe("setup.cfg", () => {
    it("extracts install_requires", () => {
      const content = `
[metadata]
name = my-app

[options]
install_requires =
    Django>=4.2
    graphene-django
    celery
`;
      const r = extractPythonDependencies({ filePath: "setup.cfg", content });
      expect(r.packages).toContain("django");
      expect(r.packages).toContain("graphene_django");
      expect(r.packages).toContain("celery");
    });
  });

  describe("extended manifest sources", () => {
    it("extracts packages from uv.lock", () => {
      const content = `
[[package]]
name = "my-app"
source = { virtual = "." }

[[package]]
name = "django"
version = "5.0.0"

[[package]]
name = "sqlalchemy"
version = "2.0.0"
`;
      const r = extractPythonDependencies({ filePath: "uv.lock", content });
      expect(r.source_type).toBe("uv.lock");
      expect(r.packages).toEqual(["django", "sqlalchemy"]);
      expect(r.confidence).toBe("high");
    });

    it("extracts main and dev packages from poetry.lock", () => {
      const content = `
[[package]]
name = "httpx"
version = "0.1.0"
category = "main"

[[package]]
name = "pytest"
version = "8.0.0"
category = "dev"
`;
      const r = extractPythonDependencies({ filePath: "poetry.lock", content });
      expect(r.source_type).toBe("poetry.lock");
      expect(r.packages).toEqual(["httpx"]);
      expect(r.dev_packages).toEqual(["pytest"]);
      expect(r.confidence).toBe("high");
    });

    it("extracts grouped packages from pdm.lock", () => {
      const content = `
[[package]]
name = "fastapi"
version = "0.1.0"

[[package]]
name = "pytest"
version = "8.0.0"
groups = ["dev"]
`;
      const r = extractPythonDependencies({ filePath: "pdm.lock", content });
      expect(r.source_type).toBe("pdm.lock");
      expect(r.packages).toEqual(["fastapi"]);
      expect(r.dev_packages).toEqual(["pytest"]);
      expect(r.confidence).toBe("medium");
    });

    it("extracts conda dependencies from environment.yml", () => {
      const content = `
name: demo
dependencies:
  - python=3.11
  - pandas>=2.0
  - pip:
    - fastapi==0.111.0
`;
      const r = extractPythonDependencies({ filePath: "environment.yml", content });
      expect(r.source_type).toBe("environment.yml");
      expect(r.packages).toContain("python");
      expect(r.packages).toContain("pandas");
      expect(r.packages).toContain("fastapi");
      expect(r.confidence).toBe("medium");
    });

    it("extracts tox deps as dev packages", () => {
      const content = `
[testenv]
deps =
    pytest
    mypy>=1.0
    -r requirements-dev.txt
`;
      const r = extractPythonDependencies({ filePath: "tox.ini", content });
      expect(r.source_type).toBe("tox.ini");
      expect(r.packages).toEqual([]);
      expect(r.dev_packages).toEqual(["pytest", "mypy"]);
      expect(r.confidence).toBe("medium");
    });

    it("extracts nox session.install dependencies as weak signals", () => {
      const content = `
import nox

@nox.session
def tests(session):
    session.install("pytest", "httpx>=0.27", ".")
    session.install("-r", "requirements-dev.txt")
`;
      const r = extractPythonDependencies({ filePath: "noxfile.py", content });
      expect(r.source_type).toBe("noxfile.py");
      expect(r.packages).toEqual([]);
      expect(r.dev_packages).toEqual(["pytest", "httpx"]);
      expect(r.confidence).toBe("low");
    });
  });

  describe("normalizePackageName", () => {
    it("lowercases", () => expect(normalizePackageName("Django")).toBe("django"));
    it("converts hyphens", () => expect(normalizePackageName("graphene-django")).toBe("graphene_django"));
    it("strips extras", () => expect(normalizePackageName("celery[redis]")).toBe("celery"));
    it("handles dots", () => expect(normalizePackageName("zope.interface")).toBe("zope_interface"));
  });

  describe("buildDeclaredPackageSet", () => {
    it("merges packages and dev_packages", () => {
      const manifests = [
        { source_path: "r.txt", source_type: "requirements.txt" as const, packages: ["django"], dev_packages: ["pytest"], confidence: "high" as const, warnings: [] },
      ];
      const set = buildDeclaredPackageSet(manifests);
      expect(set.has("django")).toBe(true);
      expect(set.has("pytest")).toBe(true);
    });
  });
});
