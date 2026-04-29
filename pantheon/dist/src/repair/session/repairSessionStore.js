import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, closeSync } from "node:fs";
import { dirname } from "node:path";
import { deterministicId, readJsonFile } from "../repairUtils.js";
import { ensureRepairDirs, repairRootPaths, repairRunPaths, } from "../repairArtifactLayout.js";
import { atomicWriteJson, atomicWriteText } from "./atomicWrite.js";
import { createEmptyRepairSessionIndex, upsertRepairSessionInIndex, } from "./repairSessionIndex.js";
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_POLL_MS = 25;
export function createRepairSession(input) {
    const repoRoot = input.repoRoot;
    ensureRepairDirs(repoRoot);
    const createdAt = new Date().toISOString();
    const repairId = deterministicId("repair", {
        source: input.source,
        agent_id: input.agentId ?? null,
        created_at: createdAt,
        nonce: Math.random().toString(36).slice(2),
    });
    const session = {
        schema_version: "repair_session@0.1.0",
        repair_id: repairId,
        agent_id: input.agentId,
        source: input.source,
        status: input.status,
        current_revision: 0,
        base_sha: null,
        risk_level: "unknown",
        scope_summary: emptyScopeSummary(),
        created_at: createdAt,
        updated_at: createdAt,
    };
    withRepairIndexLock(repoRoot, "create_repair_session", () => {
        const paths = repairRunPaths(repoRoot, repairId);
        ensureRepairRunDir(paths);
        atomicWriteJson(paths.session, session);
        writeLatestPointer(paths.root, repairId);
        const currentIndex = loadRepairSessionIndex(repoRoot);
        const updatedIndex = upsertRepairSessionInIndex(currentIndex, session);
        atomicWriteJson(paths.root.sessionsIndex, updatedIndex);
    });
    return session;
}
export function loadRepairSession(repoRoot, repairId) {
    const path = repairRunPaths(repoRoot, repairId).session;
    if (!existsSync(path)) {
        throw new Error(`Unknown repair session: ${repairId}`);
    }
    return readJsonFile(path);
}
export function saveRepairSession(repoRoot, session) {
    withRepairIndexLock(repoRoot, "save_repair_session", () => {
        const paths = repairRunPaths(repoRoot, session.repair_id);
        ensureRepairRunDir(paths);
        atomicWriteJson(paths.session, session);
        writeLatestPointer(paths.root, session.repair_id);
        const currentIndex = loadRepairSessionIndex(repoRoot);
        const updatedIndex = upsertRepairSessionInIndex(currentIndex, session);
        atomicWriteJson(paths.root.sessionsIndex, updatedIndex);
    });
}
export function updateRepairSession(repoRoot, repairId, updater) {
    return withRepairSessionLock(repoRoot, repairId, "update_repair_session", () => {
        const current = loadRepairSession(repoRoot, repairId);
        const next = updater(current);
        saveRepairSession(repoRoot, next);
        return next;
    });
}
export function closeRepairSession(input) {
    return updateRepairSession(input.repoRoot, input.repairId, session => ({
        ...session,
        status: input.status,
        close_reason: input.reason,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }));
}
export function loadRepairSessionIndex(repoRoot) {
    const paths = repairRootPaths(repoRoot);
    if (!existsSync(paths.sessionsIndex)) {
        return createEmptyRepairSessionIndex();
    }
    return readJsonFile(paths.sessionsIndex);
}
export function listRepairSessions(repoRoot) {
    return loadRepairSessionIndex(repoRoot);
}
export function loadLatestRepairId(repoRoot) {
    const path = repairRootPaths(repoRoot).latestPointer;
    if (!existsSync(path))
        return null;
    const text = readFileSync(path, "utf-8").trim();
    if (!text)
        return null;
    try {
        const parsed = JSON.parse(text);
        return parsed.repair_id ?? null;
    }
    catch {
        return null;
    }
}
export function withRepairIndexLock(repoRoot, operation, fn) {
    const lockPath = repairRootPaths(repoRoot).globalLock;
    return withFileLock(lockPath, { operation }, fn);
}
export function withRepairSessionLock(repoRoot, repairId, operation, fn) {
    const lockPath = repairRunPaths(repoRoot, repairId).lock;
    return withFileLock(lockPath, { operation, repair_id: repairId }, fn);
}
export function emptyScopeSummary() {
    return {
        allowed: [],
        review_required: [],
        forbidden: [],
    };
}
export function updateSessionFromContract(input) {
    return updateRepairSession(input.repoRoot, input.repairId, session => ({
        ...session,
        status: input.status,
        current_revision: input.revision,
        scope_summary: input.scopeSummary,
        risk_level: input.riskLevel,
        base_sha: input.baseSha ?? null,
        updated_at: new Date().toISOString(),
    }));
}
function ensureRepairRunDir(paths) {
    mkdirSync(paths.dir, { recursive: true });
}
function writeLatestPointer(root, repairId) {
    atomicWriteText(root.latestPointer, `${JSON.stringify({ repair_id: repairId, updated_at: new Date().toISOString() }, null, 2)}\n`);
}
function withFileLock(lockPath, input, fn) {
    const createdAt = new Date().toISOString();
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (true) {
        try {
            mkdirSync(dirname(lockPath), { recursive: true });
            const fd = openSync(lockPath, "wx");
            try {
                const metadata = {
                    pid: process.pid,
                    created_at: createdAt,
                    operation: input.operation,
                    repair_id: input.repair_id,
                };
                writeFileSync(fd, `${JSON.stringify(metadata, null, 2)}\n`);
            }
            finally {
                closeSync(fd);
            }
            break;
        }
        catch {
            if (Date.now() >= deadline) {
                throw new Error("Another Pantheon repair operation is active. Retry after it completes, or remove a stale lock if no process is running.");
            }
            sleepSync(LOCK_POLL_MS);
        }
    }
    try {
        return fn();
    }
    finally {
        rmSync(lockPath, { force: true });
    }
}
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
//# sourceMappingURL=repairSessionStore.js.map