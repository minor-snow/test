/**
 * Pantheon CLI
 *
 * Usage:
 *   pantheon init
 *   pantheon guard "<intent>" --scope <path-or-glob> [--scope ...] [--review ...] [--forbid ...]
 *   pantheon check [--base HEAD]
 *   pantheon feedback [--attempt N]
 *   pantheon report [--attempt N]
 *   pantheon repair intake --from agent_bug_report.json
 *   pantheon repair intake --intent "..." --suspect path --failing-test path
 *   pantheon repair plan --repair-id repair_abc123
 *   pantheon repair audit --repair-id repair_abc123 --target-revision 1 --gate repair_plan --decision approve --reason "..."
 *   pantheon repair check --repair-id repair_abc123 [--base HEAD]
 */
import { cmdInit } from "./cmdInit.js";
import { cmdGuard } from "./cmdGuard.js";
import { cmdCheck } from "./cmdCheck.js";
import { cmdFeedback } from "./cmdFeedback.js";
import { cmdReport } from "./cmdReport.js";
import { cmdRepair } from "./cmdRepair.js";
import { cmdAgentDoctor } from "./cmdAgentDoctor.js";
import { cmdDoctor } from "./cmdDoctor.js";
import { cmdSelfDoctor } from "./cmdSelfDoctor.js";
import { cmdAlpha } from "./cmdAlpha.js";
import { cmdReview } from "./cmdReview.js";
import { cmdMetrics } from "./cmdMetrics.js";
import { cmdArch } from "./cmdArch.js";
import { getChangeCommand } from "./cmdChange.js";
const args = process.argv.slice(2);
const command = args[0];
function getFlag(name) {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1])
        return args[idx + 1];
    return undefined;
}
function getFlagInt(name) {
    const val = getFlag(name);
    if (val === undefined)
        return undefined;
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? undefined : n;
}
function getAllFlags(name) {
    const result = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === `--${name}` && args[i + 1]) {
            result.push(args[i + 1]);
            i++;
        }
    }
    return result;
}
function getRepo() {
    return getFlag("repo") ?? ".";
}
function printHelp() {
    console.log("Pantheon - AI Change Governance\n");
    console.log("Usage:");
    console.log("  pantheon init                              Create pantheon.json and .pantheon/");
    console.log('  pantheon guard "<intent>" --scope <path>   Scan repo and create task boundary');
    console.log("  pantheon check                             Verify agent changes against scope");
    console.log("  pantheon feedback                          Print agent feedback to stdout");
    console.log("  pantheon report                            Print reviewer report to stdout");
    console.log("  pantheon arch <subcommand>               Architecture governance workflow");
    console.log("  pantheon change <subcommand>             General change governance workflow");
    console.log("  pantheon repair <subcommand>               Run repair governance workflow");
    console.log("  pantheon review <subcommand>               Manage local human review requests");
    console.log("  pantheon metrics <subcommand>              Show local governance metrics");
    console.log("  pantheon doctor                            Verify external repository governance harness");
    console.log("  pantheon self doctor                       Verify Pantheon internal development environment");
    console.log("Options:");
    console.log("  --repo <path>                              Repo root (default: .)");
    console.log("  --scope <path-or-glob>                     Authorized file/directory (guard only, repeatable)");
    console.log("  --review <path-or-glob>                    Review-required file/directory (guard only, repeatable)");
    console.log("  --forbid <path-or-glob>                    Extra forbidden file/directory (guard only, repeatable)");
    console.log("  --config <path>                            Pantheon config path for guard (default: pantheon.json)");
    console.log("  --base <ref>                               Git base ref (check only, default: working tree)");
    console.log("  --attempt <N>                              Show specific attempt (feedback/report)");
    console.log("");
    console.log("Repair:");
    console.log("  pantheon repair intake --from bug_report.json");
    console.log("  pantheon repair intake --intent \"Fix bug\" --suspect src/file.ts --failing-test test/file.test.ts");
    console.log("  pantheon repair plan --repair-id repair_abc123 [--config pantheon.alpha.json]");
    console.log("  pantheon repair audit --repair-id repair_abc123 --target-revision 1 --gate repair_plan --decision approve --reason \"Scope looks safe.\"");
    console.log("  pantheon repair check --repair-id repair_abc123 [--base HEAD]");
    console.log("  pantheon repair list | status | show --repair-id repair_abc123");
    console.log("  pantheon repair close --repair-id repair_abc123 --reason \"merged\"");
    console.log("");
    console.log("Change:");
    console.log("  pantheon change intake --type feature --title \"Add feature\" --reason \"Why\" --target src/module.ts");
    console.log("  pantheon change plan --change-id chg_abc123");
    console.log("  pantheon change check --change-id chg_abc123 [--base HEAD]");
    console.log("  pantheon review list | show --repair-id repair_abc123 | close --repair-id repair_abc123");
    console.log("  pantheon metrics daily | status");
    console.log("");
    console.log("Alpha Harness:");
    console.log("  pantheon alpha init                        Initialize alpha harness in the repo");
    console.log("  pantheon alpha doctor                      Check if the repo is agent-usable");
    console.log("  pantheon alpha status                      Show repair, review, and metrics status");
    console.log("  pantheon alpha repair ...                  Run repair workflow through the alpha wrapper");
    console.log("  pantheon alpha review ...                  Inspect local review requests");
    console.log("  pantheon alpha metrics ...                 Generate or inspect local metrics");
    console.log("  pantheon alpha uninstall                   Remove generated alpha entry files");
    console.log("");
    console.log("Workflow:");
    console.log("  1. pantheon init                           (once per project)");
    console.log('  2. pantheon guard "Add feature" --scope src/checkout/**');
    console.log("  3. Give .pantheon/task.md to your AI agent");
    console.log("  4. Agent edits code");
    console.log("  5. pantheon check                          (verify the agent's work)");
    console.log("  6. pantheon feedback                       (use the retry guidance)");
}
switch (command) {
    case "init":
        cmdInit(getRepo());
        break;
    case "guard": {
        const intent = args[1];
        if (!intent || intent.startsWith("--")) {
            console.error("Error: intent required.");
            console.error('Usage: pantheon guard "your task description" --scope src/module/** [--review tests/integration/**] [--forbid migrations/**] [--config pantheon.json]');
            process.exit(1);
        }
        const scopePatterns = getAllFlags("scope");
        const reviewPatterns = getAllFlags("review");
        const forbiddenPatterns = getAllFlags("forbid");
        cmdGuard({
            repoRoot: getRepo(),
            intent,
            scopePatterns,
            reviewPatterns,
            forbiddenPatterns,
            configPath: getFlag("config"),
        });
        break;
    }
    case "check":
        cmdCheck({ repoRoot: getRepo(), baseRef: getFlag("base") });
        break;
    case "feedback":
        cmdFeedback(getRepo(), getFlagInt("attempt"));
        break;
    case "report":
        cmdReport(getRepo(), getFlagInt("attempt"));
        break;
    case "repair":
        cmdRepair(args.slice(1));
        break;
    case "review":
        cmdReview(args.slice(1));
        break;
    case "metrics":
        cmdMetrics(args.slice(1));
        break;
    case "alpha":
        cmdAlpha(args.slice(1));
        break;
    case "arch":
        cmdArch(args.slice(1));
        break;
    case "change":
        getChangeCommand().parse(["node", "change", ...args.slice(1)]);
        break;
    case "doctor":
        cmdDoctor(getRepo());
        break;
    case "self":
        if (args[1] === "doctor") {
            cmdSelfDoctor(getRepo());
            break;
        }
        console.error('Unknown self subcommand. Run "pantheon self doctor".');
        process.exit(1);
        break;
    case "agent":
        if (args[1] === "doctor") {
            cmdAgentDoctor(getRepo());
            break;
        }
        console.error('Unknown agent subcommand.');
        process.exit(1);
        break;
    case "--help":
    case "-h":
    case "help":
    case undefined:
        printHelp();
        break;
    default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "pantheon --help" for usage.');
        process.exit(1);
}
