import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { appendGovernanceEvent, governancePaths } from "../../src/governanceLog/governanceEventWriter.js";
describe("governanceEventWriter", () => {
    const tmpDir = join("test", "governanceLog", "__tmp_writer__");
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("appends sanitized governance events to the local ledger", () => {
        appendGovernanceEvent(tmpDir, {
            schema_version: "pantheon_governance_event@0.1.0",
            event_id: "gov_1",
            timestamp: "2026-04-29T00:00:00.000Z",
            source: "local_cli",
            event_type: "repair_check_completed",
            repair_id: "repair_1",
            verdict: "requires_review",
            attention_level: "human_review",
            changed_files_count: 2,
            bucket_counts: {
                allowed: 1,
                review_required: 1,
                forbidden: 0,
                outside_scope: 0,
            },
            reasons: [{
                    kind: "review_required",
                    file: "src/models/User.ts",
                    action: "human_review",
                }],
        });
        const path = governancePaths(tmpDir).events;
        expect(existsSync(path)).toBe(true);
        expect(readFileSync(path, "utf-8")).toContain("\"event_type\":\"repair_check_completed\"");
    });
    it("rejects governance events that contain diff hunk markers", () => {
        expect(() => appendGovernanceEvent(tmpDir, {
            schema_version: "pantheon_governance_event@0.1.0",
            event_id: "gov_bad",
            timestamp: "2026-04-29T00:00:00.000Z",
            source: "local_cli",
            event_type: "repair_blocked",
            repair_id: "repair_1",
            verdict: "fail",
            attention_level: "urgent",
            reasons: [{
                    kind: "outside_scope",
                    file: "@@ -1,3 +1,3 @@",
                    action: "block_merge",
                }],
        })).toThrow(/sanitizer/i);
    });
});
//# sourceMappingURL=governanceEventWriter.test.js.map