/**
 * Phase 7a InterfaceSpec Seed Artifact
 *
 * ref: P7a-003
 *
 * FROZEN seed for the dual-artifact cross-link trial.
 * Describes Pantheon's own API surface as an InterfaceSpec.
 *
 * Structure: 3 sections, ~20 blocks total.
 *
 * Cross-link design:
 *   - 12 blocks with valid linked_architecture_blocks (referencing b_trial_* from trialArtifact)
 *   - 3 blocks with empty linked_architecture_blocks → orphan_interface_contract
 *   - 2 blocks with stale links to non-existent blocks → stale_link
 *   - 3 clean blocks (non-interface types, no links required)
 *
 * Lint trigger design:
 *   - 2 blocks with undefined backtick terms → undefined_term
 *   - 1 block with "committed instantly" → unsafe_canonical_commit
 *
 * DO NOT MODIFY after initial verification.
 */

import { computeBlockContentHash, computeRevisionId } from "../hash.js";
import type { Artifact, CommitmentBlock, ArtifactSection } from "../types.js";

// ---------------------------------------------------------------------------
// Block factory
// ---------------------------------------------------------------------------

let ifaceBlockSeq = 0;

function ifaceBlock(opts: {
  text: string;
  type?: CommitmentBlock["type"];
  terms?: string[];
  rationale?: string;
  links?: string[];
}): CommitmentBlock {
  ifaceBlockSeq++;
  const b: CommitmentBlock = {
    block_id: `b_iface_${String(ifaceBlockSeq).padStart(3, "0")}`,
    type: opts.type ?? "interface",
    text: opts.text,
    terms: opts.terms ?? [],
    rationale: opts.rationale,
    linked_architecture_blocks: opts.links,
    status: "draft",
    content_hash: "",
  };
  b.content_hash = computeBlockContentHash(b);
  return b;
}

function ifaceSection(
  id: string,
  title: string,
  blocks: CommitmentBlock[]
): ArtifactSection {
  return { section_id: id, title, commitments: blocks };
}

// ---------------------------------------------------------------------------
// Section 1: Store API (7 blocks)
// ---------------------------------------------------------------------------

const storeApi = ifaceSection("sec_store_api", "Store API", [
  ifaceBlock({
    text:
      "GET /api/revisions/:artifactId returns the list of all revision IDs " +
      "for the given artifact, ordered by creation time descending.",
    terms: ["revision"],
    links: ["b_trial_007"],  // references Artifact Store section
  }),
  ifaceBlock({
    text:
      "GET /api/canonical/:artifactId returns the current canonical pointer " +
      "including the current_revision_id and artifact_id.",
    terms: ["canonical"],
    links: ["b_trial_008"],
  }),
  ifaceBlock({
    text:
      "POST /api/artifact creates a new artifact in the store. " +
      "The request body must be a valid Artifact JSON conforming to the " +
      "registered schema_version.",
    terms: ["artifact"],
    links: ["b_trial_007", "b_trial_009"],
  }),
  ifaceBlock({
    text:
      "PUT /api/canonical/:artifactId updates the canonical pointer to a " +
      "new revision_id. The target revision must already exist in the store.",
    terms: ["canonical"],
    links: ["b_trial_008"],
  }),
  ifaceBlock({
    text:
      "GET /api/audit/:artifactId returns the append-only audit log as " +
      "newline-delimited JSON entries.",
    terms: ["audit_log"],
    links: ["b_trial_010"],
  }),
  ifaceBlock({
    // LINT-TRIGGER: orphan_interface_contract (no links)
    text:
      "DELETE /api/quarantine/:id removes a quarantined item after it has " +
      "been promoted to evidence or explicitly rejected.",
  }),
  ifaceBlock({
    // LINT-TRIGGER: orphan_interface_contract (empty links)
    text:
      "GET /api/quarantine returns all items currently in quarantine, " +
      "with their validation status.",
    links: [],
  }),
]);

// ---------------------------------------------------------------------------
// Section 2: Gate & Validation API (7 blocks)
// ---------------------------------------------------------------------------

