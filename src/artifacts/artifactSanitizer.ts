/**
 * P18.5-B: Artifact Sanitizer
 *
 * Scans artifact content for sensitive patterns that must not appear
 * in public-facing outputs. Returns a list of violations.
 *
 * Usage:
 *   const violations = sanitizeArtifact(content, "public");
 *   if (violations.length > 0) { reject or redact }
 *
 * ref: P18.5-B
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SanitizationViolation = {
  readonly kind:
    | "windows_absolute_path"
    | "unix_absolute_path"
    | "workspace_temp_path"
    | "debug_payload"
    | "stack_trace"
    | "secret_like_key"
    | "env_reference"
    | "internal_observation_dump";
  readonly severity: "critical" | "high" | "medium";
  readonly match: string;
  readonly line?: number;
  readonly message: string;
};

export type SanitizationResult = {
  readonly clean: boolean;
  readonly violations: readonly SanitizationViolation[];
  readonly scanned_lines: number;
};

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

type PatternRule = {
  kind: SanitizationViolation["kind"];
  severity: SanitizationViolation["severity"];
  pattern: RegExp;
  message: string;
};

const SANITIZATION_RULES: PatternRule[] = [
  // Windows absolute paths
  {
    kind: "windows_absolute_path",
    severity: "critical",
    pattern: /[A-Z]:\\[^\s"']+/g,
    message: "Windows absolute path detected — must not appear in public artifacts.",
  },
  // Unix home/user paths
  {
    kind: "unix_absolute_path",
    severity: "critical",
    pattern: /\/(?:Users|home|root)\/[^\s"']+/g,
    message: "Unix user path detected — must not appear in public artifacts.",
  },
  // Workspace temp paths
  {
    kind: "workspace_temp_path",
    severity: "high",
    pattern: /\/tmp\/[^\s"']+|\\temp\\[^\s"']+/gi,
    message: "Temporary workspace path detected.",
  },
  // node_modules stack traces
  {
    kind: "stack_trace",
    severity: "high",
    pattern: /at\s+[^\s]+\s+\(.*node_modules.*\)/g,
    message: "Internal stack trace from node_modules detected.",
  },
  // Debug payload markers
  {
    kind: "debug_payload",
    severity: "medium",
    pattern: /\[DEBUG\]|__DEBUG__|"debug":\s*true/g,
    message: "Debug payload marker detected.",
  },
  // .env file references
  {
    kind: "env_reference",
    severity: "high",
    pattern: /\.env(?:\.local|\.production|\.development)?(?:\b|$)/g,
    message: ".env file reference detected — may leak environment config.",
  },
  // Secret-like keys (generic)
  {
    kind: "secret_like_key",
    severity: "critical",
    pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*["'][^"']{8,}/gi,
    message: "Potential secret or API key detected.",
  },
  // Internal observation dump (very large JSON blocks)
  {
    kind: "internal_observation_dump",
    severity: "medium",
    pattern: /"python_observations":\s*\{/g,
    message: "Internal observation dump detected — should not be in public artifacts.",
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan artifact content for sensitive patterns.
 *
 * @param content - The text content of the artifact
 * @param mode - "public" checks all rules; "debug" is a no-op (always clean)
 * @returns A SanitizationResult with any violations found
 */
export function sanitizeArtifact(
  content: string,
  mode: "public" | "debug" = "public",
): SanitizationResult {
  if (mode === "debug") {
    return { clean: true, violations: [], scanned_lines: 0 };
  }

  const lines = content.split("\n");
  const violations: SanitizationViolation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of SANITIZATION_RULES) {
      // Reset lastIndex for global regexes
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        violations.push({
          kind: rule.kind,
          severity: rule.severity,
          match: match[0].substring(0, 80), // Truncate long matches
          line: i + 1,
          message: rule.message,
        });
      }
    }
  }

  return {
    clean: violations.length === 0,
    violations,
    scanned_lines: lines.length,
  };
}

/**
 * Returns only critical and high severity violations.
 */
export function getCriticalViolations(
  result: SanitizationResult,
): readonly SanitizationViolation[] {
  return result.violations.filter(
    v => v.severity === "critical" || v.severity === "high",
  );
}
