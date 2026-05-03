/**
 * P18.5-C / P18.5-B: Repair → Audit E2E Test
 *
 * Validates the complete chain:
 *   AgentBugReport → BugFinding → RepairContract → HumanAuditDecision → revised contract
 *
 * Key invariants tested:
 *   1. agent_hypothesis does NOT enter confirmed_facts
 *   2. human audit decisions are append-only (revision increments)
 *   3. forbidden scope entries cause verdict=fail
 *   4. audit_weight does not affect verdict
 *
 * ref: P18.5
 */
export {};
