/**
 * P20a: CODEOWNERS Parser
 *
 * Conservative CODEOWNERS parsing.
 * Supports root, .github/, docs/ locations.
 * Complex patterns marked as unresolved.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { OwnerHint } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseCodeowners(repoRoot: string): {
  owner_hints: OwnerHint[];
  unresolved_patterns: string[];
} {
  const hints: OwnerHint[] = [];
  const unresolved: string[] = [];

  const locations = [
    join(repoRoot, "CODEOWNERS"),
    join(repoRoot, ".github", "CODEOWNERS"),
    join(repoRoot, "docs", "CODEOWNERS"),
  ];

  for (const loc of locations) {
    if (!existsSync(loc)) continue;

    const content = readFileSync(loc, "utf-8");
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const pattern = parts[0];
      const owners = parts.slice(1).filter(p => p.startsWith("@"));

      if (owners.length === 0) continue;

      const isComplex = isComplexPattern(pattern);
      const source: "CODEOWNERS" | "CODEOWNERS:.github" | "CODEOWNERS:docs" = loc.includes(".github")
        ? "CODEOWNERS:.github"
        : loc.includes("docs")
          ? "CODEOWNERS:docs"
          : "CODEOWNERS";

      if (isComplex) {
        unresolved.push(pattern);
      }

      hints.push({
        path_pattern: pattern,
        owners,
        source,
        match_status: isComplex ? "unresolved_complex_pattern" : "simple_pattern",
        evidence: [{ type: "codeowners", source_path: loc.replace(repoRoot, "").replace(/\\/g, "/").replace(/^\//, ""), value: line }],
      });
    }
  }

  return { owner_hints: hints, unresolved_patterns: unresolved };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Determine if a CODEOWNERS pattern is "complex" and cannot be
 * confidently interpreted by simple prefix matching.
 *
 * Complex patterns include: **, *, ?, [, !
 * Simple patterns: path/ or path/file
 */
function isComplexPattern(pattern: string): boolean {
  // Double star glob
  if (pattern.includes("**")) return true;
  // Single star or question mark wildcard
  if (pattern.includes("*") || pattern.includes("?")) return true;
  // Character class
  if (pattern.includes("[")) return true;
  // Negation
  if (pattern.startsWith("!")) return true;

  return false;
}
