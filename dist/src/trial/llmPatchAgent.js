/**
 * LLM Patch Agent
 *
 * ref: P3-002, P3-004
 *
 * Single agent, single responsibility, single output type.
 * Takes an artifact + issue → asks LLM to produce a PatchProposal.
 *
 * Returns raw JSON string. The caller sends it through
 * validateSkillOutput() — if the LLM output is invalid,
 * the gate system rejects it.
 *
 * This module NEVER retries, NEVER auto-fixes, NEVER falls back.
 */
/**
 * Build the prompt for the LLM patch agent.
 *
 * Visible for testing — the prompt is the contract between
 * the host and the LLM.
 */
export function buildPatchPrompt(artifact, issue, peerArtifacts) {
    // Find the target block
    let targetBlock = null;
    for (const section of artifact.sections) {
        for (const block of section.commitments) {
            if (block.block_id === issue.target_block_id) {
                targetBlock = {
                    text: block.text,
                    block_id: block.block_id,
                    type: block.type,
                    linked_architecture_blocks: block.linked_architecture_blocks,
                    linked_interface_blocks: block.linked_interface_blocks,
                };
                break;
            }
        }
        if (targetBlock)
            break;
    }
    // P7a.1 + P7b: Cross-link context for orphan/stale issues
    const isArchCrossIssue = issue.issue_type === "orphan_interface_contract" ||
        issue.issue_type === "stale_link";
    const isIfaceCrossIssue = issue.issue_type === "orphan_module_contract" ||
        issue.issue_type === "stale_interface_link";
    const isCrossLinkIssue = isArchCrossIssue || isIfaceCrossIssue;
    let crossLinkSection = "";
    let crossLinkRules = "";
    let crossLinkOutputField = "";
    if (isCrossLinkIssue && peerArtifacts) {
        if (isArchCrossIssue) {
            // InterfaceSpec → ArchitectureDraft: provide arch block candidates
            const archBlocks = [];
            for (const peer of peerArtifacts) {
                if (peer.artifact_type !== "ArchitectureDraft")
                    continue;
                for (const section of peer.sections) {
                    for (const block of section.commitments) {
                        archBlocks.push({
                            block_id: block.block_id,
                            text: block.text.slice(0, 120),
                        });
                    }
                }
            }
            crossLinkSection = `
## Architecture Block Candidates

The following ArchitectureDraft blocks are available for linking:

${archBlocks.map(b => `- "${b.block_id}": "${b.text}${b.text.length > 120 ? '…' : ''}"`).join("\n")}

## Current Links

${targetBlock?.linked_architecture_blocks?.length
                ? `This block currently links to: ${JSON.stringify(targetBlock.linked_architecture_blocks)}`
                : "This block has NO linked_architecture_blocks (empty or missing)."}
`;
            crossLinkRules = `
8. If the issue is "orphan_interface_contract", you MUST add replacement_linked_architecture_blocks.
   Pick 1-3 architecture block IDs from the candidates above that are semantically related to this interface block.
9. If the issue is "stale_link", you MUST fix replacement_linked_architecture_blocks.
   Replace the stale/nonexistent block IDs with valid ones from the candidates above.
10. You may also improve the replacement_text if needed, but the primary fix is the links.`;
            crossLinkOutputField = `,
      "replacement_linked_architecture_blocks": ["<valid_block_id_1>", "<valid_block_id_2>"]`;
        }
        else {
            // ModuleSpec → InterfaceSpec: provide interface block candidates
            const ifaceBlocks = [];
            for (const peer of peerArtifacts) {
                if (peer.artifact_type !== "InterfaceSpec")
                    continue;
                for (const section of peer.sections) {
                    for (const block of section.commitments) {
                        ifaceBlocks.push({
                            block_id: block.block_id,
                            text: block.text.slice(0, 120),
                        });
                    }
                }
            }
            crossLinkSection = `
## Interface Block Candidates

The following InterfaceSpec blocks are available for linking:

${ifaceBlocks.map(b => `- "${b.block_id}": "${b.text}${b.text.length > 120 ? '…' : ''}"`).join("\n")}

## Current Interface Links

${targetBlock?.linked_interface_blocks?.length
                ? `This block currently links to: ${JSON.stringify(targetBlock.linked_interface_blocks)}`
                : "This block has NO linked_interface_blocks (empty or missing)."}
`;
            crossLinkRules = `
8. If the issue is "orphan_module_contract", you MUST add replacement_linked_interface_blocks.
   Pick 1-3 interface block IDs from the candidates above that are semantically related to this module block.
9. If the issue is "stale_interface_link", you MUST fix replacement_linked_interface_blocks.
   Replace the stale/nonexistent block IDs with valid ones from the candidates above.
10. You may also improve the replacement_text if needed, but the primary fix is the links.`;
            crossLinkOutputField = `,
      "replacement_linked_interface_blocks": ["<valid_block_id_1>", "<valid_block_id_2>"]`;
        }
    }
    return `You are a patch agent for an architecture document system.

## Task

Fix the following issue by rewriting the block text${isCrossLinkIssue ? ' and/or updating its cross-artifact links' : ''}.

## Issue

- issue_id: "${issue.issue_id}"
- issue_type: "${issue.issue_type}"
- severity: "${issue.severity}"
- message: "${issue.message}"
- target_block_id: "${issue.target_block_id}"

## Current Block

- block_id: "${targetBlock?.block_id ?? issue.target_block_id}"
- type: "${targetBlock?.type ?? "unknown"}"
- text: "${targetBlock?.text ?? ""}"
${crossLinkSection}
## Rules

1. Fix the issue described above by rewriting the block text.
2. Preserve the original meaning and intent of the block.
3. Do not introduce new technical terms in backticks unless they are clearly defined.
4. If the issue is "unsafe_canonical_commit", remove or rephrase the "committed instantly" pattern.
5. If the issue is "undefined_term", either remove the undefined term or rephrase without it.
6. If the issue is "empty_block_text", write a meaningful constraint that fits the section context.
7. Keep the replacement text concise (1-3 sentences).
${crossLinkRules}

## Output Format

Return ONLY a JSON object matching this exact schema:

{
  "proposal_id": "proposal_for_${issue.issue_id}",
  "artifact_id": "${artifact.artifact_id}",
  "base_revision_id": "${artifact.revision_id}",
  "source_issue_ids": ["${issue.issue_id}"],
  "operations": [
    {
      "op": "replace_block",
      "target_block_id": "${issue.target_block_id}",
      "replacement_text": "<your rewritten text here>"${crossLinkOutputField}
    }
  ],
  "schema_version": "patch_proposal@0.1.0"
}

Return ONLY the JSON. No markdown, no explanation, no code fences.`;
}
/**
 * Generate a PatchProposal via LLM.
 *
 * Returns the raw JSON string from the LLM.
 * The caller is responsible for validation via validateSkillOutput().
 */
export async function generatePatchProposal(client, artifact, issue, peerArtifacts) {
    const prompt = buildPatchPrompt(artifact, issue, peerArtifacts);
    const rawOutput = await client.complete(prompt);
    // Strip markdown code fences if the LLM wraps its output
    // (common LLM behavior despite instructions)
    let cleaned = rawOutput.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
    }
    else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
}
//# sourceMappingURL=llmPatchAgent.js.map