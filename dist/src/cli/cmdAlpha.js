import { cmdAlphaInit } from "../alpha/alphaInit.js";
import { cmdAlphaDoctor } from "../alpha/alphaDoctor.js";
import { cmdRepair } from "./cmdRepair.js";
import { cmdReview } from "./cmdReview.js";
import { cmdMetrics } from "./cmdMetrics.js";
import { resolve } from "node:path";
import { rmSync } from "node:fs";
function getFlag(args, name) {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1])
        return args[idx + 1];
    return undefined;
}
export function cmdAlpha(args) {
    const subCommand = args[0];
    const tailArgs = args.slice(1);
    if (!subCommand) {
        console.error("Usage: pantheon alpha <init|doctor|status|repair|review|metrics|uninstall>");
        process.exitCode = 1;
        return;
    }
    const repoRoot = getFlag(tailArgs, "repo") ?? ".";
    switch (subCommand) {
        case "init":
            cmdAlphaInit({
                repoRoot,
                force: tailArgs.includes("--force"),
                noGithub: tailArgs.includes("--no-github"),
                actionRef: getFlag(tailArgs, "action-ref"),
                artifactMode: getFlag(tailArgs, "artifact-mode"),
            });
            break;
        case "doctor":
            cmdAlphaDoctor({ repoRoot });
            break;
        case "status":
            console.log("[Pantheon Alpha] Repair status");
            cmdRepair(["status", "--repo", repoRoot]);
            console.log("");
            console.log("[Pantheon Alpha] Review queue");
            cmdReview(["list", "--repo", repoRoot]);
            console.log("");
            console.log("[Pantheon Alpha] Metrics status");
            cmdMetrics(["status", "--repo", repoRoot]);
            break;
        case "repair":
            cmdRepair(normalizeAlphaRepairArgs(tailArgs, repoRoot));
            break;
        case "review":
            cmdReview([...tailArgs, "--repo", repoRoot]);
            break;
        case "metrics":
            cmdMetrics([...tailArgs, "--repo", repoRoot]);
            break;
        case "uninstall":
            if (tailArgs.includes("--yes")) {
                console.log(`[Pantheon Alpha] Uninstalling Pantheon entry files...`);
                const filesToRemove = [
                    "AGENTS.md",
                    "pantheon.agent.json",
                    "pantheon.alpha.json",
                    ".github/workflows/pantheon-repair.yml",
                    "docs/pantheon",
                    ".pantheon/governance",
                    ".pantheon/reviews",
                    ".pantheon/metrics",
                ];
                for (const f of filesToRemove) {
                    rmSync(resolve(repoRoot, f), { recursive: true, force: true });
                }
                if (tailArgs.includes("--purge")) {
                    rmSync(resolve(repoRoot, ".pantheon/repair"), { recursive: true, force: true });
                }
                console.log(`[Pantheon Alpha] Uninstalled successfully.`);
            }
            else {
                console.log(`This will remove generated Pantheon alpha entry files:
- AGENTS.md
- pantheon.agent.json
- pantheon.alpha.json
- .github/workflows/pantheon-repair.yml
- docs/pantheon/
- .pantheon/governance/
- .pantheon/reviews/
- .pantheon/metrics/

Repair history under .pantheon/repair/runs/ will be preserved unless --purge is provided.

Run with --yes to confirm.`);
            }
            break;
        default:
            console.error(`Unknown alpha command: ${subCommand}`);
            process.exitCode = 1;
            break;
    }
}
function normalizeAlphaRepairArgs(args, repoRoot) {
    const normalized = [...args, "--repo", repoRoot];
    if (args[0] === "plan" && !args.includes("--config")) {
        normalized.push("--config", "pantheon.alpha.json");
    }
    return normalized;
}
//# sourceMappingURL=cmdAlpha.js.map