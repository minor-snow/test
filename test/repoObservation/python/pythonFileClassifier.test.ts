/**
 * P25a: Python File Classifier Tests
 */

import { describe, it, expect } from "vitest";
import { classifyPythonFile, isPythonFile } from "../../../src/repoObservation/python/pythonFileClassifier.js";

describe("pythonFileClassifier", () => {
  describe("isPythonFile", () => {
    it("recognizes .py", () => expect(isPythonFile("saleor/checkout/actions.py")).toBe(true));
    it("recognizes .pyi", () => expect(isPythonFile("stubs/checkout.pyi")).toBe(true));
    it("recognizes .pyx", () => expect(isPythonFile("ext/fast.pyx")).toBe(true));
    it("recognizes .ipynb", () => expect(isPythonFile("notebooks/analysis.ipynb")).toBe(true));
    it("rejects .ts", () => expect(isPythonFile("src/index.ts")).toBe(false));
    it("rejects .json", () => expect(isPythonFile("package.json")).toBe(false));
  });

  describe("bucket classification", () => {
    // Test files
    it("classifies tests/ directory", () => {
      expect(classifyPythonFile("tests/test_checkout.py", 100).bucket).toBe("test");
    });
    it("classifies nested tests/", () => {
      expect(classifyPythonFile("saleor/checkout/tests/test_actions.py", 100).bucket).toBe("test");
    });
    it("classifies test_ prefix", () => {
      expect(classifyPythonFile("saleor/checkout/test_utils.py", 100).bucket).toBe("test");
    });
    it("classifies _test suffix", () => {
      expect(classifyPythonFile("saleor/checkout/utils_test.py", 100).bucket).toBe("test");
    });
    it("classifies conftest", () => {
      expect(classifyPythonFile("saleor/conftest.py", 100).bucket).toBe("test");
    });

    // Migration
    it("classifies Django migrations", () => {
      expect(classifyPythonFile("saleor/checkout/migrations/0001_initial.py", 100).bucket).toBe("migration");
    });
    it("classifies alembic versions", () => {
      expect(classifyPythonFile("alembic/versions/abc123.py", 100).bucket).toBe("migration");
    });

    // Script
    it("classifies manage.py", () => {
      expect(classifyPythonFile("manage.py", 100).bucket).toBe("script");
    });
    it("classifies scripts/", () => {
      expect(classifyPythonFile("scripts/deploy.py", 100).bucket).toBe("script");
    });

    // Config
    it("classifies pyproject.toml", () => {
      expect(classifyPythonFile("pyproject.toml", 100).bucket).toBe("config");
    });
    it("classifies requirements.txt", () => {
      expect(classifyPythonFile("requirements.txt", 100).bucket).toBe("config");
    });
    it("classifies requirements-dev.txt", () => {
      expect(classifyPythonFile("requirements-dev.txt", 100).bucket).toBe("config");
    });
    it("classifies settings.py", () => {
      expect(classifyPythonFile("saleor/settings.py", 100).bucket).toBe("config");
    });
    it("classifies settings package", () => {
      expect(classifyPythonFile("saleor/settings/base.py", 100).bucket).toBe("config");
    });

    // Generated
    it("classifies __pycache__", () => {
      expect(classifyPythonFile("saleor/__pycache__/actions.cpython-310.pyc", 100).bucket).toBe("generated");
    });
    it("classifies .pytest_cache", () => {
      expect(classifyPythonFile(".pytest_cache/v/cache/lastfailed", 100).bucket).toBe("generated");
    });

    // Source (default for .py)
    it("classifies regular .py as source", () => {
      expect(classifyPythonFile("saleor/checkout/actions.py", 100).bucket).toBe("source");
    });
    it("classifies __init__.py as source", () => {
      expect(classifyPythonFile("saleor/checkout/__init__.py", 100).bucket).toBe("source");
    });

    // Special extensions
    it("classifies .ipynb as notebook", () => {
      expect(classifyPythonFile("analysis.ipynb", 100).bucket).toBe("notebook");
    });
    it("classifies .pyx as unsupported", () => {
      expect(classifyPythonFile("ext/fast.pyx", 100).bucket).toBe("unsupported");
    });
    it("classifies .pyi as source", () => {
      expect(classifyPythonFile("stubs/checkout.pyi", 100).bucket).toBe("source");
    });
  });

  describe("evidence", () => {
    it("provides evidence for classification", () => {
      const result = classifyPythonFile("saleor/checkout/tests/test_actions.py", 100);
      expect(result.evidence.length).toBeGreaterThan(0);
    });
  });
});
