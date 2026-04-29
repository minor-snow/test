/**
 * P22: Agent Feedback Protocol — Types
 *
 * Structured feedback protocol for AI agents.
 * Converts Pantheon verification/review results into
 * machine-consumable violation reports with repair guidance.
 *
 * Design invariants:
 *   - No feedback builder parses freeform reason strings.
 *   - repair_plan is advisory; allowed_agent_actions is authoritative.
 *   - requires_human = true means agent must not self-resolve without escalation.
 */
export {};
//# sourceMappingURL=types.js.map