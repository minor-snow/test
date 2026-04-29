/**
 * P19.1: Change Contract Validator
 *
 * Structural validator for ChangeContract objects.
 * Ensures schema completeness, lifecycle consistency, reference integrity,
 * obligation coherence, and event ledger monotonicity.
 *
 * Design invariants:
 *   - Validates against current schema: allowed_files[] / required_tests[]
 *   - Rejects waived obligations (future work requires operator override + audit)
 *   - Rejects .md authority refs (JSON is authoritative, Markdown is projection)
 *   - Top-level dump-field guard (no full artifact copies on contract)
 *   - Does NOT consume or validate Markdown output
 *
 * ref: P19.1
 */

import type { ChangeContract, ChangeContractLifecycleStatus } from "./types.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ValidationResult = {
  status: "valid" | "invalid";
  errors: string[];
  warnings: string[];
};

/**
 * Validate a ChangeContract for structural completeness and semantic coherence.
 *
 * Returns { status: "valid", errors: [], warnings: [...] } on success,
 * or { status: "invalid", errors: [...], warnings: [...] } on failure.
 */
export function validateChangeContract(contract: ChangeContract): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Identity ---
  checkIdentity(contract, errors);

  // --- Change Intent ---
  checkIntent(contract, errors);

  // --- Refs ---
  checkRefs(contract, errors);

  // --- Scope ---
  checkScope(contract, errors);

  // --- Impact ---
  checkImpact(contract, errors);

  // --- Agent ---
  checkAgent(contract, errors);

  // --- Verification Obligations ---
  checkObligations(contract, errors, warnings);

  // --- Result Events ---
  checkEvents(contract, errors);

  // --- Decision ---
  checkDecision(contract, errors);

  // --- Top-level dump guard ---
  checkDumpFields(contract, errors);

  // --- Markdown authority guard ---
  checkMarkdownAuthority(contract, errors);

  return {
    status: errors.length === 0 ? "valid" : "invalid",
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Identity Checks
// ---------------------------------------------------------------------------

function checkIdentity(c: ChangeContract, errors: string[]): void {
  if (!c.contract_id || typeof c.contract_id !== "string") {
    errors.push("contract_id is missing or not a string.");
  }
  if (!c.created_at) {
    errors.push("created_at is missing.");
  }
  if (!c.updated_at) {
    errors.push("updated_at is missing.");
  }

  const VALID_STATUSES: Set<ChangeContractLifecycleStatus> = new Set([
    "draft", "scoped", "exported", "verified", "escalated", "closed", "invalid",
  ]);
  if (!VALID_STATUSES.has(c.lifecycle_status)) {
    errors.push(`lifecycle_status '${c.lifecycle_status}' is not a valid status.`);
  }
}

// ---------------------------------------------------------------------------
// Intent Checks
// ---------------------------------------------------------------------------

function checkIntent(c: ChangeContract, errors: string[]): void {
  if (!c.change?.intent) {
    errors.push("change.intent is missing.");
  }
  if (!c.change?.source_request) {
    errors.push("change.source_request is missing.");
  }
}

// ---------------------------------------------------------------------------
// Refs Checks
// ---------------------------------------------------------------------------

const STATUSES_REQUIRING_SCOPE_DIFF: Set<ChangeContractLifecycleStatus> = new Set([
  "verified", "escalated", "closed",
]);

function checkRefs(c: ChangeContract, errors: string[]): void {
  if (!c.refs) {
    errors.push("refs is missing.");
    return;
  }

  if (!c.refs.canonical_revisions || c.refs.canonical_revisions.length === 0) {
    errors.push("refs.canonical_revisions is empty or missing.");
  }
  if (!c.refs.handoff_hash) {
    errors.push("refs.handoff_hash is missing.");
  }
  if (!c.refs.boundary_graph_hash) {
    errors.push("refs.boundary_graph_hash is missing.");
  }
  if (!c.refs.blast_radius_hash) {
    errors.push("refs.blast_radius_hash is missing.");
  }
  if (!c.refs.scoped_handoff_hash) {
    errors.push("refs.scoped_handoff_hash is missing.");
  }

  // scope_diff_report_hash is required after verification has occurred.
  if (STATUSES_REQUIRING_SCOPE_DIFF.has(c.lifecycle_status)) {
    if (!c.refs.scope_diff_report_hash) {
      errors.push(
        `refs.scope_diff_report_hash is required when lifecycle_status is '${c.lifecycle_status}'.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Scope Checks (aligned to current schema)
// ---------------------------------------------------------------------------

function checkScope(c: ChangeContract, errors: string[]): void {
  if (!c.scope) {
    errors.push("scope is missing.");
    return;
  }

  if (!c.scope.scope_hash) {
    errors.push("scope.scope_hash is missing.");
  }

  // allowed_files[]
  if (!Array.isArray(c.scope.allowed_files) || c.scope.allowed_files.length === 0) {
    errors.push("scope.allowed_files must be a non-empty array.");
  } else {
    for (let i = 0; i < c.scope.allowed_files.length; i++) {
      const f = c.scope.allowed_files[i];
      if (!f.path) {
        errors.push(`scope.allowed_files[${i}].path is missing.`);
      }
      if (!Array.isArray(f.allowed_operations) || f.allowed_operations.length === 0) {
        errors.push(`scope.allowed_files[${i}].allowed_operations must be a non-empty array.`);
      }
    }
  }

  // required_tests[]
  if (!Array.isArray(c.scope.required_tests)) {
    errors.push("scope.required_tests must be an array.");
  }

  if (!Array.isArray(c.scope.forbidden_paths)) {
    errors.push("scope.forbidden_paths must be an array.");
  }
  if (!Array.isArray(c.scope.forbidden_assumptions)) {
    errors.push("scope.forbidden_assumptions must be an array.");
  }
  if (!Array.isArray(c.scope.escalation_rules)) {
    errors.push("scope.escalation_rules must be an array.");
  }
  if (typeof c.scope.must_require_human_review !== "boolean") {
    errors.push("scope.must_require_human_review must be a boolean.");
  }
}

// ---------------------------------------------------------------------------
// Impact Checks
// ---------------------------------------------------------------------------

function checkImpact(c: ChangeContract, errors: string[]): void {
  if (!c.impact) {
    errors.push("impact is missing.");
    return;
  }

  const VALID_RISK: Set<string> = new Set(["low", "medium", "high"]);
  if (!VALID_RISK.has(c.impact.risk_level)) {
    errors.push(`impact.risk_level '${c.impact.risk_level}' is invalid.`);
  }
  if (!c.impact.impact_summary) {
    errors.push("impact.impact_summary is missing.");
  }
}

// ---------------------------------------------------------------------------
// Agent Checks
// ---------------------------------------------------------------------------

const SUPPORTED_ADAPTERS: Set<string> = new Set(["cursor", "manual"]);

function checkAgent(c: ChangeContract, errors: string[]): void {
  if (!c.agent) {
    errors.push("agent is missing.");
    return;
  }

  if (!SUPPORTED_ADAPTERS.has(c.agent.adapter)) {
    errors.push(
      `agent.adapter '${c.agent.adapter}' is unsupported. ` +
      `P19.1 only supports: [${[...SUPPORTED_ADAPTERS].join(", ")}].`,
    );
  }
}

// ---------------------------------------------------------------------------
// Obligation Checks
// ---------------------------------------------------------------------------

function checkObligations(
  c: ChangeContract,
  errors: string[],
  warnings: string[],
): void {
  if (!c.verification?.obligations || c.verification.obligations.length === 0) {
    errors.push("verification.obligations must be non-empty.");
    return;
  }

  const obligations = c.verification.obligations;

  // scope_diff obligation must exist.
  const scopeDiffObl = obligations.find(o => o.type === "scope_diff");
  if (!scopeDiffObl) {
    errors.push("A scope_diff obligation is required.");
  }

  // waived status is invalid in P19.1.
  for (const obl of obligations) {
    if ((obl.status as string) === "waived") {
      errors.push(
        `Obligation '${obl.obligation_id}' has status 'waived'. ` +
        `Waiver is not supported in P19.1 (requires operator override + audit).`,
      );
    }
  }

  // High-risk + must_require_human_review → human_review obligation must exist.
  if (
    c.impact?.risk_level === "high" &&
    c.scope?.must_require_human_review === true
  ) {
    const humanReviewObl = obligations.find(o => o.type === "human_review");
    if (!humanReviewObl) {
      errors.push(
        "High-risk scope with must_require_human_review=true requires a human_review obligation.",
      );
    }
  }

  // Unique obligation IDs.
  const oblIds = new Set<string>();
  for (const obl of obligations) {
    if (oblIds.has(obl.obligation_id)) {
      errors.push(`Duplicate obligation_id: '${obl.obligation_id}'.`);
    }
    oblIds.add(obl.obligation_id);
  }

  // Lifecycle-verified requires scope_diff obligation to have been resolved.
  if (c.lifecycle_status === "verified" || c.lifecycle_status === "closed") {
    if (scopeDiffObl && scopeDiffObl.status === "pending") {
      errors.push(
        `Contract is '${c.lifecycle_status}' but scope_diff obligation is still 'pending'. ` +
        `Verification gate requires scope_diff to be resolved.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Event Checks
// ---------------------------------------------------------------------------

function checkEvents(c: ChangeContract, errors: string[]): void {
  if (!c.result_events || c.result_events.length === 0) {
    errors.push("result_events must be non-empty.");
    return;
  }

  // Unique event IDs.
  const ids = new Set<string>();
  for (const evt of c.result_events) {
    if (ids.has(evt.event_id)) {
      errors.push(`Duplicate event_id: '${evt.event_id}'.`);
    }
    ids.add(evt.event_id);
  }

  // Non-decreasing timestamps.
  for (let i = 1; i < c.result_events.length; i++) {
    const prev = c.result_events[i - 1].created_at;
    const curr = c.result_events[i].created_at;
    if (curr < prev) {
      errors.push(
        `Event timestamps are not monotonically non-decreasing: ` +
        `event[${i - 1}] '${prev}' > event[${i}] '${curr}'.`,
      );
    }
  }

  // Lifecycle-specific event requirements.
  const eventTypes = c.result_events.map(e => e.event_type);

  if (c.lifecycle_status === "verified" || c.lifecycle_status === "closed") {
    if (!eventTypes.includes("scope_diff_verified")) {
      errors.push(
        `lifecycle_status '${c.lifecycle_status}' requires a scope_diff_verified event in the ledger.`,
      );
    }
  }

  if (c.lifecycle_status === "closed") {
    if (!eventTypes.includes("contract_closed")) {
      errors.push("lifecycle_status 'closed' requires a contract_closed event in the ledger.");
    }
  }

  if (c.lifecycle_status === "invalid") {
    if (!eventTypes.includes("contract_invalidated")) {
      errors.push("lifecycle_status 'invalid' requires a contract_invalidated event in the ledger.");
    }
  }
}

// ---------------------------------------------------------------------------
// Decision Checks
// ---------------------------------------------------------------------------

function checkDecision(c: ChangeContract, errors: string[]): void {
  if (!c.current_decision) {
    errors.push("current_decision is missing.");
    return;
  }

  const VALID_VERDICTS: Set<string> = new Set([
    "pending", "pass", "requires_human_review", "requires_reverse_issue",
    "fail", "closed", "invalid",
  ]);
  if (!VALID_VERDICTS.has(c.current_decision.decision)) {
    errors.push(`current_decision.decision '${c.current_decision.decision}' is invalid.`);
  }
}

// ---------------------------------------------------------------------------
// Top-level Dump Field Guard
// ---------------------------------------------------------------------------

/**
 * Rejects contracts that contain full artifact copies at the top level.
 * ChangeContract is reference-heavy — it stores hashes and IDs, not dumps.
 */
const FORBIDDEN_TOP_LEVEL_KEYS: Set<string> = new Set([
  "boundary_graph",
  "blast_radius_report",
  "scoped_handoff_package",
  "scope_diff_report",
  "diff_text",
  "generated_code",
]);

function checkDumpFields(c: ChangeContract, errors: string[]): void {
  const keys = Object.keys(c);
  for (const key of keys) {
    if (FORBIDDEN_TOP_LEVEL_KEYS.has(key)) {
      errors.push(
        `Top-level key '${key}' is a forbidden dump field. ` +
        `ChangeContract stores hashes/refs, not full artifact copies.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Markdown Authority Guard
// ---------------------------------------------------------------------------

/**
 * Ensures no ref value points to a .md file as an authority source.
 * JSON is authoritative; Markdown is a read-only projection.
 */
function checkMarkdownAuthority(c: ChangeContract, errors: string[]): void {
  // Check refs.*
  if (c.refs) {
    const refEntries = Object.entries(c.refs).filter(
      ([key]) => key !== "canonical_revisions",
    );

    for (const [key, value] of refEntries) {
      if (typeof value === "string" && value.endsWith(".md")) {
        errors.push(
          `refs.${key} points to '${value}' — Markdown files cannot be authority refs. ` +
          `Use JSON/hash refs only.`,
        );
      }
    }
  }

  // Check obligation source_ref fields.
  if (c.verification?.obligations) {
    for (const obl of c.verification.obligations) {
      if (obl.source_ref && obl.source_ref.endsWith(".md")) {
        errors.push(
          `Obligation '${obl.obligation_id}' source_ref points to '${obl.source_ref}' — ` +
          `Markdown files cannot be authority refs for obligations.`,
        );
      }
    }
  }
}
