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
export function tryAppendGovernanceEvent(repoRoot, event) {
    const paths = ensureGovernanceDirs(repoRoot);
    const sanitized = sanitizeGovernanceEvent(event);
    if (!sanitized.clean) {
        const detail = sanitized.violations.map(violation => violation.message).join("; ");
        return {
            ok: false,
            error_kind: "invalid_event",
            path: paths.events,
            message: `Governance event sanitizer rejected event ${event.event_type}: ${detail}`,
        };
    }
    try {
        if (!existsSync(paths.events)) {
            appendFileSync(paths.events, "");
        }
        appendFileSync(paths.events, `${JSON.stringify(event)}\n`);
        return {
            ok: true,
            event_id: event.event_id,
            path: paths.events,
        };
    }
    catch (error) {
        const code = error?.code;
        return {
            ok: false,
            error_kind: code === "EACCES" || code === "EPERM" ? "permission_denied" : "io_error",
            path: paths.events,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}
export function appendGovernanceEvent(repoRoot, event) {
    const result = tryAppendGovernanceEvent(repoRoot, event);
    if (!result.ok) {
        throw new Error(result.message);
    }
    return result;
}
//# sourceMappingURL=governanceEventWriter.js.map