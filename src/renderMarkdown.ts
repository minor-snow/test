/**
 * Markdown Renderer
 *
 * ref: C-01 — Markdown is a read-only projection of JSON Artifact.
 *
 * This module converts a structured Artifact into human-readable Markdown.
 * It is a one-way projection: Markdown → JSON parsing is explicitly
 * forbidden by the constitution.
 *
 * The output is intended for:
 *   - Human review in the Override Cockpit
 *   - Documentation export
 *   - Diff view rendering
 */

import type { Artifact, CommitmentBlock, ArtifactSection } from "./types.js";

// ---------------------------------------------------------------------------
// Block type labels
// ---------------------------------------------------------------------------

const BLOCK_TYPE_LABELS: Record<string, string> = {
  invariant: "🔒 Invariant",
  mechanism: "⚙️ Mechanism",
  constraint: "🚧 Constraint",
  decision: "📋 Decision",
  risk: "⚠️ Risk",
  interface: "🔌 Interface",
  state_machine: "🔄 State Machine",
  open_question: "❓ Open Question",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "📝 Draft",
  candidate: "🔶 Candidate",
  approved: "✅ Approved",
  suspect: "🔍 Suspect",
  revoked: "❌ Revoked",
};

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------

function renderBlock(block: CommitmentBlock): string {
  const typeLabel = BLOCK_TYPE_LABELS[block.type] || block.type;
  const statusLabel = STATUS_LABELS[block.status] || block.status;

  const lines: string[] = [];
  lines.push(`### ${typeLabel}: \`${block.block_id}\``);
  lines.push("");
  lines.push(`**Status:** ${statusLabel}`);
  lines.push("");
  lines.push(block.text);

  if (block.rationale) {
    lines.push("");
    lines.push(`> **Rationale:** ${block.rationale}`);
  }

  if (block.terms && block.terms.length > 0) {
    lines.push("");
    lines.push(`**Terms:** ${block.terms.map((t) => `\`${t}\``).join(", ")}`);
  }

  lines.push("");
  lines.push(
    `<sub>hash: \`${block.content_hash.slice(0, 20)}…\`</sub>`
  );

  return lines.join("\n");
}

function renderSection(section: ArtifactSection): string {
  const lines: string[] = [];
  lines.push(`## ${section.title}`);
  lines.push("");
  lines.push(`<sub>section: \`${section.section_id}\`</sub>`);
  lines.push("");

  for (const block of section.commitments) {
    lines.push(renderBlock(block));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Render an Artifact as Markdown.
 *
 * ref: C-01 — This is a read-only projection. The source of truth
 * is the JSON Artifact, not this Markdown output.
 */
export function renderMarkdown(artifact: Artifact): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${artifact.artifact_type}: \`${artifact.artifact_id}\``);
  lines.push("");

  // Metadata bar
  lines.push(
    `> **Revision:** \`${artifact.revision_id}\` · ` +
      `**Schema:** \`${artifact.schema_version}\` · ` +
      `**Type:** ${artifact.artifact_type}`
  );

  if (artifact.parent_revision_id) {
    lines.push(`> **Parent:** \`${artifact.parent_revision_id}\``);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  // Sections
  for (const section of artifact.sections) {
    lines.push(renderSection(section));
  }

  // Footer
  lines.push("");
  lines.push(
    `<sub>Generated from JSON Artifact. This Markdown is a read-only projection (ref: C-01).</sub>`
  );

  return lines.join("\n");
}
