/**
 * Decision Log — System Writer
 *
 * ref: P7b-004
 *
 * Append-only JSONL ledger for release decisions.
 * NOT a full Artifact — no revisions, no linting, no LLM patching.
 *
 * Write point: POST /api/release/multi-decide success
 * Storage: data/decisions/decisions.jsonl
 */

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DecisionEntry = {
  decision_id: string;
  decision_type: string;
  operator_id: string;
  release_decision_id: string;
  affected_artifacts: string[];
  canonical_revision_ids: Record<string, string>;
  rationale: string;
  created_at: string;
  quality_snapshot?: Record<string, unknown>;  // P9: intake quality provenance
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function logPath(dataDir: string): string {
  return join(dataDir, "decisions", "decisions.jsonl");
}

/**
 * Append a single DecisionEntry to the JSONL log.
 */
export async function appendDecisionEntry(
  dataDir: string,
  entry: DecisionEntry
): Promise<void> {
  const path = logPath(dataDir);
  await ensureDir(dirname(path));
  const line = JSON.stringify(entry) + "\n";
  await fs.appendFile(path, line, "utf8");
}

/**
 * Read all decision entries from the JSONL log.
 * Returns empty array if file doesn't exist.
 */
export async function readDecisionLog(
  dataDir: string
): Promise<DecisionEntry[]> {
  const path = logPath(dataDir);
  try {
    const content = await fs.readFile(path, "utf8");
    return content
      .split("\n")
      .filter(line => line.trim().length > 0)
      .map(line => JSON.parse(line) as DecisionEntry);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
