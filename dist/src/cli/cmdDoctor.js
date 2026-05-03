import { runExternalDoctor } from "./doctor/externalDoctor.js";
export function cmdDoctor(repoRoot = ".") {
    const result = runExternalDoctor(repoRoot);
    console.log("Pantheon Doctor (External Repository Check)\n");
    for (const check of result.checks) {
        const statusStr = check.status === "pass" ? "[ok]" : check.status === "warning" ? "[warn]" : "[fail]";
        console.log(`${statusStr} ${check.label}${check.path ? `: ${displayPath(repoRoot, check.path)}` : ""}`);
        if (check.message) {
            console.log(`  ${check.message}`);
        }
    }
    console.log("");
    console.log(`Governance Harness Installed: ${result.ready ? "yes" : "no"}`);
    if (!result.ready) {
        console.log("\nTo initialize Pantheon in this repository, run:");
        console.log("  npx pantheon-alpha init");
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
//# sourceMappingURL=cmdDoctor.js.map