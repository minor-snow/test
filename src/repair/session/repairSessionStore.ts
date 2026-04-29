import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, closeSync } from "node:fs";
import { dirname } from "node:path";
import { deterministicId, readJsonFile } from "../repairUtils.js";
import {
  ensureRepairDirs,
  repairRootPaths,
  repairRunPaths,
  type RepairRootPaths,
  type RepairRunPaths,
} from "../repairArtifactLayout.js";
import { atomicWriteJson, atomicWriteText } from "./atomicWrite.js";
import {
  createEmptyRepairSessionIndex,
  upsertRepairSessionInIndex,
} from "./repairSessionIndex.js";
import type {
  RepairSession,
  RepairSessionIndex,
  RepairSessionScopeSummary,
  RepairSessionStatus,
} from "./repairSessionTypes.js";

type LockMetadata = {
  readonly pid: number;
  readonly created_at: string;
  readonly operation: string;
  readonly repair_id?: string;
};

const LOCK_TIMEOUT_MS = 5_000;
const LOCK_POLL_MS = 25;

export function createRepairSession(input: {
  repoRoot: string;
  agentId?: string;
  source: RepairSession["source"];
  status: RepairSessionStatus;
}): RepairSession {
  const repoRoot = input.repoRoot;
  ensureRepairDirs(repoRoot);
  const createdAt = new Date().toISOString();
  const repairId = deterministicId("repair", {
    source: input.source,
    agent_id: input.agentId ?? null,
    created_at: createdAt,
    nonce: Math.random().toString(36).slice(2),
  });

  const session: RepairSession = {
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

export function loadRepairSession(repoRoot: string, repairId: string): RepairSession {
  const path = repairRunPaths(repoRoot, repairId).session;
  if (!existsSync(path)) {
    throw new Error(`Unknown repair session: ${repairId}`);
  }
  return readJsonFile<RepairSession>(path);
}

export function saveRepairSession(repoRoot: string, session: RepairSession): void {
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

export function updateRepairSession(
  repoRoot: string,
  repairId: string,
  updater: (session: RepairSession) => RepairSession,
): RepairSession {
  return withRepairSessionLock(repoRoot, repairId, "update_repair_session", () => {
    const current = loadRepairSession(repoRoot, repairId);
    const next = updater(current);
    saveRepairSession(repoRoot, next);
    return next;
  });
}

export function closeRepairSession(input: {
  repoRoot: string;
  repairId: string;
  status: "closed" | "abandoned";
  reason: string;
}): RepairSession {
  return updateRepairSession(input.repoRoot, input.repairId, session => ({
    ...session,
    status: input.status,
    close_reason: input.reason,
    closed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

export function loadRepairSessionIndex(repoRoot: string): RepairSessionIndex {
  const paths = repairRootPaths(repoRoot);
  if (!existsSync(paths.sessionsIndex)) {
    return createEmptyRepairSessionIndex();
  }
  return readJsonFile<RepairSessionIndex>(paths.sessionsIndex);
}

export function listRepairSessions(repoRoot: string): RepairSessionIndex {
  return loadRepairSessionIndex(repoRoot);
}

export function loadLatestRepairId(repoRoot: string): string | null {
  const path = repairRootPaths(repoRoot).latestPointer;
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf-8").trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { repair_id?: string };
    return parsed.repair_id ?? null;
  } catch {
    return null;
  }
}

export function withRepairIndexLock<T>(
  repoRoot: string,
  operation: string,
  fn: () => T,
): T {
  const lockPath = repairRootPaths(repoRoot).globalLock;
  return withFileLock(lockPath, { operation }, fn);
}

export function withRepairSessionLock<T>(
  repoRoot: string,
  repairId: string,
  operation: string,
  fn: () => T,
): T {
  const lockPath = repairRunPaths(repoRoot, repairId).lock;
  return withFileLock(lockPath, { operation, repair_id: repairId }, fn);
}

export function emptyScopeSummary(): RepairSessionScopeSummary {
  return {
    allowed: [],
    review_required: [],
    forbidden: [],
  };
}

export function updateSessionFromContract(input: {
  repoRoot: string;
  repairId: string;
  revision: number;
  status: RepairSessionStatus;
  scopeSummary: RepairSessionScopeSummary;
  riskLevel: RepairSession["risk_level"];
  baseSha: string | null | undefined;
}): RepairSession {
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

function ensureRepairRunDir(paths: RepairRunPaths): void {
  mkdirSync(paths.dir, { recursive: true });
}

function writeLatestPointer(root: RepairRootPaths, repairId: string): void {
  atomicWriteText(
    root.latestPointer,
    `${JSON.stringify({ repair_id: repairId, updated_at: new Date().toISOString() }, null, 2)}\n`,
  );
}

function withFileLock<T>(
  lockPath: string,
  input: { operation: string; repair_id?: string },
  fn: () => T,
): T {
  const createdAt = new Date().toISOString();
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      mkdirSync(dirname(lockPath), { recursive: true });
      const fd = openSync(lockPath, "wx");
      try {
        const metadata: LockMetadata = {
          pid: process.pid,
          created_at: createdAt,
          operation: input.operation,
          repair_id: input.repair_id,
        };
        writeFileSync(fd, `${JSON.stringify(metadata, null, 2)}\n`);
      } finally {
        closeSync(fd);
      }
      break;
    } catch {
      if (Date.now() >= deadline) {
        throw new Error(
          "Another Pantheon repair operation is active. Retry after it completes, or remove a stale lock if no process is running.",
        );
      }
      sleepSync(LOCK_POLL_MS);
    }
  }

  try {
    return fn();
  } finally {
    rmSync(lockPath, { force: true });
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
