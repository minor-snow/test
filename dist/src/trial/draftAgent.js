/**
 * Draft Agent
 *
 * ref: P8-002
 *
 * LLM-powered agent that takes a fuzzy idea and produces a raw
 * ArchitectureDraft artifact as JSON.
 *
 * This module NEVER retries, NEVER auto-fixes, NEVER falls back.
 * The caller validates the output through DraftValidator.
 *
 * The prompt instructs the LLM to produce ONLY the artifact body.
 * Host generates: revision_id, content_hash, metadata, canonical pointer.
 */
// ---------------------------------------------------------------------------
// Prompt builder v1 (P8 — no profile)
// ---------------------------------------------------------------------------
/**
 * Build the prompt for draft generation.
 *
 * Visible for testing — the prompt is the contract between host and LLM.
 */
export function buildDraftPrompt(idea, artifactType = "ArchitectureDraft") {
    return `You are an architecture drafting agent for a document governance system.

Given an idea description, produce a structured ${artifactType} artifact as JSON.

## Idea

${idea}

## Rules

1. Output ONLY valid JSON. No markdown fences, no explanations, no comments.
2. Generate 5-8 sections with meaningful snake_case section_ids.
3. Each section should have 4-8 commitment blocks.
4. Each block must have: block_id, type, text, status.
5. block_id must be unique across the entire artifact, using format "b_<section_prefix>_<number>".
6. block.type must be one of: invariant, mechanism, constraint, decision, risk, open_question.
7. block.status must be "draft" for all blocks.
8. block.text must be a single, specific, actionable commitment (not vague or generic).
9. Optionally include a terms[] array for domain-specific terminology used in the block.
10. Do NOT generate revision_id, content_hash, parent_revision_id, or metadata fields.
11. Do NOT generate linked_architecture_blocks or linked_interface_blocks fields.
12. artifact_id should be a meaningful snake_case name derived from the idea.

## Output Schema

{
  "artifact_id": "<snake_case_name>",
  "artifact_type": "${artifactType}",
  "sections": [
    {
      "section_id": "<snake_case>",
      "title": "<Human Readable Title>",
      "commitments": [
        {
          "block_id": "<unique_snake_case>",
          "type": "<block_type>",
          "text": "<single specific commitment>",
          "status": "draft",
          "terms": ["<optional_domain_term>"]
        }
      ]
    }
  ]
}

## Quality Requirements

- Each block.text should express exactly one commitment, not a list.
- Blocks of type "invariant" state things that must always be true.
- Blocks of type "mechanism" describe how something works.
- Blocks of type "constraint" describe limitations or boundaries.
- Blocks of type "decision" record choices that were made.
- Blocks of type "risk" identify potential problems.
- Blocks of type "open_question" flag things that still need resolution.
- Aim for 25-40 total blocks across all sections.

Respond with ONLY the JSON object.`;
}
// ---------------------------------------------------------------------------
// Prompt builder v2 (P9 — with DomainProfile)
// ---------------------------------------------------------------------------
/**
 * Build a domain-profiled prompt for draft generation.
 *
 * Injects:
 *   - Required sections as scaffolding
 *   - Required concepts for content alignment
 *   - Forbidden generic phrases as negative examples
 *   - Good/bad block examples for quality calibration
 *   - Requirement for terms[] and rationale on every block
 */
