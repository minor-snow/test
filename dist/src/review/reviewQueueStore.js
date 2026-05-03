import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteJson, atomicWriteText } from "../repair/session/atomicWrite.js";
import { resolvePantheonDir } from "../cli/artifactLayout.js";
import { renderReviewRequestMarkdown } from "./reviewRequestRenderer.js";
function normalizeReviewRequest(raw) {
    if (raw.schema_version === "pantheon_review_request@0.2.0" && raw.target) {
        return raw;
    }
    // Legacy or mixed
    const repairId = raw.repair_id || raw.target_id || "unknown";
    return {
        ...raw,
        schema_version: "pantheon_review_request@0.2.0",
        target: {
            target_type: raw.target_type || "repair",
            target_id: repairId,
            legacy_repair_id: repairId,
        },
    };
}
const REVIEW_QUEUE_LOCK_TIMEOUT_MS = 5_000;
const REVIEW_QUEUE_LOCK_POLL_MS = 25;
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
export function reviewRequestPaths(repoRoot, targetType, targetId) {
    const paths = ensureReviewDirs(repoRoot);
    const baseName = targetType === "repair" ? `review_${targetId}` : `review_${targetType}_${targetId}`;
    return {
        json: join(paths.requestsDir, `${baseName}.json`),
        markdown: join(paths.requestsDir, `${baseName}.md`),
    };
}
export function writeReviewRequest(repoRoot, request) {
    withReviewQueueLock(repoRoot, "write_review_request", () => {
        writeReviewRequestUnlocked(repoRoot, request);
    });
}
function writeReviewRequestUnlocked(repoRoot, request) {
    const targetType = request.target?.target_type ?? "repair";
    const targetId = request.target?.target_id ?? request.repair_id ?? "unknown";
    const requestPaths = reviewRequestPaths(repoRoot, targetType, targetId);
    atomicWriteJson(requestPaths.json, request);
    atomicWriteText(requestPaths.markdown, renderReviewRequestMarkdown(request));
    refreshReviewQueueUnlocked(repoRoot);
}
export function loadReviewRequest(repoRoot, targetType, targetId) {
    const jsonPath = reviewRequestPaths(repoRoot, targetType, targetId).json;
    if (!existsSync(jsonPath)) {
        return null;
    }
    return normalizeReviewRequest(JSON.parse(readFileSync(jsonPath, "utf-8")));
}
export function closeReviewRequest(repoRoot, targetType, targetId, status = "closed") {
    return withReviewQueueLock(repoRoot, "close_review_request", () => {
        const current = loadReviewRequest(repoRoot, targetType, targetId);
        if (!current) {
            return null;
        }
        const updated = {
            ...current,
            status,
            updated_at: new Date().toISOString(),
            resolved_at: new Date().toISOString(),
        };
        writeReviewRequestUnlocked(repoRoot, updated);
        return updated;
    });
}
export function loadReviewQueue(repoRoot) {
    const paths = ensureReviewDirs(repoRoot);
    if (!existsSync(paths.queue)) {
        return refreshReviewQueue(repoRoot);
    }
    return JSON.parse(readFileSync(paths.queue, "utf-8"));
}
export function refreshReviewQueue(repoRoot) {
    return withReviewQueueLock(repoRoot, "refresh_review_queue", () => refreshReviewQueueUnlocked(repoRoot));
}
function refreshReviewQueueUnlocked(repoRoot) {
    const paths = ensureReviewDirs(repoRoot);
    const requests = readdirSync(paths.requestsDir)
        .filter(name => name.endsWith(".json"))
        .map(name => normalizeReviewRequest(JSON.parse(readFileSync(join(paths.requestsDir, name), "utf-8"))))
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
function withReviewQueueLock(repoRoot, operation, fn) {
    const lockPath = join(reviewPaths(repoRoot).dir, ".queue.lock");
    const createdAt = new Date().toISOString();
    const deadline = Date.now() + REVIEW_QUEUE_LOCK_TIMEOUT_MS;
    while (true) {
        try {
            mkdirSync(reviewPaths(repoRoot).dir, { recursive: true });
            const fd = openSync(lockPath, "wx");
            try {
                writeFileSync(fd, `${JSON.stringify({ pid: process.pid, created_at: createdAt, operation }, null, 2)}\n`);
            }
            finally {
                closeSync(fd);
            }
            break;
        }
        catch (error) {
            if (!isErrnoException(error) || error.code !== "EEXIST") {
                throw error;
            }
            if (Date.now() >= deadline) {
                throw new Error("Another Pantheon review queue operation is active. Retry after it completes, or remove a stale lock if no process is running.");
            }
            sleepSync(REVIEW_QUEUE_LOCK_POLL_MS);
        }
    }
    try {
        return fn();
    }
    finally {
        rmSync(lockPath, { force: true });
    }
}
function isErrnoException(error) {
    return typeof error === "object" && error !== null && "code" in error;
}
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
//# sourceMappingURL=reviewQueueStore.js.map