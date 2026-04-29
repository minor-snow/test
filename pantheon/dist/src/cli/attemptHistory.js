/**
 * P24: Attempt History
 *
 * Lightweight attempt tracking for pantheon check.
 * Each check run creates attempts/attempt_N/ with report, feedback, check, diff.
 * check.json includes history summary.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolvePantheonDir } from "./artifactLayout.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Determine the next attempt number by scanning existing attempt dirs.
 */
export function nextAttemptNumber(repoRoot) {
    const attemptsDir = join(resolvePantheonDir(repoRoot), "attempts");
    if (!existsSync(attemptsDir))
        return 1;
    const entries = readdirSync(attemptsDir);
    let max = 0;
    for (const entry of entries) {
        const match = entry.match(/^attempt_(\d+)$/);
        if (match) {
            const n = parseInt(match[1], 10);
            if (n > max)
                max = n;
        }
    }
    return max + 1;
}
/**
 * Create the attempt directory and return its path.
 */
export function ensureAttemptDir(repoRoot, attempt) {
    const dir = join(resolvePantheonDir(repoRoot), "attempts", `attempt_${attempt}`);
    mkdirSync(dir, { recursive: true });
    return dir;
}
/**
 * Write an attempt record (report.md, feedback.md, check.json, diff_name_status.txt).
 */
export function writeAttemptArtifacts(attemptDir, artifacts) {
    writeFileSync(join(attemptDir, "report.md"), artifacts.reportMd);
    writeFileSync(join(attemptDir, "feedback.md"), artifacts.feedbackMd);
    writeFileSync(join(attemptDir, "check.json"), artifacts.checkJson);
    writeFileSync(join(attemptDir, "diff_name_status.txt"), artifacts.diffNameStatus);
}
/**
 * Load history of all past attempts from attempts/ directory.
 */
export function loadAttemptHistory(repoRoot) {
    const attemptsDir = join(resolvePantheonDir(repoRoot), "attempts");
    if (!existsSync(attemptsDir))
        return [];
    const records = [];
    const entries = readdirSync(attemptsDir).sort();
    for (const entry of entries) {
        const match = entry.match(/^attempt_(\d+)$/);
        if (!match)
            continue;
        const attempt = parseInt(match[1], 10);
        const checkPath = join(attemptsDir, entry, "check.json");
        if (!existsSync(checkPath))
            continue;
        try {
            const check = JSON.parse(readFileSync(checkPath, "utf-8"));
            records.push({
                attempt,
                verdict: check.verdict ?? "unknown",
                violation_count: (check.summary?.outside_scope ?? 0) +
                    (check.summary?.forbidden ?? 0),
                artifact_dir: `.pantheon/attempts/${entry}`,
                timestamp: check.timestamp ?? new Date().toISOString(),
            });
        }
        catch {
            // Corrupted attempt — skip
        }
    }
    return records;
}
/**
 * Enrich a PantheonCheckPublic with attempt number and history.
 */
export function enrichCheckWithHistory(check, attempt, history) {
    return {
        ...check,
        attempt,
        history,
    };
}
//# sourceMappingURL=attemptHistory.js.map