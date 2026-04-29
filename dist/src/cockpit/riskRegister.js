/**
 * Risk Register — System Writer
 *
 * ref: P7b-005
 *
 * Append-only JSONL ledger for accepted engineering risks.
 * NOT a full Artifact — no revisions, no linting, no LLM patching.
 *
 * Write point: accepted_with_residual_issues decision
 * Storage: data/risks/risks.jsonl
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
    return join(dataDir, "risks", "risks.jsonl");
}
/**
 * Append risk entries to the JSONL log.
 * Deduplicates by source_issue_id — if already present, skip.
 */
export async function appendRiskEntries(dataDir, entries) {
    if (entries.length === 0)
        return 0;
    const existing = await readRiskRegister(dataDir);
    const existingIds = new Set(existing.map(e => e.source_issue_id));
    const newEntries = entries.filter(e => !existingIds.has(e.source_issue_id));
    if (newEntries.length === 0)
        return 0;
    const path = logPath(dataDir);
    await ensureDir(dirname(path));
    const lines = newEntries.map(e => JSON.stringify(e)).join("\n") + "\n";
    await fs.appendFile(path, lines, "utf8");
    return newEntries.length;
}
/**
 * Read all risk entries from the JSONL log.
 * Returns empty array if file doesn't exist.
 */
export async function readRiskRegister(dataDir) {
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
//# sourceMappingURL=riskRegister.js.map