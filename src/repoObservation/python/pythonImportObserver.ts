/**
 * P25a: Python Import Observer
 *
 * Regex-based extraction of Python import statements.
 * Produces syntax-level observations, NOT full runtime import resolution.
 *
 * Supported:
 *   import os
 *   import saleor.checkout
 *   from saleor.checkout import calculations
 *   from .models import Checkout
 *   from ..core import permissions
 *   __import__("x")
 *   importlib.import_module("x")
 */

import type { PythonImportObservation, PythonImportStatus, PythonImportKind } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function observePythonImports(input: {
  filePath: string;
  content: string;
  projectPackages: readonly string[];
  declaredPackages: ReadonlySet<string>;
}): PythonImportObservation[] {
  const results: PythonImportObservation[] = [];
  // Pre-process: join multiline imports into single lines
  const preprocessed = joinMultilineImports(input.content);
  const lines = preprocessed.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith("#") || trimmed.length === 0) continue;

    // Dynamic imports
    const dynamicMatch = matchDynamicImport(trimmed);
    if (dynamicMatch) {
      results.push({
        from_file: input.filePath,
        raw_specifier: dynamicMatch.specifier,
        import_kind: "dynamic_import",
        status: "dynamic_or_unresolved",
        top_level_module: dynamicMatch.specifier,
        confidence: "low",
        note: `Dynamic import detected: ${dynamicMatch.pattern}`,
      });
      continue;
    }

    // from X import Y
    const fromMatch = matchFromImport(trimmed);
    if (fromMatch) {
      const status = classifyImport(fromMatch.module, input.projectPackages, input.declaredPackages);
      const topLevel = extractTopLevelModule(fromMatch.module);
      results.push({
        from_file: input.filePath,
        raw_specifier: fromMatch.full,
        import_kind: "from_import",
        status: status.status,
        top_level_module: topLevel,
        confidence: status.confidence,
        note: status.note,
      });
      continue;
    }

    // import X [, Y, Z]
    const importMatch = matchPlainImport(trimmed);
    if (importMatch) {
      for (const mod of importMatch.modules) {
        const status = classifyImport(mod, input.projectPackages, input.declaredPackages);
        const topLevel = extractTopLevelModule(mod);
        results.push({
          from_file: input.filePath,
          raw_specifier: mod,
          import_kind: "import",
          status: status.status,
          top_level_module: topLevel,
          confidence: status.confidence,
          note: status.note,
        });
      }
    }
  }

  return results;
}

/**
 * Pre-process Python source to join multiline import statements.
 * Handles:
 *   from x import (
 *     a,
 *     b,
 *   )
 * Joins them into: from x import (a, b)
 */
function joinMultilineImports(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect "from x import (" or "import (" opening
    if (/^(?:from\s+[\w.]+\s+import|import)\s+.*\(\s*$/.test(trimmed)) {
      // Accumulate until closing paren
      let joined = trimmed.replace(/\(\s*$/, "(");
      i++;
      while (i < lines.length) {
        const continuation = lines[i].trim();
        if (continuation.includes(")")) {
          joined += " " + continuation.replace(/\)\s*$/, ")");
          break;
        }
        if (continuation.length > 0 && !continuation.startsWith("#")) {
          joined += " " + continuation;
        }
        i++;
      }
      result.push(joined);
    } else {
      result.push(line);
    }
    i++;
  }

  return result.join("\n");
}

/**
 * Detect top-level project package directories by finding dirs with __init__.py.
 */
export function detectProjectPackages(observedPaths: readonly string[]): string[] {
  const initFiles = new Set<string>();
  for (const p of observedPaths) {
    if (p.endsWith("__init__.py")) {
      const parts = p.split("/");
      if (parts.length === 2) {
        // top-level-dir/__init__.py
        initFiles.add(parts[0]);
      }
    }
  }
  return [...initFiles].sort();
}

// ---------------------------------------------------------------------------
// Import pattern matching
// ---------------------------------------------------------------------------

const FROM_IMPORT_RE = /^from\s+(\.{0,3}[\w.]*)\s+import\s+/;
const PLAIN_IMPORT_RE = /^import\s+([\w.,\s]+)/;
const DUNDER_IMPORT_RE = /__import__\s*\(\s*['"]([^'"]+)['"]\s*\)/;
const IMPORTLIB_RE = /importlib\.import_module\s*\(\s*['"]([^'"]+)['"]\s*\)/;

function matchFromImport(line: string): { module: string; full: string } | null {
  const m = FROM_IMPORT_RE.exec(line);
  if (!m) return null;
  return { module: m[1], full: line };
}

function matchPlainImport(line: string): { modules: string[] } | null {
  const m = PLAIN_IMPORT_RE.exec(line);
  if (!m) return null;

  // Handle "import os, sys, json" and "import saleor.checkout as checkout"
  const raw = m[1];
  const modules = raw.split(",").map(s => {
    // Remove "as alias" suffix
    const asIdx = s.indexOf(" as ");
    return (asIdx >= 0 ? s.slice(0, asIdx) : s).trim();
  }).filter(s => s.length > 0 && /^[\w.]+$/.test(s));

  return modules.length > 0 ? { modules } : null;
}

