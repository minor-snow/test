/**
 * P24: Public Interface Types
 *
 * Stable public-facing types for the Pantheon CLI.
 * These types form the external contract — do not expose internal objects.
 */
export type PantheonCheckPublic = {
    readonly schema_version: "pantheon_check.v1";
    readonly verdict: string;
    readonly intent: string;
    readonly summary: PantheonCheckSummary;
    readonly findings: readonly PantheonFinding[];
    readonly artifacts: PantheonArtifactPaths;
    readonly repo: PantheonRepoInfo;
};
export type PantheonCheckSummary = {
    readonly changed_files: number;
    readonly in_scope: number;
    readonly review_required: number;
    readonly outside_scope: number;
    readonly forbidden: number;
};
export type PantheonFinding = {
    readonly kind: string;
    readonly severity: string;
    readonly file: string;
    readonly message: string;
    readonly allowed_actions: readonly string[];
    readonly requires_human: boolean;
};
export type PantheonArtifactPaths = {
    readonly task: string;
    readonly scope: string;
    readonly report: string;
    readonly feedback: string;
};
export type PantheonRepoInfo = {
    readonly label: string;
    readonly head_commit: string | null;
    readonly state: string;
};
export type PythonConfig = {
    readonly project_packages?: readonly string[];
    readonly sensitive_overrides?: Readonly<Record<string, string>>;
};
export type PantheonConfig = {
    readonly version: 1;
    readonly protected: readonly string[];
    readonly review_required: readonly string[];
    readonly generated: readonly string[];
    readonly path_roles: Readonly<Record<string, string>>;
    readonly python?: PythonConfig;
};
export declare const DEFAULT_PANTHEON_CONFIG: PantheonConfig;
export type PublicArtifactPaths = {
    readonly dir: string;
    readonly task: string;
    readonly scope: string;
    readonly report: string;
    readonly feedback: string;
    readonly check: string;
};
export type InternalArtifactPaths = {
    readonly dir: string;
    readonly observations: string;
    readonly contract: string;
    readonly scope: string;
    readonly verification: string;
    readonly feedback: string;
};
