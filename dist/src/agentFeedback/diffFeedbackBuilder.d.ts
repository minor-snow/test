/**
 * P22: Diff Feedback Builder
 *
 * Builds structured AgentFeedback from DiffVerificationResult + AgentScopeLite + ChangeContractLite.
 *
 * Design invariants:
 *   - NEVER parses freeform reason/error strings.
 *   - Consumes only structured fields: file_statuses, violation_hints, structured details.
 *   - repair_plan is advisory; allowed_agent_actions is authoritative.
 *   - requires_human = true means agent must not self-resolve.
 */
import type { DiffVerificationResult } from "../diffWorkflow/types.js";
import type { AgentScopeLite } from "../diffWorkflow/types.js";
import type { ChangeContractLite } from "../changeContract/lite/types.js";
import type { AgentFeedback } from "./types.js";
export declare function buildAgentFeedbackFromDiffVerification(input: {
    verification: DiffVerificationResult;
    scope: AgentScopeLite;
    contract: ChangeContractLite;
}): AgentFeedback;