export function buildDraftPromptV2(idea, profile) {
    const sectionList = profile.required_sections
        .map(s => `- "${s.title}"`)
        .join("\n");
    const conceptList = profile.required_concepts
        .filter(c => c.required)
        .map(c => `- "${c.concept}"`)
        .join("\n");
    const forbiddenList = profile.forbidden_generic_phrases
        .map(p => `- "${p}"`)
        .join("\n");
    return `You are an architecture drafting agent for a document governance system.

Given an idea description, produce a structured ${profile.artifact_type} artifact as JSON.

## Idea

${idea}

## Domain: ${profile.domain_name}

## Required Sections

Your artifact MUST include sections with these titles (or very close equivalents):

${sectionList}

You may add additional sections beyond these, but these are mandatory.

## Required Concepts

Your artifact MUST address each of these concepts in at least one block:

${conceptList}

Each concept must appear with a SPECIFIC mechanism, not a placeholder.

## Forbidden Phrases

Do NOT use these generic phrases. They indicate filler, not architecture:

${forbiddenList}

If you catch yourself writing something vague, replace it with a specific mechanism.

## Rules

1. Output ONLY valid JSON. No markdown fences, no explanations.
2. Generate ${profile.quality_rubric.min_sections}-8 sections with snake_case section_ids.
3. Each section should have 4-8 commitment blocks.
4. Each block MUST have: block_id, type, text, status, terms[], rationale.
5. block_id must be unique, using format "b_<section_prefix>_<number>".
6. block.type must be one of: invariant, mechanism, constraint, decision, risk, open_question.
7. block.status must be "draft" for all blocks.
8. block.text must be a single, specific, actionable commitment.
9. block.terms[] MUST list domain terms referenced in the text.
10. block.rationale SHOULD explain why this commitment matters.
11. Do NOT generate revision_id, content_hash, parent_revision_id, or metadata.
12. Do NOT generate linked_architecture_blocks or linked_interface_blocks.
13. artifact_id should be a meaningful snake_case name derived from the idea.
14. Aim for ${profile.quality_rubric.min_blocks}-${profile.quality_rubric.max_blocks} total blocks.

## Good Block Example

{
  "block_id": "b_core_001",
  "type": "invariant",
  "text": "Every canonical pointer update must be preceded by a release decision with a recorded operator identifier.",
  "status": "draft",
  "terms": ["canonical pointer", "release decision", "operator"],
  "rationale": "Prevents unapproved state transitions from bypassing the governance workflow."
}

## Bad Block Example (DO NOT write like this)

{
  "block_id": "b_bad_001",
  "type": "invariant",
  "text": "The system should be reliable and scalable.",
  "status": "draft"
}

This is bad because: no specific mechanism, no terms, no rationale, only vague adjectives.

## Output Schema

{
  "artifact_id": "<snake_case_name>",
  "artifact_type": "${profile.artifact_type}",
  "sections": [
    {
      "section_id": "<snake_case>",
      "title": "<Human Readable Title>",
      "commitments": [
        {
          "block_id": "<unique_id>",
          "type": "<block_type>",
          "text": "<specific architectural commitment>",
          "status": "draft",
          "terms": ["<domain_term_1>", "<domain_term_2>"],
          "rationale": "<why this commitment matters>"
        }
      ]
    }
  ]
}

Respond with ONLY the JSON object.`;
}
// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------
/**
 * Generate a draft artifact from an idea (v1, no profile).
 */
export async function generateDraft(client, idea, artifactType = "ArchitectureDraft") {
    const prompt = buildDraftPrompt(idea, artifactType);
    return client.complete(prompt);
}
/**
 * Generate a draft artifact from an idea (v2, with DomainProfile).
 */
export async function generateDraftV2(client, idea, profile) {
    const prompt = buildDraftPromptV2(idea, profile);
    return client.complete(prompt);
}
/**
 * Build a migration-aware prompt for architecture evolution.
 *
 * Unlike v1/v2 which generate from scratch, this prompt:
 *   1. Shows the existing architecture's key invariants
 *   2. Explicitly lists superseded constraints with reasons
 *   3. Requires the new draft to address conflicts between old and new
 *   4. Uses DomainProfile for section/concept requirements
 *
 * ref: P10-001
 */
