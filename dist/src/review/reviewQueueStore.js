import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteJson, atomicWriteText } from "../repair/session/atomicWrite.js";
import { resolvePantheonDir } from "../cli/artifactLayout.js";
import { renderReviewRequestMarkdown } from "./reviewRequestRenderer.js";
export function reviewPaths(repoRoot) {
    const dir = join(resolvePantheonDir(repoRoot), "reviews");
    return {
        dir,
        requestsDir: join(dir, "review_requests"),
        queue: join(dir, "review_queue.json"),
    };
}
export function ensureReviewDirs(repoRoot) {
    const paths = reviewPaths(repoRoot);
    mkdirSync(paths.dir, { recursive: true });
    mkdirSync(paths.requestsDir, { recursive: true });
    return paths;
}
export function reviewRequestPaths(repoRoot, repairId) {
    const paths = ensureReviewDirs(repoRoot);
    return {
        json: join(paths.requestsDir, `review_${repairId}.json`),
        markdown: join(paths.requestsDir, `review_${repairId}.md`),
    };
}
export function writeReviewRequest(repoRoot, request) {
    const requestPaths = reviewRequestPaths(repoRoot, request.repair_id);
    atomicWriteJson(requestPaths.json, request);
    atomicWriteText(requestPaths.markdown, renderReviewRequestMarkdown(request));
    refreshReviewQueue(repoRoot);
}
export function loadReviewRequest(repoRoot, repairId) {
    const jsonPath = reviewRequestPaths(repoRoot, repairId).json;
    if (!existsSync(jsonPath)) {
        return null;
    }
    return JSON.parse(readFileSync(jsonPath, "utf-8"));
}
export function closeReviewRequest(repoRoot, repairId, status = "closed") {
    const current = loadReviewRequest(repoRoot, repairId);
    if (!current) {
        return null;
    }
    const updated = {
        ...current,
        status,
        updated_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
    };
    writeReviewRequest(repoRoot, updated);
    return updated;
}
export function loadReviewQueue(repoRoot) {
    const paths = ensureReviewDirs(repoRoot);
    if (!existsSync(paths.queue)) {
        return refreshReviewQueue(repoRoot);
    }
    return JSON.parse(readFileSync(paths.queue, "utf-8"));
}
export function refreshReviewQueue(repoRoot) {
    const paths = ensureReviewDirs(repoRoot);
    const requests = readdirSync(paths.requestsDir)
        .filter(name => name.endsWith(".json"))
        .map(name => JSON.parse(readFileSync(join(paths.requestsDir, name), "utf-8")))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const queue = {
        schema_version: "pantheon_review_queue@0.1.0",
        open: requests.filter(request => request.status === "open"),
        closed: requests.filter(request => request.status !== "open"),
        updated_at: new Date().toISOString(),
    };
    atomicWriteJson(paths.queue, queue);
    return queue;
}
//# sourceMappingURL=reviewQueueStore.js.map