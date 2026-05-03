import type { ChangeType } from "./types.js";
export type InferredChange = {
    change_type: ChangeType;
    targets: string[];
    risk: "pass" | "requires_review" | "requires_contract";
};
export declare function inferChangeFromDiff(repoRoot: string): InferredChange;
