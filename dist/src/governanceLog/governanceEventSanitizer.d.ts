import type { GovernanceEvent, GovernanceEventSanitizationViolation } from "./governanceEventTypes.js";
export declare function sanitizeGovernanceEvent(event: GovernanceEvent): {
    readonly clean: boolean;
    readonly violations: readonly GovernanceEventSanitizationViolation[];
};
