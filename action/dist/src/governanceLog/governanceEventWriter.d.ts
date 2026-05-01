import type { GovernanceEvent } from "./governanceEventTypes.js";
export type GovernancePaths = {
    readonly dir: string;
    readonly events: string;
};
export type GovernanceEventWriteResult = {
    readonly ok: true;
    readonly event_id: string;
    readonly path: string;
} | {
    readonly ok: false;
    readonly error_kind: "permission_denied" | "invalid_event" | "io_error";
    readonly path: string;
    readonly message: string;
};
export declare function governancePaths(repoRoot: string): GovernancePaths;
export declare function ensureGovernanceDirs(repoRoot: string): GovernancePaths;
export declare function tryAppendGovernanceEvent(repoRoot: string, event: GovernanceEvent): GovernanceEventWriteResult;
export declare function appendGovernanceEvent(repoRoot: string, event: GovernanceEvent): GovernanceEventWriteResult;
