/**
 * P24: pantheon feedback — Print .pantheon/feedback.md to stdout.
 * Supports --attempt N to print a specific attempt's feedback.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { publicPaths, resolvePantheonDir } from "./artifactLayout.js";
export function cmdFeedback(repoRoot, attempt) {
    const root = resolve(repoRoot);
    let feedbackPath;
    if (attempt !== undefined) {
        feedbackPath = join(resolvePantheonDir(root), "attempts", `attempt_${attempt}`, "feedback.md");
    }
    else {
        feedbackPath = publicPaths(root).feedback;
    }
    if (!existsSync(feedbackPath)) {
        if (attempt !== undefined) {
            console.error(`No feedback found for attempt ${attempt}.`);
        }
        else {
            console.error("No feedback found. Run 'pantheon check' first.");
        }
        process.exit(1);
    }
    console.log(readFileSync(feedbackPath, "utf-8"));
}
//# sourceMappingURL=cmdFeedback.js.map