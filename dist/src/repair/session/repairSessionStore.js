import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, closeSync } from "node:fs";
import { dirname } from "node:path";
import { deterministicId, readJsonFile } from "../repairUtils.js";
import { ensureRepairDirs, repairRootPaths, repairRunPaths, } from "../repairArtifactLayout.js";
import { atomicWriteJson, atomicWriteText } from "./atomicWrite.js";
import { createEmptyRepairSessionIndex, upsertRepairSessionInIndex, } from "./repairSessionIndex.js";
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_POLL_MS = 25;
let repairSessionNonce = 0;
const ALLOWED_SESSION_TRANSITIONS = {
    intake_created: ["intake_created", "intake_accepted", "intake_rejected", "plan_generated", "plan_pending_audit", "manual_repair_required"],
    intake_accepted: ["intake_accepted", "plan_generated", "plan_pending_audit", "manual_repair_required", "closed", "abandoned"],
    intake_rejected: ["intake_rejected", "closed", "abandoned"],
    plan_generated: ["plan_generated", "plan_pending_audit", "plan_approved", "plan_restricted", "manual_repair_required", "closed", "abandoned"],
    plan_pending_audit: ["plan_pending_audit", "plan_approved", "plan_restricted", "manual_repair_required", "repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "closed", "abandoned"],
    plan_approved: ["plan_approved", "plan_pending_audit", "plan_restricted", "manual_repair_required", "repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "closed", "abandoned"],
    plan_restricted: ["plan_restricted", "plan_pending_audit", "plan_approved", "manual_repair_required", "repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "closed", "abandoned"],
    manual_repair_required: ["manual_repair_required", "plan_pending_audit", "plan_approved", "plan_restricted", "closed", "abandoned"],
    repair_checked_pass: ["repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "plan_pending_audit", "plan_approved", "plan_restricted", "closed", "abandoned"],
    repair_checked_requires_review: ["repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "plan_pending_audit", "plan_approved", "plan_restricted", "manual_repair_required", "closed", "abandoned"],
    repair_checked_requires_scope_expansion: ["repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "plan_pending_audit", "manual_repair_required", "closed", "abandoned"],
    repair_checked_requires_replan: ["repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "plan_pending_audit", "plan_approved", "plan_restricted", "manual_repair_required", "closed", "abandoned"],
    repair_checked_fail: ["repair_checked_pass", "repair_checked_requires_review", "repair_checked_requires_scope_expansion", "repair_checked_requires_replan", "repair_checked_fail", "plan_pending_audit", "manual_repair_required", "closed", "abandoned"],
    closed: [],
    abandoned: [],
};
const VALID_SESSION_STATUSES = new Set([
    "intake_created",
    "intake_accepted",
    "intake_rejected",
    "plan_generated",
    "plan_pending_audit",
    "plan_approved",
    "plan_restricted",
    "manual_repair_required",
    "repair_checked_pass",
    "repair_checked_requires_review",
    "repair_checked_requires_scope_expansion",
    "repair_checked_requires_replan",
    "repair_checked_fail",
    "closed",
    "abandoned",
]);
export function createRepairSession(input) {
    const repoRoot = input.repoRoot;
    ensureRepairDirs(repoRoot);
    const createdAt = new Date().toISOString();
    repairSessionNonce += 1;
    const repairId = deterministicId("repair", {
        source: input.source,
        agent_id: input.agentId ?? null,
        created_at: createdAt,
        nonce: repairSessionNonce,
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
    return validateRepairSession(readJsonFile(path), repairId, path);
}
export function saveRepairSession(repoRoot, session) {
    persistRepairSession(repoRoot, session);
}
export function updateRepairSession(repoRoot, repairId, updater) {
    return withRepairIndexLock(repoRoot, "update_repair_session", () => withRepairSessionLock(repoRoot, repairId, "update_repair_session", () => {
        const current = loadRepairSession(repoRoot, repairId);
        const next = validateNextSession(current, updater(current));
        persistRepairSession(repoRoot, next);
        return next;
    }));
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
    return validateRepairSessionIndex(readJsonFile(paths.sessionsIndex), paths.sessionsIndex);
}
export function listRepairSessions(repoRoot) {
    return loadRepairSessionIndex(repoRoot);
}
export function loadLatestRepairId(repoRoot) {
    const path = repairRootPaths(repoRoot).latestPointer;
    try {
        const text = readFileSync(path, "utf-8").trim();
        if (!text)
            return null;
        const parsed = JSON.parse(text);
        return parsed.repair_id ?? null;
    }
    catch (error) {
        if (isErrnoException(error) && error.code === "ENOENT") {
            return null;
        }
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
        current_revision: Math.max(session.current_revision, input.revision),
        scope_summary: input.scopeSummary,
        risk_level: input.riskLevel,
        base_sha: input.baseSha ?? null,
        updated_at: new Date().toISOString(),
    }));
}
function persistRepairSession(repoRoot, session) {
    const paths = repairRunPaths(repoRoot, session.repair_id);
    ensureRepairRunDir(paths);
    atomicWriteJson(paths.session, session);
    writeLatestPointer(paths.root, session.repair_id);
    const currentIndex = loadRepairSessionIndex(repoRoot);
    const updatedIndex = upsertRepairSessionInIndex(currentIndex, session);
    atomicWriteJson(paths.root.sessionsIndex, updatedIndex);
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
        catch (error) {
            if (!isErrnoException(error) || error.code !== "EEXIST") {
                throw error;
            }
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
function validateNextSession(current, next) {
    if (current.repair_id !== next.repair_id) {
        throw new Error("Repair session update cannot change repair_id.");
    }
    if (next.current_revision < current.current_revision) {
        throw new Error(`Repair session revision regression for ${current.repair_id}: ${next.current_revision} < ${current.current_revision}.`);
    }
    if (current.status !== next.status) {
        const allowed = ALLOWED_SESSION_TRANSITIONS[current.status];
        if (!allowed.includes(next.status)) {
            throw new Error(`Invalid repair session transition: ${current.status} -> ${next.status} for ${current.repair_id}.`);
        }
    }
    return next;
}
function isErrnoException(error) {
    return typeof error === "object" && error !== null && "code" in error;
}
function validateRepairSession(value, expectedRepairId, sourcePath) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Invalid repair session at ${sourcePath}: expected object.`);
    }
    const session = value;
    if (session.schema_version !== "repair_session@0.1.0") {
        throw new Error(`Invalid repair session schema at ${sourcePath}: expected repair_session@0.1.0, got ${String(session.schema_version)}.`);
    }
    if (session.repair_id !== expectedRepairId) {
        throw new Error(`Invalid repair session at ${sourcePath}: expected repair_id ${expectedRepairId}, got ${String(session.repair_id)}.`);
    }
    if (typeof session.current_revision !== "number" || !Number.isInteger(session.current_revision) || session.current_revision < 0) {
        throw new Error(`Invalid repair session at ${sourcePath}: current_revision must be a non-negative integer.`);
    }
    if (!VALID_SESSION_STATUSES.has(session.status)) {
        throw new Error(`Invalid repair session at ${sourcePath}: unknown status ${String(session.status)}.`);
    }
    const scopeSummary = session.scope_summary;
    if (typeof scopeSummary !== "object" || scopeSummary === null || Array.isArray(scopeSummary)) {
        throw new Error(`Invalid repair session at ${sourcePath}: scope_summary must be an object.`);
    }
    const scope = scopeSummary;
    if (!Array.isArray(scope.allowed) || !Array.isArray(scope.review_required) || !Array.isArray(scope.forbidden)) {
        throw new Error(`Invalid repair session at ${sourcePath}: scope_summary arrays are missing.`);
    }
    return session;
}
function validateRepairSessionIndex(value, sourcePath) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Invalid repair session index at ${sourcePath}: expected object.`);
    }
    const index = value;
    if (index.schema_version !== "repair_session_index@0.1.0") {
        throw new Error(`Invalid repair session index schema at ${sourcePath}: expected repair_session_index@0.1.0, got ${String(index.schema_version)}.`);
    }
    if (!Array.isArray(index.active_repairs) || !Array.isArray(index.closed_repairs)) {
        throw new Error(`Invalid repair session index at ${sourcePath}: active_repairs and closed_repairs must be arrays.`);
    }
    for (const session of [...index.active_repairs, ...index.closed_repairs]) {
        if (typeof session !== "object" || session === null || Array.isArray(session)) {
            throw new Error(`Invalid repair session index at ${sourcePath}: session entry must be an object.`);
        }
        const repairId = session.repair_id;
        if (typeof repairId !== "string" || repairId.length === 0) {
            throw new Error(`Invalid repair session index at ${sourcePath}: session entry missing repair_id.`);
        }
        validateRepairSession(session, repairId, sourcePath);
    }
    return index;
}
//# sourceMappingURL=repairSessionStore.js.map