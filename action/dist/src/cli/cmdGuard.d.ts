/**
 * P24: pantheon guard "<intent>" --scope <path-or-glob>
 *
 * Scans the repo, builds contract + scope from user-specified authorized paths,
 * writes task.md / scope.md / check.json.
 *
 * --scope is REQUIRED in v1. Pantheon does not auto-infer scope from intent.
 */
export declare function cmdGuard(input: {
    repoRoot: string;
    intent: string;
    scopePatterns: string[];
    reviewPatterns?: string[];
    forbiddenPatterns?: string[];
    configPath?: string;
}): void;
