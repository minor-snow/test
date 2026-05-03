/**
 * P22: Agent Feedback Validator
 *
 * Validates structural correctness of AgentFeedback.
 */
import type { AgentFeedback } from "./types.js";
export type AgentFeedbackValidationResult = {
    readonly status: "valid" | "invalid";
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
};
export declare function validateAgentFeedback(feedback: AgentFeedback): AgentFeedbackValidationResult;
