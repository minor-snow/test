import { execSync } from "node:child_process";
export function inferChangeFromDiff(repoRoot) {
    let diffOutput = "";
    try {
        diffOutput = execSync(`git diff --name-only HEAD`, { cwd: repoRoot, encoding: "utf-8" });
    }
    catch {
        // Ignore
    }
    const files = diffOutput.split("\n").map(f => f.trim()).filter(f => f.length > 0);
    if (files.length === 0) {
        return { change_type: "feature", targets: [], risk: "pass" };
    }
    const isOnlyTests = files.every(f => f.includes("test") || f.includes(".spec."));
    if (isOnlyTests) {
        return { change_type: "test_change", targets: files, risk: "pass" };
    }
    const isDependency = files.some(f => f === "package.json" || f.includes("lock"));
    if (isDependency) {
        return { change_type: "dependency_update", targets: files.filter(f => f === "package.json" || f.includes("lock")), risk: "requires_review" };
    }
    const isConfig = files.some(f => f.includes("config") || f.startsWith(".github/"));
    if (isConfig) {
        return { change_type: "config_change", targets: files.filter(f => f.includes("config") || f.startsWith(".github/")), risk: "requires_review" };
    }
    // Fallback to feature
    // Attempt to summarize the top level directories modified
    const topDirs = new Set();
    for (const f of files) {
        const parts = f.split("/");
        if (parts.length > 1) {
            topDirs.add(`${parts[0]}/${parts[1]}/**`);
        }
        else {
            topDirs.add(f);
        }
    }
    return {
        change_type: "feature",
        targets: Array.from(topDirs).slice(0, 3), // limit targets
        risk: "requires_contract",
    };
}
//# sourceMappingURL=changeInferUtility.js.map