import type { RepairCheck, RepairContract } from "../repair/types.js";
import type { ReviewRequest } from "./reviewRequestTypes.js";
export declare function buildReviewRequest(input: {
    repairId: string;
    contractRevision: number;
    source: "local_cli" | "github_action";
    check: RepairCheck;
    contract: RepairContract;
    pr?: {
        provider: "github";
        number?: number;
        url?: string;
    };
    sanitizerViolations?: number;
}): ReviewRequest | null;
