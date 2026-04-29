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

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { computeBlockContentHash, computeRevisionId, getHashMeta } from "./hash.js";
import type {
  Artifact,
  CanonicalPointer,
  AuditEntry,
  AuditEntryType,
} from "./types.js";

// ---------------------------------------------------------------------------
// Store configuration
// ---------------------------------------------------------------------------

export type StoreConfig = {
  dataDir: string; // root data directory (e.g., "pantheon/data")
};

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function revisionsDir(config: StoreConfig, artifactId: string): string {
  return join(config.dataDir, "revisions", artifactId);
}

function revisionPath(
  config: StoreConfig,
  artifactId: string,
  revisionId: string
): string {
  return join(revisionsDir(config, artifactId), `${revisionId}.json`);
}

function canonicalPath(config: StoreConfig, artifactId: string): string {
  return join(config.dataDir, "canonical", `${artifactId}.json`);
}

function auditPath(config: StoreConfig, artifactId: string): string {
  return join(config.dataDir, "audit", `${artifactId}.jsonl`);
}

function projectionPath(config: StoreConfig, artifactId: string): string {
  return join(config.dataDir, "projections", `${artifactId}.md`);
}

// ---------------------------------------------------------------------------
// Atomic file write
// ---------------------------------------------------------------------------

async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, content, "utf8");
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "EPERM" && code !== "EEXIST") {
      throw error;
    }
    await fs.rm(filePath, { force: true });
    await fs.rename(tmpPath, filePath);
  }
}

async function atomicWriteText(filePath: string, text: string): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, text, "utf8");
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "EPERM" && code !== "EEXIST") {
      throw error;
    }
    await fs.rm(filePath, { force: true });
    await fs.rename(tmpPath, filePath);
  }
}

// ---------------------------------------------------------------------------
// saveRevision  – ref: C-05 (revisions are immutable)
// ---------------------------------------------------------------------------

/**
 * Save an artifact revision to /revisions/{artifact_id}/{revision_id}.json.
 *
 * The revision file is immutable once written. If the file already exists,
 * this function throws to prevent accidental overwrites.
 */
