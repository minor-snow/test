import type { ChangeCheckResult } from "../change/types.js";
export declare function renderChangePrComment(result: ChangeCheckResult, options: {
    baseSha?: string;
    headSha?: string;
    type: string;
}): {
    marker: string;
    markdown: string;
};
