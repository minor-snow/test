import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { closeReviewRequest, loadReviewQueue, writeReviewRequest } from "../../src/review/reviewQueueStore.js";
describe("reviewQueueStore", () => {
    const tmpDir = join("test", "review", "__tmp_queue__");
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("writes review requests and keeps an open/closed queue index", () => {
        const request = {
            schema_version: "pantheon_review_request@0.1.0",
            review_id: "review_repair_1",
            repair_id: "repair_1",
            contract_revision: 1,
            source: "local_cli",
            status: "open",
            attention_level: "human_review",
            verdict: "requires_review",
            reason: "Human review required.",
            files: [{
                    path: "src/models/User.ts",
                    bucket: "review_required",
                    reason: "Model change requires review.",
                }],
            recommended_actions: ["human_review"],
            created_at: "2026-04-29T00:00:00.000Z",
            updated_at: "2026-04-29T00:00:00.000Z",
        };
        writeReviewRequest(tmpDir, request);
        let queue = loadReviewQueue(tmpDir);
        expect(queue.open).toHaveLength(1);
        expect(existsSync(join(tmpDir, ".pantheon", "reviews", "review_requests", "review_repair_1.md"))).toBe(true);
        closeReviewRequest(tmpDir, "repair_1");
        queue = loadReviewQueue(tmpDir);
        expect(queue.open).toHaveLength(0);
        expect(queue.closed).toHaveLength(1);
        expect(readFileSync(join(tmpDir, ".pantheon", "reviews", "review_queue.json"), "utf-8")).toContain("\"closed\"");
    });
});
//# sourceMappingURL=reviewQueueStore.test.js.map