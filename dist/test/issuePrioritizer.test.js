/**
 * Issue Prioritizer — Tests
 *
 * ref: P7b-001
 */
import { describe, it, expect } from "vitest";
import { prioritizeIssues, getIssueTier, countByTier, MAX_TIER, } from "../src/issuePrioritizer.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeIssue(issueType, artifactId = "art_001", blockId = "b_001") {
    return {
        issue_id: `issue_${issueType}_${blockId}`,
        artifact_id: artifactId,
        base_revision_id: "rev_test",
        target_block_id: blockId,
        issue_type: issueType,
        severity: "medium",
        message: `Test issue: ${issueType}`,
    };
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("P7b-001: IssuePrioritizer", () => {
    it("returns correct tier for known issue types", () => {
        expect(getIssueTier("stale_link")).toBe(1);
        expect(getIssueTier("stale_interface_link")).toBe(1);
        expect(getIssueTier("orphan_interface_contract")).toBe(2);
        expect(getIssueTier("orphan_module_contract")).toBe(2);
        expect(getIssueTier("unsafe_canonical_commit")).toBe(3);
        expect(getIssueTier("empty_block_text")).toBe(4);
        expect(getIssueTier("domain_irrelevant_content")).toBe(5);
        expect(getIssueTier("undefined_term")).toBe(6);
        expect(getIssueTier("redundant_narrative")).toBe(7);
    });
    it("returns default tier for unknown issue types", () => {
        expect(getIssueTier("unknown_rule")).toBe(MAX_TIER);
        expect(getIssueTier("custom_check")).toBe(MAX_TIER);
    });
    it("sorts stale_link before undefined_term", () => {
        const issues = [
            makeIssue("undefined_term"),
            makeIssue("stale_link"),
        ];
        const sorted = prioritizeIssues(issues);
        expect(sorted[0].issue_type).toBe("stale_link");
        expect(sorted[1].issue_type).toBe("undefined_term");
    });
    it("sorts orphan before unsafe_canonical_commit", () => {
        const issues = [
            makeIssue("unsafe_canonical_commit"),
            makeIssue("orphan_interface_contract"),
        ];
        const sorted = prioritizeIssues(issues);
        expect(sorted[0].issue_type).toBe("orphan_interface_contract");
        expect(sorted[1].issue_type).toBe("unsafe_canonical_commit");
    });
    it("sorts by artifact_id within same tier", () => {
        const issues = [
            makeIssue("undefined_term", "zzz_artifact", "b_001"),
            makeIssue("undefined_term", "aaa_artifact", "b_001"),
        ];
        const sorted = prioritizeIssues(issues);
        expect(sorted[0].artifact_id).toBe("aaa_artifact");
        expect(sorted[1].artifact_id).toBe("zzz_artifact");
    });
    it("sorts by block_id within same tier and artifact", () => {
        const issues = [
            makeIssue("stale_link", "art_001", "b_999"),
            makeIssue("stale_link", "art_001", "b_001"),
        ];
        const sorted = prioritizeIssues(issues);
        expect(sorted[0].target_block_id).toBe("b_001");
        expect(sorted[1].target_block_id).toBe("b_999");
    });
    it("does not mutate input array", () => {
        const issues = [
            makeIssue("undefined_term"),
            makeIssue("stale_link"),
        ];
        const original = [...issues];
        prioritizeIssues(issues);
        expect(issues).toEqual(original);
    });
    it("is deterministic across calls", () => {
        const issues = [
            makeIssue("redundant_narrative", "art_b", "b_003"),
            makeIssue("stale_link", "art_a", "b_001"),
            makeIssue("undefined_term", "art_c", "b_002"),
            makeIssue("orphan_interface_contract", "art_a", "b_004"),
            makeIssue("empty_block_text", "art_b", "b_005"),
        ];
        const sorted1 = prioritizeIssues(issues);
        const sorted2 = prioritizeIssues(issues);
        expect(sorted1.map(i => i.issue_id)).toEqual(sorted2.map(i => i.issue_id));
    });
    it("countByTier produces correct counts", () => {
        const issues = [
            makeIssue("stale_link"),
            makeIssue("stale_link"),
            makeIssue("undefined_term"),
            makeIssue("orphan_interface_contract"),
            makeIssue("redundant_narrative"),
        ];
        const counts = countByTier(issues);
        expect(counts[1]).toBe(2); // stale_link
        expect(counts[2]).toBe(1); // orphan
        expect(counts[6]).toBe(1); // undefined_term
        expect(counts[7]).toBe(1); // redundant
    });
    it("handles empty array", () => {
        expect(prioritizeIssues([])).toEqual([]);
        expect(countByTier([])).toEqual({});
    });
    it("full tier ordering is correct", () => {
        const issues = [
            makeIssue("redundant_narrative"),
            makeIssue("undefined_term"),
            makeIssue("domain_irrelevant_content"),
            makeIssue("empty_block_text"),
            makeIssue("unsafe_canonical_commit"),
            makeIssue("orphan_module_contract"),
            makeIssue("stale_interface_link"),
            makeIssue("stale_link"),
            makeIssue("orphan_interface_contract"),
        ];
        const sorted = prioritizeIssues(issues);
        const tiers = sorted.map(i => getIssueTier(i.issue_type));
        // Verify tiers are non-decreasing (correct priority order)
        for (let i = 1; i < tiers.length; i++) {
            expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
        }
        // Verify first items are tier 1 (stale links)
        expect(tiers[0]).toBe(1);
        expect(tiers[1]).toBe(1);
        // Then tier 2 (orphans)
        expect(tiers[2]).toBe(2);
        expect(tiers[3]).toBe(2);
        // Then tier 3-7
        expect(tiers[4]).toBe(3);
        expect(tiers[5]).toBe(4);
        expect(tiers[6]).toBe(5);
        expect(tiers[7]).toBe(6);
        expect(tiers[8]).toBe(7);
    });
});
//# sourceMappingURL=issuePrioritizer.test.js.map