const gateApi = ifaceSection("sec_gate_api", "Gate & Validation API", [
  ifaceBlock({
    text:
      "POST /api/validate accepts a raw SkillOutput JSON and runs it through " +
      "the four-gate validation pipeline: schema, source reference, capability, " +
      "and type-specific invariant gates.",
    terms: ["gate"],
    links: ["b_trial_019", "b_trial_020"],
  }),
  ifaceBlock({
    text:
      "The response includes a per-gate breakdown: each gate reports " +
      "passed/failed status and an array of error messages.",
    links: ["b_trial_020"],
  }),
  ifaceBlock({
    text:
      "POST /api/patch/compile accepts a PatchProposal and returns an " +
      "ArtifactPatch with expected_old_hash populated for each operation.",
    terms: ["patch"],
    links: ["b_trial_013"],
  }),
  ifaceBlock({
    text:
      "POST /api/patch/apply accepts an ArtifactPatch and returns either " +
      "an accepted result with the candidate revision, or a rejected result " +
      "with the reason code.",
    links: ["b_trial_014"],
  }),
  ifaceBlock({
    // LINT-TRIGGER: stale_link (references non-existent block)
    text:
      "POST /api/regression/check runs semantic regression analysis on " +
      "a candidate revision against the current canonical.",
    links: ["b_nonexistent_regression_api"],
  }),
  ifaceBlock({
    // LINT-TRIGGER: stale_link (references non-existent block)
    text:
      "POST /api/override/apply records a human override decision for a " +
      "failed semantic regression gate.",
    links: ["b_phantom_override_api"],
  }),
  ifaceBlock({
    // LINT-TRIGGER: orphan_interface_contract (no links)
    text:
      "GET /api/integrity returns the latest integrity check report " +
      "including corruption count, warning count, and detailed findings.",
  }),
]);

// ---------------------------------------------------------------------------
// Section 3: Linter & Trial API (6 blocks)
// ---------------------------------------------------------------------------

const linterApi = ifaceSection("sec_linter_api", "Linter & Trial API", [
  ifaceBlock({
    text:
      "POST /api/lint accepts an Artifact JSON and returns an array of " +
      "Issue objects detected by the deterministic linter rules.",
    terms: ["issue"],
    links: ["b_trial_001"],
  }),
  ifaceBlock({
    text:
      "POST /api/trial/start initiates a trial run with the specified " +
      "seed artifact, LLM client configuration, and cycle limit.",
    links: ["b_trial_001", "b_trial_003"],
  }),
  ifaceBlock({
    text:
      "GET /api/trial/report returns the current TrialReport including " +
      "cycle results, rejection taxonomy, and override breakdown.",
    links: ["b_trial_003"],
  }),
  ifaceBlock({
    // LINT-TRIGGER: unsafe_canonical_commit
    text:
      "In legacy mode, trial results were committed instantly to the " +
      "canonical store without validation. This endpoint is now disabled.",
    type: "constraint",
    links: ["b_trial_005"],
  }),
  ifaceBlock({
    // LINT-TRIGGER: undefined_term (references terms not in any terms array)
    text:
      "The `trial_orchestrator` coordinates with the `cycle_scheduler` to " +
      "determine which issues to attempt in each cycle.",
    type: "constraint",
  }),
  ifaceBlock({
    // LINT-TRIGGER: undefined_term
    text:
      "The `response_parser` extracts structured PatchProposal JSON from " +
      "raw LLM output, handling markdown fences and whitespace.",
    type: "constraint",
  }),
]);

// ---------------------------------------------------------------------------
// Assemble and export
// ---------------------------------------------------------------------------

export function createInterfaceSpecSeed(): Artifact {
  // Reset block counter for deterministic IDs
  ifaceBlockSeq = 0;

  const artifact: Artifact = {
    artifact_id: "pantheon_interface",
    artifact_type: "InterfaceSpec",
    schema_version: "interface_spec@0.1.0",
    revision_id: "rev_placeholder",
    sections: [storeApi, gateApi, linterApi],
    metadata: {
      created_by: "human",
      created_at: "2026-04-25T00:00:00Z",
      notes: "Phase 7a InterfaceSpec seed — frozen after initial verification.",
    },
  };

  artifact.revision_id = computeRevisionId(artifact);
  return artifact;
}
