import type { ChangeCheckResult } from "../change/types.js";
export declare function renderChangePrComment(check: ChangeCheckResult, context?: {
    baseSha?: string;
    headSha?: string;
    type?: string;
}): {
    marker: string;
    markdown: string;
};
export declare function renderChangeStepSummary(check: ChangeCheckResult, context: {
    baseSha?: string;
    headSha?: string;
    type?: string;
}): {
    markdown: string;
};
