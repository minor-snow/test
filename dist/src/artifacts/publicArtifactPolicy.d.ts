/**
 * P18.5-B: Public Artifact Policy
 *
 * Declares which artifact types are safe for public export
 * and which must remain internal/debug-only.
 *
 * ref: P18.5-B
 */
/**
 * Artifacts that may appear in public-facing outputs
 * (GitHub PR comments, step summaries, alpha run reports, etc.)
 */
export declare const PUBLIC_SAFE_ARTIFACTS: readonly ["repair_task.md", "repair_scope.md", "consistency_checklist.md", "repair_report.md", "repair_feedback.md", "repair_check.json", "alpha_run_summary.md", "boundary_report.md", "github_step_summary.md", "python_report.md", "scope.md", "task.md", "check.json", "report.md", "feedback.md", "observation_summary.json", "boundary_proposal.md"];
export declare const INTERNAL_ARTIFACTS: readonly ["raw_agent_report", "full_observation_excerpts", "debug_traces", "raw_benchmark_cache", "full_file_list", "python_observations.json"];
export type ArtifactMode = "public" | "debug";
/**
 * Returns true if the given filename matches a public-safe artifact pattern.
 */
export declare function isPublicSafeArtifact(filename: string): boolean;
