/**
 * P18: Diff Parser
 *
 * Extracts changed file paths from git diff text.
 * Supports unified diff and name-only formats.
 *
 * ref: P18
 */
export declare function extractChangedFilesFromDiff(diffText: string): {
    changed_files: string[];
    warnings: string[];
};
