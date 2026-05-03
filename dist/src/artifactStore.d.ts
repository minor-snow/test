/**
 * Artifact Store
 *
 * ref: 执行宪法 v0.2 §3, §4, C-01, C-05
 *
 * File-system based JSON store. No database.
 *
 * Directory layout:
 *   data/revisions/{artifact_id}/{revision_id}.json
 *   data/canonical/{artifact_id}.json
 *   data/audit/{artifact_id}.jsonl        (newline-delimited JSON, append-only)
 *   data/quarantine/{filename}.json
 *   data/evidence/{filename}.json
 *   data/projections/{artifact_id}.md
 *
 * Design decisions:
 *   - Revisions are immutable once written (ref: C-05).
 *   - Canonical is a pointer file, never stores content directly (ref: C-05).
 *   - Audit log is append-only JSONL (ref: §15.6).
 *   - All writes are atomic: write to .tmp then rename.
 *   - createArtifact() is a convenience that chains saveRevision + updateCanonical + audit.
 */
import type { Artifact, CanonicalPointer, AuditEntry } from "./types.js";
export type StoreConfig = {
    dataDir: string;
};
/**
 * Save an artifact revision to /revisions/{artifact_id}/{revision_id}.json.
 *
 * The revision file is immutable once written. If the file already exists,
 * this function throws to prevent accidental overwrites.
 */
export declare function saveRevision(config: StoreConfig, artifact: Artifact): Promise<void>;
/**
 * Load a specific revision of an artifact.
 *
 * Returns null if the revision file doesn't exist.
 */
export declare function loadRevision(config: StoreConfig, artifactId: string, revisionId: string): Promise<Artifact | null>;
/**
 * Update the canonical pointer for an artifact.
 *
 * ref: C-05 — canonical only stores a pointer, never content.
 *
 * This verifies the target revision exists before updating the pointer.
 */
export declare function updateCanonicalPointer(config: StoreConfig, artifactId: string, revisionId: string): Promise<void>;
/**
 * Load the canonical pointer for an artifact.
 *
 * Returns null if no canonical pointer exists.
 */
export declare function loadCanonicalPointer(config: StoreConfig, artifactId: string): Promise<CanonicalPointer | null>;
/**
 * Load the current canonical revision of an artifact.
 *
 * Resolves the canonical pointer, then loads that revision.
 * Returns null if no canonical pointer exists.
 */
export declare function loadCanonicalRevision(config: StoreConfig, artifactId: string): Promise<Artifact | null>;
/**
 * Append an audit entry to the artifact's audit log.
 *
 * The audit log is a newline-delimited JSON file (.jsonl).
 * Each line is a self-contained JSON object.
 * Append-only: never truncates or rewrites.
 */
export declare function appendAuditLog(config: StoreConfig, entry: AuditEntry): Promise<void>;
/**
 * Read all audit entries for an artifact.
 *
 * Returns an array of AuditEntry objects, in chronological order.
 */
export declare function loadAuditLog(config: StoreConfig, artifactId: string): Promise<AuditEntry[]>;
/**
 * Create a new artifact.
 *
 * ref: §18 criterion #1 — "A JSON Artifact can be created."
 *
 * This function:
 *   1. Ensures all block content_hashes are correct.
 *   2. Computes and sets the revision_id.
 *   3. Saves the revision.
 *   4. Sets the canonical pointer.
 *   5. Appends an audit entry.
 *
 * Returns the artifact with computed hashes and revision_id.
 */
export declare function createArtifact(config: StoreConfig, artifact: Artifact): Promise<Artifact>;
/**
 * Save an untrusted output to quarantine.
 * ref: C-03 — all untrusted output enters quarantine first.
 */
export declare function saveToQuarantine(config: StoreConfig, filename: string, data: unknown): Promise<void>;
/**
 * Load a quarantined item.
 */
export declare function loadFromQuarantine(config: StoreConfig, filename: string): Promise<unknown | null>;
/**
 * Promote a validated item from quarantine to evidence.
 * ref: C-03, C-04
 */
export declare function promoteToEvidence(config: StoreConfig, filename: string, data: unknown): Promise<void>;
/**
 * Load an evidence item.
 */
export declare function loadFromEvidence(config: StoreConfig, filename: string): Promise<unknown | null>;
/**
 * Save a Markdown projection.
 * ref: C-01 — Markdown is a read-only projection of JSON.
 */
export declare function saveProjection(config: StoreConfig, artifactId: string, markdown: string): Promise<void>;