export function buildMigrationPrompt(opts) {
    const { idea, existingArchitecture, supersededConstraints, profile } = opts;
    // Extract existing sections and key blocks for context
    const existingSummary = existingArchitecture.sections
        .map(s => {
        const blockSummaries = s.commitments
            .slice(0, 5) // limit to avoid prompt explosion
            .map(b => `    - [${b.block_id}] (${b.type}) ${b.text.slice(0, 120)}${b.text.length > 120 ? "…" : ""}`)
            .join("\n");
        return `  Section: "${s.title}" (${s.commitments.length} blocks)\n${blockSummaries}`;
    })
        .join("\n\n");
    const supersededList = supersededConstraints
        .map(sc => `- **${sc.block_id}**: "${sc.text.slice(0, 100)}${sc.text.length > 100 ? "…" : ""}"\n  Reason: ${sc.reason}\n  Replacement: ${sc.replacement_intent}`)
        .join("\n\n");
    const sectionList = profile.required_sections
        .map(s => `- "${s.title}"`)
        .join("\n");
    const conceptList = profile.required_concepts
        .filter(c => c.required)
        .map(c => `- "${c.concept}"`)
        .join("\n");
    const forbiddenList = profile.forbidden_generic_phrases
        .map(p => `- "${p}"`)
        .join("\n");
    return `You are an architecture migration agent for a document governance system.

You are given an EXISTING architecture and a BUSINESS CHANGE that requires evolving it.
Your job is to produce a NEW ${profile.artifact_type} that:
1. Supersedes the old constraints listed below
2. Introduces new invariants required by the business change
3. Covers all required sections and concepts from the domain profile

## Business Change

${idea}

## Domain: ${profile.domain_name}

## Existing Architecture: "${existingArchitecture.artifact_id}"

The current system has these sections and constraints:

${existingSummary}

## Superseded Constraints

These constraints from the existing architecture are EXPLICITLY OVERRIDDEN by the business change.
Your new draft MUST address each one — either replace it with a new invariant or explain the migration:

${supersededList}

## Required Sections

Your new artifact MUST include sections with these titles (or close equivalents):

${sectionList}

## Required Concepts

Your artifact MUST address each of these concepts in at least one block:

${conceptList}

## Forbidden Phrases

Do NOT use these generic phrases:

${forbiddenList}

## Rules

1. Output ONLY valid JSON. No markdown fences, no explanations.
2. Generate ${profile.quality_rubric.min_sections}-8 sections with snake_case section_ids.
3. Each section should have 4-8 commitment blocks.
4. Each block MUST have: block_id, type, text, status, terms[], rationale.
5. block_id must be unique, using format "b_<section_prefix>_<number>".
6. block.type must be one of: invariant, mechanism, constraint, decision, risk, open_question.
7. block.status must be "draft" for all blocks.
8. block.text must be a single, specific, actionable commitment.
9. block.terms[] MUST list domain terms referenced in the text.
10. block.rationale SHOULD explain why this commitment matters AND reference the superseded constraint if applicable.
11. Do NOT generate revision_id, content_hash, parent_revision_id, or metadata.
12. Do NOT generate linked_architecture_blocks or linked_interface_blocks.
13. artifact_type must be "${profile.artifact_type}".
14. For each superseded constraint, include at least one block that explicitly replaces or evolves it.
15. Do NOT silently drop old constraints — address them explicitly.

Respond with ONLY the JSON object.`;
}
/**
 * Generate a migration-aware architecture draft.
 *
 * ref: P10-001
 */
export async function generateMigrationDraft(client, opts) {
    const prompt = buildMigrationPrompt(opts);
    return client.complete(prompt);
}
// ---------------------------------------------------------------------------
// InterfaceSpec prompt builder (P10-004)
// ---------------------------------------------------------------------------
/**
 * Build an InterfaceSpec prompt derived from architecture + existing interface.
 * ref: P10-004
 */
export function buildInterfaceSpecPrompt(opts) {
    const { architecture, existingInterface, supersededInterfaceBlocks, profile } = opts;
    const archSummary = architecture.sections
        .map(s => {
        const blocks = s.commitments
            .slice(0, 4)
            .map(b => `    - [${b.block_id}] (${b.type}) ${b.text.slice(0, 100)}`)
            .join("\n");
        return `  "${s.title}" (${s.commitments.length} blocks)\n${blocks}`;
    })
        .join("\n\n");
    const existingIfaceSummary = existingInterface.sections
        .map(s => {
        const blocks = s.commitments
            .map(b => `    - [${b.block_id}] ${b.text.slice(0, 100)}`)
            .join("\n");
        return `  "${s.title}"\n${blocks}`;
    })
        .join("\n\n");
    const supersededList = supersededInterfaceBlocks
        .map(sc => `- **${sc.block_id}**: "${sc.text.slice(0, 100)}"\n  Reason: ${sc.reason}\n  Replacement: ${sc.replacement_intent}`)
        .join("\n\n");
    const archBlockIds = architecture.sections
        .flatMap(s => s.commitments.map(b => b.block_id));
    const sectionList = profile.required_sections
        .map(s => `- "${s.title}"`)
        .join("\n");
    const conceptList = profile.required_concepts
        .filter(c => c.required)
        .map(c => `- "${c.concept}"`)
        .join("\n");
    const forbiddenList = profile.forbidden_generic_phrases
        .map(p => `- "${p}"`)
        .join("\n");
    return `You are an interface specification agent for a document governance system.

You are given an APPROVED architecture and an EXISTING interface specification.
Produce a NEW InterfaceSpec that derives contracts from the approved offline-first architecture and supersedes the old strong-sync interface.

## Source Architecture: "${architecture.artifact_id}"

${archSummary}

## Existing Interface (to supersede): "${existingInterface.artifact_id}"

${existingIfaceSummary}

## Superseded Interface Blocks

These blocks from the existing InterfaceSpec are EXPLICITLY OVERRIDDEN:

${supersededList}

## Required Sections

${sectionList}

## Required Concepts

${conceptList}

## Forbidden Phrases

${forbiddenList}

## Architecture Block IDs (for linked_architecture_blocks)

${archBlockIds.join(", ")}

## Rules

1. Output ONLY valid JSON. No markdown fences.
2. artifact_type must be "InterfaceSpec".
3. Generate ${profile.quality_rubric.min_sections}-6 sections with snake_case section_ids.
4. Total ${profile.quality_rubric.min_blocks}-${profile.quality_rubric.max_blocks} blocks.
5. Each block: block_id, type, text, status, terms[], rationale, linked_architecture_blocks.
6. block_id format: "b_iface_<prefix>_<number>".
7. block.type: interface, constraint, mechanism, decision, or risk.
8. block.status: "draft".
9. block.linked_architecture_blocks: 1-3 IDs from the architecture list above.
10. Do NOT generate revision_id, content_hash, metadata.
11. Do NOT generate linked_interface_blocks.
12. Define report lifecycle states: pending, queued, syncing, merged, conflicted, requires_review, failed_retryable, failed_terminal.
13. Network failure must NOT be terminal.
14. For each superseded block, include a replacement.

Respond with ONLY the JSON object.`;
}
/**
 * Generate an InterfaceSpec draft.
 * ref: P10-004
 */
