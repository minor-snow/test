import type { ChangeContract, ChangeCheckResult } from "./types.js";
export type VerifyChangeDiffInput = {
    contract: ChangeContract;
    diff: {
        base_ref: string;
        changed_files: Array<{
            path: string;
            status: "added" | "modified" | "deleted" | "renamed";
        }>;
        warnings: string[];
    };
};
export declare function verifyChangeDiff(input: VerifyChangeDiffInput): ChangeCheckResult;
