/**
 * Hash Module
 *
 * Implements the four core hash functions required by Day 1:
 *   1. computeBlockContentHash()   – ref: H-02
 *   2. computeArtifactHash()       – ref: H-03
 *   3. computeRevisionId()         – derives a revision identifier
 *   4. computeHash()               – low-level sha256 helper
 *
 * Design decisions:
 *   - content_hash includes ONLY semantic fields: { type, text, rationale, terms }
 *     (ref: H-02). Metadata, status, timestamps are excluded.
 *   - revision_hash includes the artifact's canonical representation:
 *     { artifact_id, artifact_type, schema_version, parent_revision_id, sections }
 *     where each block contributes its content_hash (ref: H-03).
 *     ArtifactMetadata is explicitly excluded (ref: §4.1.1).
 *   - All hashing uses stableSerialize (ref: H-01) then SHA-256.
 *   - Hash strings are prefixed with "sha256:" (ref: H-04).
 */

import { createHash } from "node:crypto";
import { stableSerialize, SERIALIZATION_VERSION } from "./stableSerialize.js";
import type {
  CommitmentBlock,
  Artifact,
  ArtifactSection,
  HashMeta,
} from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HASH_ALGORITHM = "sha256" as const;
const HASH_PREFIX = "sha256:";

// ---------------------------------------------------------------------------
// Low-level helper
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 of an arbitrary string and return the prefixed hex digest.
 */
export function computeHash(input: string): string {
  const digest = createHash(HASH_ALGORITHM).update(input, "utf8").digest("hex");
  return `${HASH_PREFIX}${digest}`;
}

// ---------------------------------------------------------------------------
// Block content hash  – ref: H-02
// ---------------------------------------------------------------------------

/**
 * Extract the semantic-only fields from a CommitmentBlock.
 *
 * ref: H-02 – content_hash input is { type, text, rationale, terms }.
 * Everything else (block_id, status, content_hash itself, timestamps) is excluded.
 */
export function extractContentHashInput(block: CommitmentBlock): {
  type: string;
  text: string;
  rationale?: string;
  terms?: string[];
} {
  const input: Record<string, unknown> = {
    type: block.type,
    text: block.text,
  };

  // Only include optional fields when they are defined.
  // undefined values are omitted by stableSerialize, but being explicit
  // makes the hash boundary clear and testable.
  if (block.rationale !== undefined) {
    input.rationale = block.rationale;
  }
  if (block.terms !== undefined) {
    input.terms = block.terms;
  }

  return input as { type: string; text: string; rationale?: string; terms?: string[] };
}

/**
 * Compute the content_hash for a CommitmentBlock.
 *
 * ref: H-02
 * This hash changes if and only if { type, text, rationale, terms } changes.
 */
export function computeBlockContentHash(block: CommitmentBlock): string {
  const semanticPayload = extractContentHashInput(block);
  return computeHash(stableSerialize(semanticPayload));
}

// ---------------------------------------------------------------------------
// Artifact / revision hash  – ref: H-03
// ---------------------------------------------------------------------------

/**
 * Build the canonical representation of an artifact for revision hashing.
 *
 * ref: H-03 – includes artifact_id, artifact_type, schema_version,
 * parent_revision_id, and sections with blocks (using content_hashes).
 * ArtifactMetadata is excluded (ref: §4.1.1).
 */
export function extractRevisionHashInput(artifact: Artifact): Record<string, unknown> {
  return {
    artifact_id: artifact.artifact_id,
    artifact_type: artifact.artifact_type,
    schema_version: artifact.schema_version,
    parent_revision_id: artifact.parent_revision_id ?? null,
    sections: artifact.sections.map((s: ArtifactSection) => ({
      section_id: s.section_id,
      title: s.title,
      commitments: s.commitments.map((b: CommitmentBlock) => ({
        block_id: b.block_id,
        content_hash: b.content_hash,
      })),
    })),
  };
}

/**
 * Compute the artifact-level hash for a given revision state.
 *
 * ref: H-03
 * This hash changes if any structural or semantic content changes,
 * but is immune to metadata, timestamps, and UI state.
 */
export function computeArtifactHash(artifact: Artifact): string {
  const payload = extractRevisionHashInput(artifact);
  return computeHash(stableSerialize(payload));
}

/**
 * Compute a revision_id for a given artifact state.
 *
 * The revision_id is derived from the artifact hash so that identical
 * artifact content always yields the same revision identifier.
 *
 * Format: "rev_<first12chars_of_hex_digest>"
 */
export function computeRevisionId(artifact: Artifact): string {
  const artifactHash = computeArtifactHash(artifact);
  // Strip the "sha256:" prefix, take first 12 hex characters.
  const hexDigest = artifactHash.slice(HASH_PREFIX.length);
  return `rev_${hexDigest.slice(0, 12)}`;
}

// ---------------------------------------------------------------------------
// Hash metadata helper  – ref: H-04
// ---------------------------------------------------------------------------

/**
 * Returns the hash metadata record that must be stored with every revision.
 * ref: H-04
 */
export function getHashMeta(): HashMeta {
  return {
    hash_algorithm: HASH_ALGORITHM,
    serialization_version: SERIALIZATION_VERSION,
  };
}
