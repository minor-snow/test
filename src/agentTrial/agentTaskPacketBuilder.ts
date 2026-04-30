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

import { shortStableId } from "../deterministic.js";
import type { AgentScopeLite } from "../diffWorkflow/types.js";
import type { PetTrialScenario, AgentTaskPacket } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildAgentTaskPacket(input: {
  scenario: PetTrialScenario;
  scope: AgentScopeLite;
  attempt: number;
  previousFeedbackRef?: string;
}): AgentTaskPacket {
  const { scenario, scope, attempt, previousFeedbackRef } = input;
  const generatedAt = new Date().toISOString();

  return {
    schema_version: "agent_task_packet.v1",
    packet_id: shortStableId("pkt", {
      scenario_id: scenario.id,
      attempt,
      scope,
      previous_feedback_ref: previousFeedbackRef ?? null,
      generated_at: generatedAt,
    }),
    generated_at: generatedAt,
    scenario_id: scenario.id,
    attempt,

    intent: scenario.intent,

    scope: {
      allowed_files: [...scope.allowed_files],
      forbidden_patterns: scope.forbidden_patterns.map(fp => fp.pattern),
      required_tests: [...scope.required_tests],
    },

    stop_conditions: [
      "Do not modify .pantheon/**",
      "Do not modify .cursor/**",
      "Do not expand scope yourself",
      "If outside scope is required, stop and request Reverse Issue",
      "Do not modify governance artifacts",
    ],

    feedback_usage: {
      feedback_file_expected: ".pantheon/agent_feedback.json",
      rule: "If feedback is provided, follow allowed_agent_actions. fix_hint is advisory, not authorization.",
    },

    authority_rules: {
      json_authoritative: true,
      markdown_is_projection: true,
    },

    previous_feedback_ref: attempt >= 2 ? previousFeedbackRef : undefined,
  };
}
