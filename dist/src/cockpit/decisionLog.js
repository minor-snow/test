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
import { join, dirname, resolve } from "node:path";
import { resolveTrustedPath } from "../safePath.js";
// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}
function resolveDecisionDataDir(dataDir, options) {
    return resolveTrustedPath(resolve(options?.repoRoot ?? process.cwd()), dataDir, {
        allowAbsolute: options?.trustedAbsolute === true,
    });
}
function logPath(dataDir, options) {
    return join(resolveDecisionDataDir(dataDir, options), "decisions", "decisions.jsonl");
}
/**
 * Append a single DecisionEntry to the JSONL log.
 */
export async function appendDecisionEntry(dataDir, entry, options) {
    const path = logPath(dataDir, options);
    await ensureDir(dirname(path));
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(path, line, "utf8");
}
/**
 * Read all decision entries from the JSONL log.
 * Returns empty array if file doesn't exist.
 */
export async function readDecisionLog(dataDir, options) {
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
//# sourceMappingURL=decisionLog.js.map