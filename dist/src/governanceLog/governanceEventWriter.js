import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { resolvePantheonDir } from "../cli/artifactLayout.js";
import { sanitizeGovernanceEvent } from "./governanceEventSanitizer.js";
export function governancePaths(repoRoot) {
    const dir = join(resolvePantheonDir(repoRoot), "governance");
    return {
        dir,
        events: join(dir, "events.jsonl"),
    };
}
export function ensureGovernanceDirs(repoRoot) {
    const paths = governancePaths(repoRoot);
    mkdirSync(paths.dir, { recursive: true });
    return paths;
}
export function appendGovernanceEvent(repoRoot, event) {
    const paths = ensureGovernanceDirs(repoRoot);
    const sanitized = sanitizeGovernanceEvent(event);
    if (!sanitized.clean) {
        const detail = sanitized.violations.map(violation => violation.message).join("; ");
        throw new Error(`Governance event sanitizer rejected event ${event.event_type}: ${detail}`);
    }
    if (!existsSync(paths.events)) {
        appendFileSync(paths.events, "");
    }
    appendFileSync(paths.events, `${JSON.stringify(event)}\n`);
}
//# sourceMappingURL=governanceEventWriter.js.map