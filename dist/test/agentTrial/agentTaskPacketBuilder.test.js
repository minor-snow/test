/**
 * P23: Agent Task Packet Builder Tests
 */
import { describe, it, expect } from "vitest";
import { buildAgentTaskPacket } from "../../src/agentTrial/agentTaskPacketBuilder.js";
import { renderAgentTaskPacketMarkdown } from "../../src/agentTrial/agentTaskPacketRenderer.js";
import { getScenario } from "../../src/agentTrial/petTrialScenarios.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeScope() {
    return {
        schema_version: "agent_scope_lite.v1",
        scope_id: "scope-001",
        source_contract_id: "contract-001",
        source_observations_hash: "sha256:test",
        intent: "Test intent",
        allowed_files: ["src/auth/login.ts"],
        review_required_files: [],
        forbidden_patterns: [
            { pattern: ".pantheon/**", reason: "Governance artifacts" },
            { pattern: ".cursor/**", reason: "Agent rules" },
        ],
        required_tests: ["test/auth/login.test.ts"],
        instructions: [],
    };
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("buildAgentTaskPacket", () => {
    const scenario = getScenario("pet_out_of_scope_retry");
    const scope = makeScope();
    it("includes scope rules", () => {
        const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
        expect(packet.scope.allowed_files).toContain("src/auth/login.ts");
        expect(packet.scope.forbidden_patterns).toContain(".pantheon/**");
    });
    it("includes stop_conditions", () => {
        const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
        expect(packet.stop_conditions.length).toBeGreaterThan(0);
        expect(packet.stop_conditions.some(sc => sc.includes("Do not modify .pantheon"))).toBe(true);
    });
    it("does NOT include detailed feedback_contract in attempt 1", () => {
        const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
        expect(packet.previous_feedback_ref).toBeUndefined();
        // No detailed violation-by-violation contract
        expect(JSON.stringify(packet)).not.toContain("feedback_contract");
    });
    it("includes previous_feedback_ref in attempt 2", () => {
        const packet = buildAgentTaskPacket({
            scenario, scope, attempt: 2,
            previousFeedbackRef: ".pantheon/agent_feedback.json",
        });
        expect(packet.previous_feedback_ref).toBe(".pantheon/agent_feedback.json");
    });
    it("authority_rules.json_authoritative is true", () => {
        const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
        expect(packet.authority_rules.json_authoritative).toBe(true);
        expect(packet.authority_rules.markdown_is_projection).toBe(true);
    });
    it("feedback_usage.rule is present", () => {
        const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
        expect(packet.feedback_usage.rule).toContain("allowed_agent_actions");
        expect(packet.feedback_usage.feedback_file_expected).toContain("agent_feedback");
    });
    it("schema_version is agent_task_packet.v1", () => {
        const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
        expect(packet.schema_version).toBe("agent_task_packet.v1");
    });
    it("includes required_tests from scope", () => {
        const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
        expect(packet.scope.required_tests).toContain("test/auth/login.test.ts");
    });
});
describe("renderAgentTaskPacketMarkdown", () => {
    it("includes authority notice", () => {
        const packet = buildAgentTaskPacket({
            scenario: getScenario("pet_compliant_baseline"),
            scope: makeScope(),
            attempt: 1,
        });
        const md = renderAgentTaskPacketMarkdown(packet);
        expect(md).toContain("JSON file");
        expect(md).toContain("authoritative");
    });
    it("includes scope and stop conditions", () => {
        const packet = buildAgentTaskPacket({
            scenario: getScenario("pet_out_of_scope_retry"),
            scope: makeScope(),
            attempt: 1,
        });
        const md = renderAgentTaskPacketMarkdown(packet);
        expect(md).toContain("Allowed Files");
        expect(md).toContain("Stop Conditions");
        expect(md).toContain("src/auth/login.ts");
    });
});
//# sourceMappingURL=agentTaskPacketBuilder.test.js.map