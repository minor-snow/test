import { runChangeIntake } from "./cmdChangeIntake.js";
import { runChangePlan } from "./cmdChangePlan.js";
import { runChangeCheck } from "./cmdChangeCheck.js";
import { runChangeInfer } from "./cmdChangeInfer.js";
function getFlag(args, name) {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith("--")) {
        return args[idx + 1];
    }
    return undefined;
}
function hasFlag(args, name) {
    return args.includes(`--${name}`);
}
function getFlagValues(args, name) {
    const values = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] !== `--${name}`)
            continue;
        for (let j = i + 1; j < args.length && !args[j].startsWith("--"); j++) {
            values.push(args[j]);
            i = j;
        }
    }
    return values;
}
function requireFlag(args, name, message) {
    const value = getFlag(args, name);
    if (!value) {
        console.error(message);
        process.exit(1);
    }
    return value;
}
function requireFlagValues(args, name, message) {
    const values = getFlagValues(args, name);
    if (values.length === 0) {
        console.error(message);
        process.exit(1);
    }
    return values;
}
export function cmdChange(args) {
    const subcommand = args[0];
    const rest = args.slice(1);
    switch (subcommand) {
        case "intake":
            runChangeIntake(process.cwd(), {
                type: requireFlag(rest, "type", "Usage: pantheon change intake --type <type> --title <title> --reason <reason> --target <path...>"),
                title: requireFlag(rest, "title", "Usage: pantheon change intake --type <type> --title <title> --reason <reason> --target <path...>"),
                reason: requireFlag(rest, "reason", "Usage: pantheon change intake --type <type> --title <title> --reason <reason> --target <path...>"),
                target: requireFlagValues(rest, "target", "Usage: pantheon change intake --type <type> --title <title> --reason <reason> --target <path...>"),
                nonGoal: getFlagValues(rest, "non-goal"),
                note: getFlagValues(rest, "note"),
                json: hasFlag(rest, "json"),
            });
            return;
        case "plan":
            runChangePlan(process.cwd(), {
                changeId: requireFlag(rest, "change-id", "Usage: pantheon change plan --change-id <id>"),
                json: hasFlag(rest, "json"),
            });
            return;
        case "check":
            runChangeCheck(process.cwd(), {
                changeId: requireFlag(rest, "change-id", "Usage: pantheon change check --change-id <id> [--base <sha>]"),
                base: getFlag(rest, "base"),
                head: getFlag(rest, "head"),
                format: (getFlag(rest, "format") ?? "text"),
                failOn: (getFlag(rest, "fail-on") ?? "blocking"),
            });
            return;
        case "infer":
            runChangeInfer(process.cwd(), {
                fromDiff: hasFlag(rest, "from-diff") || !rest.includes("--from-diff"),
            });
            return;
        default:
            printChangeHelp();
            process.exit(subcommand ? 1 : 0);
    }
}
function printChangeHelp() {
    console.log("Pantheon Change Governance\n");
    console.log("Usage:");
    console.log('  pantheon change intake --type feature --title "Add feature" --reason "Why" --target src/module.ts');
    console.log("  pantheon change plan --change-id chg_abc123");
    console.log("  pantheon change check --change-id chg_abc123 [--base HEAD]");
    console.log("  pantheon change infer --from-diff");
}
//# sourceMappingURL=cmdChange.js.map