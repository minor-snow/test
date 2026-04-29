/**
 * P18: File Classifier
 *
 * Classifies changed files against the scoped implementation boundary.
 * Determines allowed, forbidden, protocol, and generated boundary status.
 *
 * ref: P18
 */

import type { ScopedImplementationBoundaryPackage } from "../scopedHandoff/types.js";
import type { ClassifiedChangedFile } from "./types.js";

// ---------------------------------------------------------------------------
// Path normalization
// ---------------------------------------------------------------------------

export function normalizePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}

// ---------------------------------------------------------------------------
// Pattern matching (exact + prefix/**)
// ---------------------------------------------------------------------------

function matchesPattern(filePath: string, pattern: string): boolean {
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return filePath.startsWith(prefix + "/") || filePath === prefix;
  }
  return filePath === pattern;
}

// ---------------------------------------------------------------------------
// Protocol file detection
// ---------------------------------------------------------------------------

const PROTOCOL_PREFIXES = [".pantheon/", ".cursor/"];

function isProtocolFile(filePath: string): boolean {
  return PROTOCOL_PREFIXES.some(p => filePath.startsWith(p) || filePath === p.slice(0, -1));
}

// ---------------------------------------------------------------------------
// Classify
// ---------------------------------------------------------------------------

export function classifyChangedFile(
  filePath: string,
  scope: ScopedImplementationBoundaryPackage,
): ClassifiedChangedFile {
  const normalized = normalizePath(filePath);

  // 1. Protocol files are ALWAYS forbidden, even if somehow in allowed_files
  if (isProtocolFile(normalized)) {
    return {
      file_path: normalized,
      is_allowed: false,
      is_forbidden: true,
      is_protocol_file: true,
      is_generated_boundary_file: false,
      matched_forbidden: (PROTOCOL_PREFIXES.find(p => normalized.startsWith(p)) ?? ".pantheon/") + "**",
      reason: "Protocol files (.pantheon/**, .cursor/**) must not be modified by downstream agents.",
    };
  }

  // 2. Check allowed_files (exact match)
  const allowedMatch = scope.allowed_files.find(f => normalizePath(f.path) === normalized);

  // 3. Check forbidden_files (pattern match)
  const forbiddenMatch = scope.forbidden_files.find(f => matchesPattern(normalized, f.pattern));

  // 4. Determine generated boundary status
  const isGeneratedBoundary = allowedMatch?.origin === "blast_radius_generated";

  if (allowedMatch) {
    return {
      file_path: normalized,
      is_allowed: true,
      is_forbidden: false,
      is_protocol_file: false,
      is_generated_boundary_file: isGeneratedBoundary,
      matched_allowed: allowedMatch.path,
      reason: allowedMatch.reason,
    };
  }

  if (forbiddenMatch) {
    return {
      file_path: normalized,
      is_allowed: false,
      is_forbidden: true,
      is_protocol_file: false,
      is_generated_boundary_file: false,
      matched_forbidden: forbiddenMatch.pattern,
      reason: forbiddenMatch.reason,
    };
  }

  // 5. Not in allowed, not in forbidden → outside scope
  return {
    file_path: normalized,
    is_allowed: false,
    is_forbidden: false,
    is_protocol_file: false,
    is_generated_boundary_file: false,
    reason: `File "${normalized}" is not in the allowed files list for this scope.`,
  };
}

/**
 * Classify all changed files and deduplicate.
 */
export function classifyChangedFiles(
  files: string[],
  scope: ScopedImplementationBoundaryPackage,
): ClassifiedChangedFile[] {
  const seen = new Set<string>();
  const results: ClassifiedChangedFile[] = [];

  for (const f of files) {
    const normalized = normalizePath(f);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    results.push(classifyChangedFile(normalized, scope));
  }

  return results;
}
