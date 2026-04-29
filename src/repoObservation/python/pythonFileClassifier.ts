/**
 * P25a: Python File Classifier
 *
 * Path-based classification for Python files.
 * No content inspection — uses only path patterns and extensions.
 */

import type { PythonFileBucket, PythonObservedFile } from "./types.js";
import { isPythonSourceExtension, PYTHON_EXTENSIONS } from "./pythonEcosystemPatterns.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function classifyPythonFile(path: string, sizeBytes: number): PythonObservedFile {
  const ext = extractExtension(path);
  const bucket = classifyPythonBucket(path, ext);
  const evidence = explainClassification(path, ext, bucket);

  return {
    path,
    bucket,
    extension: ext,
    size_bytes: sizeBytes,
    evidence,
  };
}

export function isPythonFile(path: string): boolean {
  return isPythonSourceExtension(path);
}

// ---------------------------------------------------------------------------
// Bucket classification
// ---------------------------------------------------------------------------

type ClassificationRule = {
  readonly test: (path: string) => boolean;
  readonly bucket: PythonFileBucket;
  readonly reason: string;
};

const PYTHON_BUCKET_RULES: ClassificationRule[] = [
  // Generated / excluded (must be early to catch __pycache__ etc)
  { test: p => p.includes("__pycache__/"), bucket: "generated", reason: "Python bytecode cache" },
  { test: p => p.includes(".pytest_cache/"), bucket: "generated", reason: "pytest cache" },
  { test: p => p.includes(".mypy_cache/"), bucket: "generated", reason: "mypy cache" },
  { test: p => p.startsWith("dist/"), bucket: "generated", reason: "Distribution output" },
  { test: p => p.startsWith("build/"), bucket: "generated", reason: "Build output" },
  { test: p => p.includes(".egg-info/"), bucket: "generated", reason: "Egg metadata" },

  // Test files
  { test: p => p.startsWith("tests/") || p.startsWith("test/"), bucket: "test", reason: "Top-level test directory" },
  { test: p => p.includes("/tests/"), bucket: "test", reason: "Nested test directory" },
  { test: p => /\/test_[^/]+\.py$/.test(p), bucket: "test", reason: "test_ prefix convention" },
  { test: p => /_test\.py$/.test(p), bucket: "test", reason: "_test suffix convention" },
  { test: p => /\/conftest\.py$/.test(p) || p === "conftest.py", bucket: "test", reason: "pytest conftest" },

  // Migration
  { test: p => p.includes("/migrations/"), bucket: "migration", reason: "Django/Alembic migration directory" },
  { test: p => p.startsWith("alembic/versions/"), bucket: "migration", reason: "Alembic versions" },

  // Script
  { test: p => p === "manage.py", bucket: "script", reason: "Django manage.py" },
  { test: p => p.startsWith("scripts/"), bucket: "script", reason: "Scripts directory" },
  { test: p => p.startsWith("tools/"), bucket: "script", reason: "Tools directory" },
  { test: p => p.startsWith("bin/"), bucket: "script", reason: "Bin directory" },

  // Config
  { test: p => p === "pyproject.toml" || p === "setup.cfg" || p === "setup.py", bucket: "config", reason: "Project config" },
  { test: p => /^requirements.*\.txt$/.test(p), bucket: "config", reason: "Requirements file" },
  { test: p => p === "tox.ini" || p === "pytest.ini" || p === ".flake8", bucket: "config", reason: "Tool config" },
  { test: p => p === "Pipfile" || p === "Pipfile.lock" || p === "poetry.lock", bucket: "config", reason: "Lock/manifest" },
  { test: p => /settings\.py$/.test(p), bucket: "config", reason: "Settings module" },
  { test: p => p.includes("/settings/") && p.endsWith(".py"), bucket: "config", reason: "Settings package" },
  { test: p => p === ".pre-commit-config.yaml" || p === "mypy.ini", bucket: "config", reason: "Tool config" },

  // Docs
  { test: p => p.startsWith("docs/"), bucket: "docs", reason: "Documentation directory" },
  { test: p => p.endsWith(".rst"), bucket: "docs", reason: "reStructuredText" },
];

function classifyPythonBucket(path: string, ext: string): PythonFileBucket {
  // Special extensions first
  if (ext === ".ipynb") return "notebook";
  if (ext === ".pyx") return "unsupported";

  // Apply path-based rules for ALL files (catches .toml, .txt, .cfg, .pyc, etc.)
  for (const rule of PYTHON_BUCKET_RULES) {
    if (rule.test(path)) return rule.bucket;
  }

  // Type stubs default to source
  if (ext === ".pyi") return "source";

  // Regular .py files default to source
  if (ext === ".py") return "source";

  return "unknown";
}

function explainClassification(path: string, ext: string, bucket: PythonFileBucket): string[] {
  if (ext === ".ipynb") return ["Jupyter notebook — unsupported for import analysis"];
  if (ext === ".pyx") return ["Cython extension — unsupported for import analysis"];

  for (const rule of PYTHON_BUCKET_RULES) {
    if (rule.test(path)) return [rule.reason];
  }

  if (ext === ".py" && bucket === "source") {
    return ["Default classification: .py file not matching test/config/migration/script patterns"];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot < 0) return "";
  return path.slice(lastDot).toLowerCase();
}
