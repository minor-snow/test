import { execSync } from "node:child_process";
export function captureRepoStateSnapshot(input) {
    if (input.source === "synthetic") {
        return {
            base_sha: input.diffBase ?? null,
            head_sha: input.diffBase ?? null,
            diff_base: input.diffBase ?? null,
            working_tree_status: "unknown",
            created_at: new Date().toISOString(),
            source: "synthetic",
        };
    }
    try {
        const headSha = execSync("git rev-parse HEAD", {
            cwd: input.repoRoot,
            encoding: "utf-8",
            timeout: 10_000,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        const status = execSync("git status --porcelain", {
            cwd: input.repoRoot,
            encoding: "utf-8",
            timeout: 10_000,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        return {
            base_sha: headSha || null,
            head_sha: headSha || null,
            diff_base: input.diffBase ?? headSha ?? null,
            working_tree_status: status ? "dirty" : "clean",
            created_at: new Date().toISOString(),
            source: input.source ?? "git",
        };
    }
    catch {
        return {
            base_sha: null,
            head_sha: null,
            diff_base: input.diffBase ?? null,
            working_tree_status: "unknown",
            created_at: new Date().toISOString(),
            source: input.source ?? "unknown",
        };
    }
}
//# sourceMappingURL=repoStateSnapshot.js.map