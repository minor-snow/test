import type { RepoStateSnapshot } from "../../repair/session/repairSessionTypes.js";
export declare function cmdRepairPlan(input: {
    repoRoot: string;
    repairId: string;
    configPath?: string;
    overrideBaseSha?: string;
    overrideHeadSha?: string;
    overrideCheckoutSha?: string;
    overrideSource?: RepoStateSnapshot["source"];
    sourceOverride?: "local_cli" | "github_action";
    json?: boolean;
}): void;