function matchDynamicImport(line: string): { specifier: string; pattern: string } | null {
  const d = DUNDER_IMPORT_RE.exec(line);
  if (d) return { specifier: d[1], pattern: "__import__" };

  const i = IMPORTLIB_RE.exec(line);
  if (i) return { specifier: i[1], pattern: "importlib.import_module" };

  return null;
}

// ---------------------------------------------------------------------------
// Import classification
// ---------------------------------------------------------------------------

function classifyImport(
  module: string,
  projectPackages: readonly string[],
  declaredPackages: ReadonlySet<string>,
): { status: PythonImportStatus; confidence: "high" | "medium" | "low"; note?: string } {
  // Relative import
  if (module.startsWith(".")) {
    return {
      status: "relative_import",
      confidence: "medium",
      note: "Relative import observed; full package resolution not attempted",
    };
  }

  const topLevel = extractTopLevelModule(module);

  // Builtin
  if (PYTHON_STDLIB.has(topLevel)) {
    return { status: "builtin_python_package", confidence: "high" };
  }

  // Project package
  for (const pkg of projectPackages) {
    if (topLevel === pkg) {
      return { status: "project_import", confidence: "high" };
    }
  }

  // Declared third-party
  // Normalize: packages use underscores in imports but hyphens in manifests
  const normalized = topLevel.replace(/-/g, "_").toLowerCase();
  if (declaredPackages.has(topLevel) || declaredPackages.has(normalized)) {
    return { status: "declared_package", confidence: "high" };
  }

  // Check if it's a common alias (django → django, graphene → graphene, etc)
  // that might be declared under a different name
  if (declaredPackages.has(topLevel.toLowerCase())) {
    return { status: "declared_package", confidence: "medium" };
  }

  return { status: "undeclared_package", confidence: "low" };
}

function extractTopLevelModule(module: string): string {
  // "saleor.checkout.calculations" → "saleor"
  // ".models" → "."
  if (module.startsWith(".")) return module;
  const dot = module.indexOf(".");
  return dot >= 0 ? module.slice(0, dot) : module;
}

// ---------------------------------------------------------------------------
// Python standard library (3.10+, ~200 modules)
// ---------------------------------------------------------------------------

const PYTHON_STDLIB = new Set([
  // Core
  "abc", "ast", "asyncio", "atexit", "base64", "bisect", "builtins",
  "calendar", "cgi", "cgitb", "chunk", "cmath", "cmd", "code", "codecs",
  "codeop", "collections", "colorsys", "compileall", "concurrent",
  "configparser", "contextlib", "contextvars", "copy", "copyreg",
  "cProfile", "crypt", "csv", "ctypes", "curses",
  // D-F
  "dataclasses", "datetime", "dbm", "decimal", "difflib", "dis",
  "distutils", "doctest", "email", "encodings", "enum", "errno",
  "faulthandler", "fcntl", "filecmp", "fileinput", "fnmatch",
  "formatter", "fractions", "ftplib", "functools",
  // G-I
  "gc", "getopt", "getpass", "gettext", "glob", "grp", "gzip",
  "hashlib", "heapq", "hmac", "html", "http",
  "idlelib", "imaplib", "imghdr", "imp", "importlib", "inspect",
  "io", "ipaddress", "itertools",
  // J-L
  "json", "keyword", "lib2to3", "linecache", "locale", "logging",
  "lzma",
  // M-O
  "mailbox", "mailcap", "marshal", "math", "mimetypes", "mmap",
  "modulefinder", "multiprocessing", "netrc", "nis", "nntplib",
  "numbers", "operator", "optparse", "os", "ossaudiodev",
  // P
  "parser", "pathlib", "pdb", "pickle", "pickletools", "pipes",
  "pkgutil", "platform", "plistlib", "poplib", "posix", "posixpath",
  "pprint", "profile", "pstats", "pty", "pwd", "py_compile",
  "pyclbr", "pydoc",
  // Q-S
  "queue", "quopri", "random", "re", "readline", "reprlib",
  "resource", "rlcompleter", "runpy", "sched", "secrets", "select",
  "selectors", "shelve", "shlex", "shutil", "signal", "site",
  "smtpd", "smtplib", "sndhdr", "socket", "socketserver",
  "sqlite3", "ssl", "stat", "statistics", "string", "stringprep",
  "struct", "subprocess", "sunau", "symtable", "sys", "sysconfig",
  "syslog",
  // T
  "tabnanny", "tarfile", "telnetlib", "tempfile", "termios", "test",
  "textwrap", "threading", "time", "timeit", "tkinter", "token",
  "tokenize", "tomllib", "trace", "traceback", "tracemalloc", "tty",
  "turtle", "turtledemo", "types", "typing",
  // U-Z
  "unicodedata", "unittest", "urllib", "uu", "uuid",
  "venv", "warnings", "wave", "weakref", "webbrowser",
  "winreg", "winsound", "wsgiref",
  "xdrlib", "xml", "xmlrpc",
  "zipapp", "zipfile", "zipimport", "zlib",
  // Common aliases / sub-packages often imported directly
  "_thread", "__future__", "_collections_abc",
]);
