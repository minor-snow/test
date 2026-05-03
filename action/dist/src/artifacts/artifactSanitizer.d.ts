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
export type SanitizationViolation = {
    readonly kind: "windows_absolute_path" | "unix_absolute_path" | "workspace_temp_path" | "debug_payload" | "stack_trace" | "secret_like_key" | "env_reference" | "internal_observation_dump";
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
/**
 * Scan artifact content for sensitive patterns.
 *
 * @param content - The text content of the artifact
 * @param mode - "public" checks all rules; "debug" is a no-op (always clean)
 * @returns A SanitizationResult with any violations found
 */
export declare function sanitizeArtifact(content: string, mode?: "public" | "debug"): SanitizationResult;
/**
 * Returns only critical and high severity violations.
 */
export declare function getCriticalViolations(result: SanitizationResult): readonly SanitizationViolation[];