export async function saveRevision(
  config: StoreConfig,
  artifact: Artifact
): Promise<void> {
  const path = revisionPath(config, artifact.artifact_id, artifact.revision_id);

  // Check immutability: don't overwrite existing revisions
  try {
    await fs.access(path);
    throw new Error(
      `Revision already exists and is immutable: ${artifact.artifact_id}/${artifact.revision_id}`
    );
  } catch (err: unknown) {
    // ENOENT means file doesn't exist — that's what we want
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  await atomicWriteJson(path, artifact);
}

// ---------------------------------------------------------------------------
// loadRevision
// ---------------------------------------------------------------------------

/**
 * Load a specific revision of an artifact.
 *
 * Returns null if the revision file doesn't exist.
 */
export async function loadRevision(
  config: StoreConfig,
  artifactId: string,
  revisionId: string
): Promise<Artifact | null> {
  const path = revisionPath(config, artifactId, revisionId);
  try {
    const content = await fs.readFile(path, "utf8");
    return JSON.parse(content) as Artifact;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// updateCanonicalPointer  – ref: C-05
// ---------------------------------------------------------------------------

/**
 * Update the canonical pointer for an artifact.
 *
 * ref: C-05 — canonical only stores a pointer, never content.
 *
 * This verifies the target revision exists before updating the pointer.
 */
export async function updateCanonicalPointer(
  config: StoreConfig,
  artifactId: string,
  revisionId: string
): Promise<void> {
  // Verify the revision exists
  const revision = await loadRevision(config, artifactId, revisionId);
  if (!revision) {
    throw new Error(
      `Cannot set canonical pointer: revision ${revisionId} not found for artifact ${artifactId}`
    );
  }

  const pointer: CanonicalPointer = {
    artifact_id: artifactId,
    current_revision_id: revisionId,
  };

  await atomicWriteJson(canonicalPath(config, artifactId), pointer);
}

/**
 * Load the canonical pointer for an artifact.
 *
 * Returns null if no canonical pointer exists.
 */
export async function loadCanonicalPointer(
  config: StoreConfig,
  artifactId: string
): Promise<CanonicalPointer | null> {
  const path = canonicalPath(config, artifactId);
  try {
    const content = await fs.readFile(path, "utf8");
    return JSON.parse(content) as CanonicalPointer;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Load the current canonical revision of an artifact.
 *
 * Resolves the canonical pointer, then loads that revision.
 * Returns null if no canonical pointer exists.
 */
export async function loadCanonicalRevision(
  config: StoreConfig,
  artifactId: string
): Promise<Artifact | null> {
  const pointer = await loadCanonicalPointer(config, artifactId);
  if (!pointer) return null;
  return loadRevision(config, artifactId, pointer.current_revision_id);
}

// ---------------------------------------------------------------------------
// appendAuditLog  – ref: §15.6 (append-only)
// ---------------------------------------------------------------------------

/**
 * Append an audit entry to the artifact's audit log.
 *
 * The audit log is a newline-delimited JSON file (.jsonl).
 * Each line is a self-contained JSON object.
 * Append-only: never truncates or rewrites.
 */
export async function appendAuditLog(
  config: StoreConfig,
  entry: AuditEntry
): Promise<void> {
  const path = auditPath(config, entry.artifact_id);
  await fs.mkdir(dirname(path), { recursive: true });
  const line = JSON.stringify(entry) + "\n";
  await fs.appendFile(path, line, "utf8");
}

/**
 * Read all audit entries for an artifact.
 *
 * Returns an array of AuditEntry objects, in chronological order.
 */
export async function loadAuditLog(
  config: StoreConfig,
  artifactId: string
): Promise<AuditEntry[]> {
  const path = auditPath(config, artifactId);
  try {
    const content = await fs.readFile(path, "utf8");
    return content
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as AuditEntry);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// createArtifact  – convenience: saveRevision + canonical + audit
// ---------------------------------------------------------------------------

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
export async function createArtifact(
  config: StoreConfig,
  artifact: Artifact
): Promise<Artifact> {
  // 1. Recompute all block content_hashes for integrity
  const correctedArtifact = { ...artifact };
  correctedArtifact.sections = artifact.sections.map((section) => ({
    ...section,
    commitments: section.commitments.map((block) => ({
      ...block,
      content_hash: computeBlockContentHash(block),
    })),
  }));

  // 2. Compute revision_id from content
  const revisionId = computeRevisionId(correctedArtifact);
  correctedArtifact.revision_id = revisionId;

  // 3. Save revision
  await saveRevision(config, correctedArtifact);

  // 4. Set canonical pointer
  await updateCanonicalPointer(
    config,
    correctedArtifact.artifact_id,
    revisionId
  );

  // 5. Audit
  await appendAuditLog(config, {
    entry_id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    entry_type: "artifact_created",
    artifact_id: correctedArtifact.artifact_id,
    revision_id: revisionId,
    details: {
      artifact_type: correctedArtifact.artifact_type,
      schema_version: correctedArtifact.schema_version,
      hash_meta: getHashMeta(),
      block_count: correctedArtifact.sections.reduce(
        (sum, s) => sum + s.commitments.length,
        0
      ),
    },
  });

  return correctedArtifact;
}

// ---------------------------------------------------------------------------
// Quarantine helpers
// ---------------------------------------------------------------------------

/**
 * Save an untrusted output to quarantine.
 * ref: C-03 — all untrusted output enters quarantine first.
 */
export async function saveToQuarantine(
  config: StoreConfig,
  filename: string,
  data: unknown
): Promise<void> {
  const path = join(config.dataDir, "quarantine", `${filename}.json`);
  await atomicWriteJson(path, data);
}

/**
 * Load a quarantined item.
 */
export async function loadFromQuarantine(
  config: StoreConfig,
  filename: string
): Promise<unknown | null> {
  const path = join(config.dataDir, "quarantine", `${filename}.json`);
  try {
    const content = await fs.readFile(path, "utf8");
    return JSON.parse(content);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Evidence helpers
// ---------------------------------------------------------------------------

/**
 * Promote a validated item from quarantine to evidence.
 * ref: C-03, C-04
 */
export async function promoteToEvidence(
  config: StoreConfig,
  filename: string,
  data: unknown
): Promise<void> {
  const path = join(config.dataDir, "evidence", `${filename}.json`);
  await atomicWriteJson(path, data);
}

/**
 * Load an evidence item.
 */
export async function loadFromEvidence(
  config: StoreConfig,
  filename: string
): Promise<unknown | null> {
  const path = join(config.dataDir, "evidence", `${filename}.json`);
  try {
    const content = await fs.readFile(path, "utf8");
    return JSON.parse(content);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Projection helpers
// ---------------------------------------------------------------------------

/**
 * Save a Markdown projection.
 * ref: C-01 — Markdown is a read-only projection of JSON.
 */
export async function saveProjection(
  config: StoreConfig,
  artifactId: string,
  markdown: string
): Promise<void> {
  const path = projectionPath(config, artifactId);
  await atomicWriteText(path, markdown);
}
