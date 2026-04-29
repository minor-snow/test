import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postOrUpdatePantheonComment } from "../../src/github/githubCommentClient.js";
describe("githubCommentClient", () => {
    const originalFetch = global.fetch;
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });
    it("creates a new comment when no existing marker comment is found", async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce(makeResponse([{ id: 1, body: "other", user: { login: "someone" } }]))
            .mockResolvedValueOnce(makeResponse({ id: 99 }));
        const result = await postOrUpdatePantheonComment({
            prContext: { owner: "saleor", repo: "saleor", prNumber: 42 },
            githubToken: "token",
            marker: "<!-- pantheon -->",
            markdown: "<!-- pantheon -->\nbody",
        });
        expect(result).toEqual({ status: "created", commentId: 99 });
    });
    it("updates an existing bot comment with the marker", async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce(makeResponse([{ id: 5, body: "<!-- pantheon -->", user: { login: "github-actions[bot]" } }]))
            .mockResolvedValueOnce(makeResponse({ id: 5 }));
        const result = await postOrUpdatePantheonComment({
            prContext: { owner: "saleor", repo: "saleor", prNumber: 42 },
            githubToken: "token",
            marker: "<!-- pantheon -->",
            markdown: "<!-- pantheon -->\nupdated",
        });
        expect(result).toEqual({ status: "updated", commentId: 5 });
    });
    it("returns failed instead of throwing on api error", async () => {
        global.fetch = vi.fn().mockResolvedValue(makeResponse({ message: "bad" }, 500));
        const result = await postOrUpdatePantheonComment({
            prContext: { owner: "saleor", repo: "saleor", prNumber: 42 },
            githubToken: "token",
            marker: "<!-- pantheon -->",
            markdown: "<!-- pantheon -->\nupdated",
        });
        expect(result.status).toBe("failed");
    });
});
function makeResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    };
}
//# sourceMappingURL=githubCommentClient.test.js.map