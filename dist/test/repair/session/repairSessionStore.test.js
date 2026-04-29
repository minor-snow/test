import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeRepairSession, createRepairSession, loadRepairSession, loadRepairSessionIndex, updateRepairSession, } from "../../../src/repair/session/repairSessionStore.js";
import { repairRunPaths } from "../../../src/repair/repairArtifactLayout.js";
describe("repairSessionStore", () => {
    const tmpDir = join("test", "repair", "__tmp_session_store__");
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        mkdirSync(tmpDir, { recursive: true });
        writeFileSync(join(tmpDir, "pantheon.json"), JSON.stringify({
            version: 1,
            protected: [".pantheon/**"],
            review_required: [],
            generated: [],
            path_roles: {},
        }, null, 2));
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("creates unique run-scoped sessions and updates the index", () => {
        const first = createRepairSession({
            repoRoot: tmpDir,
            source: "agent_bug_report",
            status: "intake_created",
            agentId: "claude-code",
        });
        const second = createRepairSession({
            repoRoot: tmpDir,
            source: "user_report",
            status: "intake_created",
        });
        expect(first.repair_id).not.toBe(second.repair_id);
        expect(existsSync(repairRunPaths(tmpDir, first.repair_id).session)).toBe(true);
        expect(existsSync(repairRunPaths(tmpDir, second.repair_id).session)).toBe(true);
        const index = loadRepairSessionIndex(tmpDir);
        expect(index.active_repairs.map(item => item.repair_id)).toContain(first.repair_id);
        expect(index.active_repairs.map(item => item.repair_id)).toContain(second.repair_id);
    });
    it("keeps sessions.json as an index while session.json remains authoritative", () => {
        const session = createRepairSession({
            repoRoot: tmpDir,
            source: "manual",
            status: "intake_created",
        });
        updateRepairSession(tmpDir, session.repair_id, current => ({
            ...current,
            status: "plan_pending_audit",
            current_revision: 1,
            updated_at: new Date().toISOString(),
        }));
        const loaded = loadRepairSession(tmpDir, session.repair_id);
        const index = loadRepairSessionIndex(tmpDir);
        expect(loaded.status).toBe("plan_pending_audit");
        expect(index.active_repairs.find(item => item.repair_id === session.repair_id)?.status).toBe("plan_pending_audit");
        expect(JSON.parse(readFileSync(repairRunPaths(tmpDir, session.repair_id).session, "utf-8")).repair_id).toBe(session.repair_id);
    });
    it("moves closed sessions out of the active index", () => {
        const session = createRepairSession({
            repoRoot: tmpDir,
            source: "manual",
            status: "plan_pending_audit",
        });
        closeRepairSession({
            repoRoot: tmpDir,
            repairId: session.repair_id,
            status: "closed",
            reason: "merged",
        });
        const index = loadRepairSessionIndex(tmpDir);
        expect(index.active_repairs.find(item => item.repair_id === session.repair_id)).toBeUndefined();
        expect(index.closed_repairs.find(item => item.repair_id === session.repair_id)?.status).toBe("closed");
    });
});
//# sourceMappingURL=repairSessionStore.test.js.map