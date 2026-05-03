import type { ReviewQueue, ReviewRequest } from "./reviewRequestTypes.js";
export type ReviewPaths = {
    readonly dir: string;
    readonly requestsDir: string;
    readonly queue: string;
};
export declare function reviewPaths(repoRoot: string): ReviewPaths;
export declare function ensureReviewDirs(repoRoot: string): ReviewPaths;
export declare function reviewRequestPaths(repoRoot: string, targetType: "repair" | "change" | "architecture", targetId: string): {
    readonly json: string;
    readonly markdown: string;
};
export declare function writeReviewRequest(repoRoot: string, request: ReviewRequest): void;
export declare function loadReviewRequest(repoRoot: string, targetType: "repair" | "change" | "architecture", targetId: string): ReviewRequest | null;
export declare function closeReviewRequest(repoRoot: string, targetType: "repair" | "change" | "architecture", targetId: string, status?: ReviewRequest["status"]): ReviewRequest | null;
export declare function loadReviewQueue(repoRoot: string): ReviewQueue;
export declare function refreshReviewQueue(repoRoot: string): ReviewQueue;
