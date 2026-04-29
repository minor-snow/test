/**
 * P20a: File Classification
 *
 * Classifies files by path into buckets and languages.
 * Uses only path-based rules — no content inspection.
 */

import type { FileBucket, FileLanguage } from "./types.js";

// ---------------------------------------------------------------------------
// Bucket classification
// ---------------------------------------------------------------------------

const BUCKET_RULES: Array<{ test: (p: string) => boolean; bucket: FileBucket }> = [
  // Test files (must come before src to catch test files inside src/)
  { test: p => /\.(test|spec)\.[tj]sx?$/.test(p), bucket: "test" },
  { test: p => p.startsWith("test/") || p.startsWith("tests/"), bucket: "test" },
  { test: p => p.includes("__tests__/"), bucket: "test" },

  // Generated / data (pipeline outputs, trial data, dogfood artifacts)
  { test: p => p.startsWith("generated/"), bucket: "generated" },
  { test: p => p.includes("build/generated/"), bucket: "generated" },
  { test: p => /\.generated\.[tj]sx?$/.test(p), bucket: "generated" },
  { test: p => p.startsWith("data/"), bucket: "generated" },
  { test: p => p.startsWith(".pantheon/"), bucket: "generated" },

  // Config
  { test: p => /^tsconfig(\..+)?\.json$/.test(p), bucket: "config" },
  { test: p => p === "package.json", bucket: "config" },
  { test: p => p === "package-lock.json", bucket: "config" },
  { test: p => /^vite\.config\.[tj]sx?$/.test(p), bucket: "config" },
  { test: p => /^vitest\.config\.[tj]sx?$/.test(p), bucket: "config" },
  { test: p => /^webpack\.config\.[tj]sx?$/.test(p), bucket: "config" },
  { test: p => /^jest\.config\.[tj]sx?$/.test(p), bucket: "config" },
  { test: p => /^pantheon(\..+)?\.json$/.test(p), bucket: "config" },
  { test: p => p.startsWith(".github/"), bucket: "config" },
  { test: p => /^\.?eslint/.test(p), bucket: "config" },
  { test: p => p.startsWith("config/"), bucket: "config" },
  { test: p => p.startsWith("action/"), bucket: "config" },

  // Docs
  { test: p => p.startsWith("docs/"), bucket: "docs" },
  { test: p => p.startsWith("examples/"), bucket: "docs" },
  { test: p => /\.md$/i.test(p) && !p.startsWith("src/"), bucket: "docs" },

  // Scripts
  { test: p => p.startsWith("scripts/"), bucket: "script" },
  { test: p => p.startsWith("bin/"), bucket: "script" },

  // Assets (cockpit UI, static files)
  { test: p => p.startsWith("cockpit/"), bucket: "asset" },
  { test: p => p.startsWith("cockpit-mock/"), bucket: "asset" },

  // Source (catch-all for src/, lib/, app/)
  { test: p => p.startsWith("src/"), bucket: "src" },
  { test: p => p.startsWith("lib/"), bucket: "src" },
  { test: p => p.startsWith("app/"), bucket: "src" },
];

/**
 * Classify a repo-relative path into a bucket.
 */
export function classifyFile(path: string): FileBucket {
  const lower = path.toLowerCase();

  for (const rule of BUCKET_RULES) {
    if (rule.test(lower)) {
      return rule.bucket;
    }
  }

  // Asset detection by extension
  if (/\.(png|jpe?g|gif|svg|ico|webp|mp4|webm|woff2?|ttf|eot|pdf)$/i.test(path)) {
    return "asset";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Array<{ test: RegExp; language: FileLanguage }> = [
  { test: /\.tsx?$/, language: "typescript" },
  { test: /\.jsx?$/, language: "javascript" },
  { test: /\.json$/, language: "json" },
  { test: /\.md$/i, language: "markdown" },
  { test: /\.(ya?ml)$/i, language: "yaml" },
];

/**
 * Detect the language of a file by its extension.
 */
export function detectLanguage(path: string): FileLanguage {
  for (const rule of LANGUAGE_MAP) {
    if (rule.test.test(path)) {
      return rule.language;
    }
  }
  return "other";
}