export async function generateInterfaceSpecDraft(client, opts) {
    const prompt = buildInterfaceSpecPrompt(opts);
    return client.complete(prompt);
}
// ---------------------------------------------------------------------------
// ModuleSpec prompt builder (P10-005)
// ---------------------------------------------------------------------------
export function buildModuleSpecPrompt(opts) {
    const { architecture, interfaceSpec, profile } = opts;
    const archSummary = architecture.sections
        .map(s => {
        const blocks = s.commitments.slice(0, 4)
            .map(b => `    - [${b.block_id}] (${b.type}) ${b.text.slice(0, 90)}`)
            .join("\n");
        return `  "${s.title}" (${s.commitments.length} blocks)\n${blocks}`;
    }).join("\n\n");
    const ifaceSummary = interfaceSpec.sections
        .map(s => {
        const blocks = s.commitments.slice(0, 4)
            .map(b => `    - [${b.block_id}] ${b.text.slice(0, 90)}`)
            .join("\n");
        return `  "${s.title}" (${s.commitments.length} blocks)\n${blocks}`;
    }).join("\n\n");
    const archBlockIds = architecture.sections.flatMap(s => s.commitments.map(b => b.block_id));
    const ifaceBlockIds = interfaceSpec.sections.flatMap(s => s.commitments.map(b => b.block_id));
    const sectionList = profile.required_sections.map(s => `- "${s.title}"`).join("\n");
    const conceptList = profile.required_concepts.filter(c => c.required).map(c => `- "${c.concept}"`).join("\n");
    return `You are a module specification agent. Given an approved architecture and interface, produce a ModuleSpec.

## Architecture: "${architecture.artifact_id}"
${archSummary}

## Interface: "${interfaceSpec.artifact_id}"
${ifaceSummary}

## Required Sections
${sectionList}

## Required Concepts
${conceptList}

## Architecture Block IDs (for linked_architecture_blocks)
${archBlockIds.join(", ")}

## Interface Block IDs (for linked_interface_blocks)
${ifaceBlockIds.join(", ")}

## Rules
1. Output ONLY valid JSON. artifact_type = "ModuleSpec".
2. ${profile.quality_rubric.min_sections}-8 sections, ${profile.quality_rubric.min_blocks}-${profile.quality_rubric.max_blocks} blocks total.
3. Each block: block_id, type, text, status, terms[], rationale, linked_architecture_blocks, linked_interface_blocks.
4. block_id: "b_mod_<prefix>_<number>". type: module, invariant, mechanism, constraint, decision, risk. status: "draft".
5. linked_architecture_blocks: 1-3 IDs from architecture. linked_interface_blocks: 1-3 IDs from interface.
6. No revision_id, content_hash, metadata.
7. Each module: responsibility, dependencies, owned data, failure modes.
8. Must include: OfflineDecisionTreeRunner, PendingReportRepository, SyncQueueManager, RetryLedger, ConflictResolver, ClinicReplicaClient, AuditEventWriter, ConnectivityObserver, UserConflictReviewPresenter.

Respond with ONLY the JSON object.`;
}
export async function generateModuleSpecDraft(client, opts) {
    return client.complete(buildModuleSpecPrompt(opts));
}
//# sourceMappingURL=draftAgent.js.map