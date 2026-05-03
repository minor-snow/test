/**
 * P23: Agent Task Packet Builder
 *
 * Builds the AgentTaskPacket that an agent receives before starting work.
 *
 * Design:
 *   - Attempt 1: scope + stop conditions only. No detailed feedback_contract.
 *   - Attempt ≥ 2: includes reference to previous agent_feedback.json.
 *   - JSON is authoritative; markdown is a projection.
 */
import type { AgentScopeLite } from "../diffWorkflow/types.js";
import type { PetTrialScenario, AgentTaskPacket } from "./types.js";
export declare function buildAgentTaskPacket(input: {
    scenario: PetTrialScenario;
    scope: AgentScopeLite;
    attempt: number;
    previousFeedbackRef?: string;
}): AgentTaskPacket;
