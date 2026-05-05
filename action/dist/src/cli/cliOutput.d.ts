export type CliFinding = {
    readonly kind: string;
    readonly severity?: string;
    readonly message: string;
    readonly file?: string;
};
export type CliResultEnvelope = {
    readonly schema_version: "pantheon_cli_result@0.1.0";
    readonly command: string;
    readonly target_type: "doctor" | "boundary" | "change" | "repair" | "architecture" | "contract_gate";
    readonly target_id?: string;
    readonly verdict: string;
    readonly findings: readonly CliFinding[];
    readonly next_actions: readonly string[];
    readonly artifact_paths: readonly string[];
    readonly privacy: {
        readonly disclosure: "full-local" | "redacted";
        readonly note: string;
    };
    readonly details?: Record<string, unknown>;
};
export declare function emitCliEnvelope(input: {
    readonly command: string;
    readonly targetType: CliResultEnvelope["target_type"];
    readonly targetId?: string;
    readonly verdict: string;
    readonly findings?: readonly CliFinding[];
    readonly nextActions?: readonly string[];
    readonly artifactPaths?: readonly string[];
    readonly repoRoot: string;
    readonly redact?: boolean;
    readonly details?: Record<string, unknown>;
}): CliResultEnvelope;
export declare function printCliOutcome(input: {
    readonly title: string;
    readonly verdict: string;
    readonly why?: readonly string[];
    readonly nextActions?: readonly string[];
    readonly artifactPaths?: readonly string[];
    readonly repoRoot: string;
    readonly redact?: boolean;
    readonly details?: readonly string[];
}): void;
export declare function displayPath(repoRoot: string, fullPath: string, redact?: boolean): string;
