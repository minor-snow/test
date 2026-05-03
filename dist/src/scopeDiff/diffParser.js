/**
 * P18: Diff Parser
 *
 * Extracts changed file paths from git diff text.
 * Supports unified diff and name-only formats.
 *
 * ref: P18
 */
import { normalizePath } from "./fileClassifier.js";
export function extractChangedFilesFromDiff(diffText) {
    const files = new Set();
    const warnings = [];
    if (!diffText || diffText.trim().length === 0) {
        warnings.push("Empty diff text provided.");
        return { changed_files: [], warnings };
    }
    const lines = diffText.split("\n");
    let foundDiffGit = false;
    for (const line of lines) {
        // unified diff: diff --git a/path b/path
        const gitMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        if (gitMatch) {
            foundDiffGit = true;
            files.add(normalizePath(gitMatch[2]));
            continue;
        }
        // --- a/path or +++ b/path (fallback if no diff --git)
        if (!foundDiffGit) {
            const aMatch = line.match(/^--- a\/(.+)$/);
            if (aMatch) {
                files.add(normalizePath(aMatch[1]));
                continue;
            }
            const bMatch = line.match(/^\+\+\+ b\/(.+)$/);
            if (bMatch) {
                files.add(normalizePath(bMatch[1]));
                continue;
            }
        }
    }
    // If still nothing, try name-only format (one file per line)
    if (files.size === 0) {
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 0 && !trimmed.startsWith("#") && !trimmed.startsWith("diff") && /\.\w{1,6}$/.test(trimmed) && !trimmed.includes(" ")) {
                files.add(normalizePath(trimmed));
            }
        }
        if (files.size === 0) {
            warnings.push("Could not extract any file paths from diff text.");
        }
        else {
            warnings.push("Parsed diff as name-only format (no unified diff headers found).");
        }
    }
    return {
        changed_files: [...files],
        warnings,
    };
}
//# sourceMappingURL=diffParser.js.map