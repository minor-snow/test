import type { GovernanceEvent } from "./governanceEventTypes.js";
export declare function readGovernanceEvents(repoRoot: string): GovernanceEvent[];
export declare function readGovernanceEventsForDate(repoRoot: string, isoDate: string): GovernanceEvent[];
