import { describe, expect, it } from "vitest";
import { renderReviewRequestMarkdown } from "../../src/review/reviewRequestRenderer.js";
describe("reviewRequestRenderer", () => {
    it("renders a readable markdown summary", () => {
        const markdown = renderReviewRequestMarkdown({
            schema_version: "pantheon_review_request@0.1.0",
            review_id: "review_repair_1",
            repair_id: "repair_1",
            contract_revision: 2,
            source: "github_action",
            status: "open",
            attention_level: "blocking",
            verdict: "requires_scope_expansion",
            reason: "Outside-scope file touched.",
            files: [{
                    path: "src/outside.ts",
                    bucket: "outside_scope",
                    reason: "Outside approved repair scope.",
                }],
            recommended_actions: ["request_scope_expansion"],
            created_at: "2026-04-29T00:00:00.000Z",
            updated_at: "2026-04-29T00:00:00.000Z",
        });
        expect(markdown).toContain("Pantheon Review Request");
        expect(markdown).toContain("Request scope expansion before modifying additional files.");
        expect(markdown).toContain("src/outside.ts");
    });
});
//# sourceMappingURL=reviewRequestRenderer.test.js.map