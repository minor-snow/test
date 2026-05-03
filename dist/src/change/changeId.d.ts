import type { ChangeType } from "./types.js";
export declare function generateChangeId(input: {
    schema_version: string;
    change_type: ChangeType;
    title: string;
    target_patterns: string[];
    base_sha: string;
}): string;
