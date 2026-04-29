export declare function deterministicId(prefix: string, payload: unknown): string;
export declare function normalizeRepairPath(path: string): string | null;
export declare function pathExistsInRepo(repoRoot: string, repoPath: string): boolean;
export declare function readJsonFile<T>(path: string): T;
export declare function uniqueSorted(values: readonly string[]): string[];
export declare function globToRegex(glob: string): RegExp;
export declare function matchesPattern(path: string, pattern: string): boolean;
