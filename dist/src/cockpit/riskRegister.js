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
import { join, dirname, resolve } from "node:path";
import { resolveTrustedPath } from "../safePath.js";
// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}
function resolveRiskDataDir(dataDir, options) {
    return resolveTrustedPath(resolve(options?.repoRoot ?? process.cwd()), dataDir, {
        allowAbsolute: options?.trustedAbsolute === true,
    });
}
function logPath(dataDir, options) {
    return join(resolveRiskDataDir(dataDir, options), "risks", "risks.jsonl");
}
/**
 * Append risk entries to the JSONL log.
 * Deduplicates by source_issue_id — if already present, skip.
 */
export async function appendRiskEntries(dataDir, entries, options) {
    if (entries.length === 0)
        return 0;
    const existing = await readRiskRegister(dataDir, options);
    const existingIds = new Set(existing.map(e => e.source_issue_id));
    const newEntries = entries.filter(e => !existingIds.has(e.source_issue_id));
    if (newEntries.length === 0)
        return 0;
    const path = logPath(dataDir, options);
    await ensureDir(dirname(path));
    const lines = newEntries.map(e => JSON.stringify(e)).join("\n") + "\n";
    await fs.appendFile(path, lines, "utf8");
    return newEntries.length;
}
/**
 * Read all risk entries from the JSONL log.
 * Returns empty array if file doesn't exist.
 */
export async function readRiskRegister(dataDir, options) {
    const path = logPath(dataDir, options);
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