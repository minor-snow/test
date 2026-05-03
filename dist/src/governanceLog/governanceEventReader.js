import { existsSync, readFileSync } from "node:fs";
import { governancePaths } from "./governanceEventWriter.js";
export function readGovernanceEvents(repoRoot) {
    const path = governancePaths(repoRoot).events;
    if (!existsSync(path)) {
        return [];
    }
    const text = readFileSync(path, "utf-8").trim();
    if (!text) {
        return [];
    }
    return text.split(/\r?\n/).map(line => JSON.parse(line));
}
export function readGovernanceEventsForDate(repoRoot, isoDate) {
    return readGovernanceEvents(repoRoot).filter(event => event.timestamp.startsWith(isoDate));
}
//# sourceMappingURL=governanceEventReader.js.map