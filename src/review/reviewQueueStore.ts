import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteJson, atomicWriteText } from "../repair/session/atomicWrite.js";
import { resolvePantheonDir } from "../cli/artifactLayout.js";
import { renderReviewRequestMarkdown } from "./reviewRequestRenderer.js";
import type { ReviewQueue, ReviewRequest } from "./reviewRequestTypes.js";

const REVIEW_QUEUE_LOCK_TIMEOUT_MS = 5_000;
const REVIEW_QUEUE_LOCK_POLL_MS = 25;

export type ReviewPaths = {
  readonly dir: string;
  readonly requestsDir: string;
  readonly queue: string;
};

export function reviewPaths(repoRoot: string): ReviewPaths {
  const dir = join(resolvePantheonDir(repoRoot), "reviews");
  return {
    dir,
    requestsDir: join(dir, "review_requests"),
    queue: join(dir, "review_queue.json"),
  };
}

export function ensureReviewDirs(repoRoot: string): ReviewPaths {
  const paths = reviewPaths(repoRoot);
  mkdirSync(paths.dir, { recursive: true });
  mkdirSync(paths.requestsDir, { recursive: true });
  return paths;
}

export function reviewRequestPaths(repoRoot: string, repairId: string): {
  readonly json: string;
  readonly markdown: string;
} {
  const paths = ensureReviewDirs(repoRoot);
  return {
    json: join(paths.requestsDir, `review_${repairId}.json`),
    markdown: join(paths.requestsDir, `review_${repairId}.md`),
  };
}

export function writeReviewRequest(repoRoot: string, request: ReviewRequest): void {
  withReviewQueueLock(repoRoot, "write_review_request", () => {
    const requestPaths = reviewRequestPaths(repoRoot, request.repair_id);
    atomicWriteJson(requestPaths.json, request);
    atomicWriteText(requestPaths.markdown, renderReviewRequestMarkdown(request));
    refreshReviewQueueUnlocked(repoRoot);
  });
}

export function loadReviewRequest(repoRoot: string, repairId: string): ReviewRequest | null {
  const jsonPath = reviewRequestPaths(repoRoot, repairId).json;
  if (!existsSync(jsonPath)) {
    return null;
  }
  return JSON.parse(readFileSync(jsonPath, "utf-8")) as ReviewRequest;
}

export function closeReviewRequest(repoRoot: string, repairId: string, status: ReviewRequest["status"] = "closed"): ReviewRequest | null {
  return withReviewQueueLock(repoRoot, "close_review_request", () => {
    const current = loadReviewRequest(repoRoot, repairId);
    if (!current) {
      return null;
    }
    const updated: ReviewRequest = {
      ...current,
      status,
      updated_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    };
    const requestPaths = reviewRequestPaths(repoRoot, updated.repair_id);
    atomicWriteJson(requestPaths.json, updated);
    atomicWriteText(requestPaths.markdown, renderReviewRequestMarkdown(updated));
    refreshReviewQueueUnlocked(repoRoot);
    return updated;
  });
}

export function loadReviewQueue(repoRoot: string): ReviewQueue {
  const paths = ensureReviewDirs(repoRoot);
  if (!existsSync(paths.queue)) {
    return refreshReviewQueue(repoRoot);
  }
  return JSON.parse(readFileSync(paths.queue, "utf-8")) as ReviewQueue;
}

export function refreshReviewQueue(repoRoot: string): ReviewQueue {
  return withReviewQueueLock(repoRoot, "refresh_review_queue", () => refreshReviewQueueUnlocked(repoRoot));
}

function refreshReviewQueueUnlocked(repoRoot: string): ReviewQueue {
  const paths = ensureReviewDirs(repoRoot);
  const requests = readdirSync(paths.requestsDir)
    .filter(name => name.endsWith(".json"))
    .map(name => JSON.parse(readFileSync(join(paths.requestsDir, name), "utf-8")) as ReviewRequest)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const queue: ReviewQueue = {
    schema_version: "pantheon_review_queue@0.1.0",
    open: requests.filter(request => request.status === "open"),
    closed: requests.filter(request => request.status !== "open"),
    updated_at: new Date().toISOString(),
  };
  atomicWriteJson(paths.queue, queue);
  return queue;
}

function withReviewQueueLock<T>(repoRoot: string, operation: string, fn: () => T): T {
  const lockPath = join(reviewPaths(repoRoot).dir, ".queue.lock");
  const createdAt = new Date().toISOString();
  const deadline = Date.now() + REVIEW_QUEUE_LOCK_TIMEOUT_MS;

  while (true) {
    try {
      mkdirSync(reviewPaths(repoRoot).dir, { recursive: true });
      const fd = openSync(lockPath, "wx");
      try {
        writeFileSync(fd, `${JSON.stringify({ pid: process.pid, created_at: createdAt, operation }, null, 2)}\n`);
      } finally {
        closeSync(fd);
      }
      break;
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "EEXIST") {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          "Another Pantheon review queue operation is active. Retry after it completes, or remove a stale lock if no process is running.",
        );
      }
      sleepSync(REVIEW_QUEUE_LOCK_POLL_MS);
    }
  }

  try {
    return fn();
  } finally {
    rmSync(lockPath, { force: true });
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
