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
import type { CommitmentBlock, Artifact, HashMeta } from "./types.js";
/**
 * Compute SHA-256 of an arbitrary string and return the prefixed hex digest.
 */
export declare function computeHash(input: string): string;
/**
 * Extract the semantic-only fields from a CommitmentBlock.
 *
 * ref: H-02 – content_hash input is { type, text, rationale, terms }.
 * Everything else (block_id, status, content_hash itself, timestamps) is excluded.
 */
export declare function extractContentHashInput(block: CommitmentBlock): {
    type: string;
    text: string;
    rationale?: string;
    terms?: string[];
};
/**
 * Compute the content_hash for a CommitmentBlock.
 *
 * ref: H-02
 * This hash changes if and only if { type, text, rationale, terms } changes.
 */
export declare function computeBlockContentHash(block: CommitmentBlock): string;
/**
 * Build the canonical representation of an artifact for revision hashing.
 *
 * ref: H-03 – includes artifact_id, artifact_type, schema_version,
 * parent_revision_id, and sections with blocks (using content_hashes).
 * ArtifactMetadata is excluded (ref: §4.1.1).
 */
export declare function extractRevisionHashInput(artifact: Artifact): Record<string, unknown>;
/**
 * Compute the artifact-level hash for a given revision state.
 *
 * ref: H-03
 * This hash changes if any structural or semantic content changes,
 * but is immune to metadata, timestamps, and UI state.
 */
export declare function computeArtifactHash(artifact: Artifact): string;
/**
 * Compute a revision_id for a given artifact state.
 *
 * The revision_id is derived from the artifact hash so that identical
 * artifact content always yields the same revision identifier.
 *
 * Format: "rev_<first12chars_of_hex_digest>"
 */
export declare function computeRevisionId(artifact: Artifact): string;
/**
 * Returns the hash metadata record that must be stored with every revision.
 * ref: H-04
 */
export declare function getHashMeta(): HashMeta;
