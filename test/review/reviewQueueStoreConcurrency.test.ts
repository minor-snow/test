import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { loadReviewQueue, writeReviewRequest } from "../../src/review/reviewQueueStore.js";
import type { ReviewRequest } from "../../src/review/reviewRequestTypes.js";

describe("reviewQueueStore concurrency guard", () => {
  const tmpDir = join("test", "review", "__tmp_queue_concurrency__");

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("preserves multiple open review requests when writes happen back-to-back", async () => {
    const makeRequest = (repairId: string): ReviewRequest => ({
      schema_version: "pantheon_review_request@0.1.0",
      review_id: `review_${repairId}`,
      repair_id: repairId,
      contract_revision: 1,
      source: "local_cli",
      status: "open",
      attention_level: "human_review",
      verdict: "requires_review",
      reason: "Human review required.",
      files: [{
        path: `src/${repairId}.ts`,
        bucket: "review_required",
        reason: "Requires review.",
      }],
      recommended_actions: ["human_review"],
      created_at: "2026-04-30T00:00:00.000Z",
      updated_at: "2026-04-30T00:00:00.000Z",
    });

    await Promise.all([
      Promise.resolve().then(() => writeReviewRequest(tmpDir, makeRequest("repair_a"))),
      Promise.resolve().then(() => writeReviewRequest(tmpDir, makeRequest("repair_b"))),
    ]);

    const queue = loadReviewQueue(tmpDir);
    expect(queue.open.map(item => item.repair_id).sort()).toEqual(["repair_a", "repair_b"]);
  });
});
