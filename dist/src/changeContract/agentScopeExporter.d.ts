/**
 * P19c: Agent Scope Exporter
 *
 * Exports agent-consumable scope instructions from a ChangeContract.
 * This is the bridge between the governance contract and the AI agent's
 * working boundary.
 *
 * The exporter:
 *   1. Validates the contract is in "scoped" status
 *   2. Renders agent instructions (markdown for .cursor/rules/)
 *   3. Transitions the contract to "exported" with an agent_scope_exported event
 *   4. Returns the exported contract + rendered output
 *
 * Design invariants:
 *   - Only "scoped" contracts can be exported (fail-closed).
 *   - The output embeds the contract_id and scope_hash for traceability.
 *   - The agent.exported flag is set and instructions_path recorded.
 *   - The handoff_hash on agent is set to the hash of the exported content.
 *   - Generic advice phrases are rejected — all rules must reference
 *     concrete files, tests, or constraints.
 *
 * ref: P19c
 */
import type { ChangeContract } from "./types.js";
export type AgentScopeExportInput = {
    /** The ChangeContract to export. Must be in "scoped" status. */
    contract: ChangeContract;
    /** Target output path for the instructions file. */
    instructions_path: string;
    /** Timestamp override for deterministic testing. */
    timestamp?: string;
};
export type AgentScopeExportResult = {
    /** Updated contract in "exported" status. */
    contract: ChangeContract;
    /** Rendered agent instructions (markdown). */
    instructions: string;
    /** SHA-256 hash of the rendered instructions. */
    instructions_hash: string;
};
/**
 * Export agent scope instructions from a ChangeContract.
 *
 * @throws if the contract is not in "scoped" status.
 */
export declare function exportAgentScope(input: AgentScopeExportInput): AgentScopeExportResult;
