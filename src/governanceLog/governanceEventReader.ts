import { existsSync, readFileSync } from "node:fs";
import type { GovernanceEvent } from "./governanceEventTypes.js";
import { governancePaths } from "./governanceEventWriter.js";

export function readGovernanceEvents(repoRoot: string): GovernanceEvent[] {
  const path = governancePaths(repoRoot).events;
  if (!existsSync(path)) {
    return [];
  }
  const text = readFileSync(path, "utf-8").trim();
  if (!text) {
    return [];
  }
  return text.split(/\r?\n/).map(line => JSON.parse(line) as GovernanceEvent);
}

export function readGovernanceEventsForDate(repoRoot: string, isoDate: string): GovernanceEvent[] {
  return readGovernanceEvents(repoRoot).filter(event => event.timestamp.startsWith(isoDate));
}
