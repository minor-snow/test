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
// Storage
// ---------------------------------------------------------------------------
async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}
function logPath(dataDir) {
    return join(dataDir, "decisions", "decisions.jsonl");
}
/**
 * Append a single DecisionEntry to the JSONL log.
 */
export async function appendDecisionEntry(dataDir, entry) {
    const path = logPath(dataDir);
    await ensureDir(dirname(path));
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(path, line, "utf8");
}
/**
 * Read all decision entries from the JSONL log.
 * Returns empty array if file doesn't exist.
 */
export async function readDecisionLog(dataDir) {
    const path = logPath(dataDir);
    try {
        const content = await fs.readFile(path, "utf8");
        return content
            .split("\n")
            .filter(line => line.trim().length > 0)
            .map(line => JSON.parse(line));
    }
    catch (err) {
        if (err.code === "ENOENT")
            return [];
        throw err;
    }
}
//# sourceMappingURL=decisionLog.js.map