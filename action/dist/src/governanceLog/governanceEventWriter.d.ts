import type { GovernanceEvent } from "./governanceEventTypes.js";
export type GovernancePaths = {
    readonly dir: string;
    readonly events: string;
};
export declare function governancePaths(repoRoot: string): GovernancePaths;
export declare function ensureGovernanceDirs(repoRoot: string): GovernancePaths;
export declare function appendGovernanceEvent(repoRoot: string, event: GovernanceEvent): void;
