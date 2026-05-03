import { runSelfDoctor } from "./doctor/selfDoctor.js";
export function cmdSelfDoctor(repoRoot = ".") {
    const result = runSelfDoctor(repoRoot);
    console.log("Pantheon Self Doctor (Internal Development Check)\n");
    for (const check of result.checks) {
        const statusStr = check.status === "pass" ? "[ok]" : check.status === "warning" ? "[warn]" : "[fail]";
        console.log(`${statusStr} ${check.label}${check.path ? `: ${displayPath(repoRoot, check.path)}` : ""}`);
        if (check.message) {
            console.log(`  ${check.message}`);
        }
    }
    console.log("");
    console.log(`Internal Development Ready: ${result.ready ? "yes" : "no"}`);
    if (!result.ready) {
        console.log("\nTo fix missing artifacts, try running:");
        console.log("  npm run build");
        console.log("  npm run pack");
        process.exitCode = 1;
    }
}
function displayPath(repoRoot, fullPath) {
    const normalizedRoot = `${repoRoot.replace(/\\/g, "/")}/`;
    const normalizedPath = fullPath.replace(/\\/g, "/");
    return normalizedPath.startsWith(normalizedRoot)
        ? normalizedPath.slice(normalizedRoot.length)
        : normalizedPath;
}
//# sourceMappingURL=cmdSelfDoctor.js.map