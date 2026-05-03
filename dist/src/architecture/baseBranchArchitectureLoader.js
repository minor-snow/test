/**
 * P30-13: Base Branch Architecture Loader
 *
 * Reads the ArchitectureContract from a specific git SHA (base branch),
 * ensuring PR-modified architecture constraints do not self-authorize.
 */
import { execFileSync } from "node:child_process";
export function loadBaseArchitectureContract(repoRoot, baseSha) {
    const filePath = ".pantheon/architecture/architecture_contract.json";
    try {
        const raw = execFileSync("git", ["show", `${baseSha}:${filePath}`], {
            cwd: repoRoot,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 5000,
        });
        const parsed = JSON.parse(raw);
        return {
            status: "loaded",
            contract: parsed,
            base_sha: baseSha,
        };
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            return {
                status: "parse_error",
                contract: null,
                base_sha: baseSha,
            };
        }
        return {
            status: "missing",
            contract: null,
            base_sha: baseSha,
        };
    }
}
//# sourceMappingURL=baseBranchArchitectureLoader.js.map