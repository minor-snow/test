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

import { createHash } from "node:crypto";
import type {
  ChangeContract,
  AgentAdapter,
} from "./types.js";
import { transitionChangeContract, createResultEvent } from "./lifecycle.js";

// ---------------------------------------------------------------------------
// Export Input / Output
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Exporter
// ---------------------------------------------------------------------------

/**
 * Export agent scope instructions from a ChangeContract.
 *
 * @throws if the contract is not in "scoped" status.
 */
export function exportAgentScope(
  input: AgentScopeExportInput,
): AgentScopeExportResult {
  const { contract, instructions_path } = input;
  const now = input.timestamp ?? new Date().toISOString();

  // --- Guard: only scoped contracts can be exported ---
  if (contract.lifecycle_status !== "scoped") {
    throw new Error(
      `Cannot export agent scope: contract is in '${contract.lifecycle_status}' status, ` +
      `expected 'scoped'. Contract: ${contract.contract_id}`,
    );
  }

  // --- Render instructions ---
  const instructions = renderAgentInstructions(contract);
  const instructionsHash = hashString(instructions);

  // --- Transition to exported ---
  const exportEvent = createResultEvent(
    "agent_scope_exported",
    "ok",
    `Scope exported for ${contract.agent.adapter} adapter`,
    {
      instructions_hash: instructionsHash,
      instructions_path,
      scope_hash: contract.scope.scope_hash,
    },
    now,
  );

  let exported = transitionChangeContract(contract, "exported", exportEvent);

  // --- Update agent metadata ---
  exported = {
    ...exported,
    agent: {
      ...exported.agent,
      exported: true,
      instructions_path,
      handoff_hash: instructionsHash,
    },
  };

  return {
    contract: exported,
    instructions,
    instructions_hash: instructionsHash,
  };
}

// ---------------------------------------------------------------------------
// Instruction Renderer
// ---------------------------------------------------------------------------

/**
 * Render agent-facing markdown instructions from a ChangeContract.
 *
 * The output is designed to be placed in .cursor/rules/ or equivalent.
 * Every rule is concrete — no generic advice allowed.
 */
function renderAgentInstructions(contract: ChangeContract): string {
  const lines: string[] = [];
  const { scope, impact, change, verification } = contract;

  // Header with traceability
  lines.push("# Pantheon Change Contract Boundaries");
  lines.push("");
  lines.push(`Contract: \`${contract.contract_id}\``);
  lines.push(`Scope: \`${scope.scope_hash}\``);
  lines.push(`Adapter: \`${contract.agent.adapter}\``);
  lines.push("");

  // Intent
  lines.push("## Change Intent");
  lines.push("");
  lines.push(`> ${change.intent}`);
  lines.push("");

  // Risk
  lines.push("## Risk Level");
  lines.push("");
  lines.push(`- Risk: **${impact.risk_level.toUpperCase()}**`);
  lines.push(`- Changed nodes: ${impact.changed_nodes.length}`);
  lines.push(`- Impacted files: ${impact.impacted_files.length}`);
  lines.push(`- Impacted tests: ${impact.impacted_tests.length}`);
  if (scope.must_require_human_review) {
    lines.push("- **Human review: REQUIRED**");
  }
  lines.push("");

  // Allowed files (per-file operations)
  lines.push("## Allowed Files");
  lines.push("");
  if (scope.allowed_files.length > 0) {
    lines.push("You may modify only these files, with the listed operations:");
    lines.push("");
    for (const f of scope.allowed_files) {
      const ops = f.allowed_operations.join(", ");
      lines.push(`- \`${f.path}\` (${ops})`);
    }
  } else {
    lines.push("No files are allowed for modification.");
  }
  lines.push("");

  // Forbidden files
  lines.push("## Forbidden Files");
  lines.push("");
  lines.push("Do NOT modify or create files matching these patterns:");
  lines.push("");
  for (const pattern of scope.forbidden_paths) {
    lines.push(`- \`${pattern}\``);
  }
  lines.push("");

  // Required tests (from scoped P17 obligations, not blast radius)
  if (scope.required_tests.length > 0) {
    lines.push("## Required Tests");
    lines.push("");
    lines.push("These tests are scoped obligations:");
    lines.push("");
    for (const t of scope.required_tests) {
      const req = t.requirement === "must_run" ? "must run" : "update if behavior changes";
      lines.push(`- \`${t.test_id}\` — **${req}**`);
      if (t.file_path) {
        lines.push(`  - File: \`${t.file_path}\``);
      }
    }
    lines.push("");
  }

  // Forbidden assumptions
  if (scope.forbidden_assumptions.length > 0) {
    lines.push("## Forbidden Assumptions");
    lines.push("");
    lines.push("These assumptions are explicitly forbidden:");
    lines.push("");
    for (const fa of scope.forbidden_assumptions) {
      lines.push(`- **${fa}**`);
    }
    lines.push("");
  }

  // Escalation rules
  if (scope.escalation_rules.length > 0) {
    lines.push("## Escalation — Stop and Report If");
    lines.push("");
    lines.push("Stop and create a Pantheon reverse issue if:");
    lines.push("");
    for (const rule of scope.escalation_rules) {
      lines.push(`- ${rule}`);
    }
    lines.push("");
  }

  // Verification obligations
  const pendingObligations = verification.obligations.filter(
    o => o.required && o.status === "pending",
  );
  if (pendingObligations.length > 0) {
    lines.push("## Verification Obligations");
    lines.push("");
    for (const obl of pendingObligations) {
      lines.push(`- **${obl.type}**: ${obl.description}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("This file is auto-generated by Pantheon. Do not edit manually.");
  lines.push(`Generated from contract \`${contract.contract_id}\` scope \`${scope.scope_hash}\`.`);
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashString(s: string): string {
  return "sha256:" + createHash("sha256").update(s).digest("hex");
}
