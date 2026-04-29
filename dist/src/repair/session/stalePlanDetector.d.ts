import type { RepoStateSnapshot } from "./repairSessionTypes.js";
export type StalePlanDetection = {
    readonly kind: "stale_repair_contract" | "working_tree_changed";
    readonly severity: "warning" | "blocking";
    readonly reason: string;
    readonly recommended_action: "request_replan" | "continue";
};
export declare function detectStaleRepairPlan(input: {
    contractState: RepoStateSnapshot;
    currentState: RepoStateSnapshot;
}): readonly StalePlanDetection[];
