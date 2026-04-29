import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
export function cmdAgentDoctor(repoRoot = ".") {
    const result = runAgentDoctor(repoRoot);
    console.log("Pantheon Agent Doctor\n");
    for (const check of result.checks) {
        console.log(`${check.ok ? "[ok]" : "[missing]"} ${check.label}: ${displayPath(result.repoRoot, check.path)}`);
        if (check.note) {
            console.log(`  ${check.note}`);
        }
    }
    console.log("");
    console.log(`Agent-usable repo: ${result.ready ? "yes" : "no"}`);
    if (result.nextCommands.length > 0) {
        console.log("");
        console.log("Next commands:");
        for (const command of result.nextCommands) {
            console.log(`  ${command}`);
        }
    }
    return result;
}
export function runAgentDoctor(repoRoot = ".") {
    const root = resolve(repoRoot);
    const checks = [
        checkFile(root, "agents_md", "AGENTS.md", "AGENTS.md"),
        checkPantheonAgentJson(root),
        checkFile(root, "bug_report_template", "Agent bug report template", join(".pantheon", "repair", "inbox", "agent_bug_report.template.json")),
        checkDir(root, "repair_inbox_dir", "Repair inbox", join(".pantheon", "repair", "inbox")),
        checkDir(root, "repair_runs_dir", "Repair runs directory", join(".pantheon", "repair", "runs")),
        checkFile(root, "dist_cli", "Compiled Pantheon CLI", join("dist", "src", "cli", "pantheon.js")),
        checkFile(root, "workflow_example", "GitHub repair workflow example", join("examples", "github", "repair-gate.yml")),
        checkFile(root, "agent_quickstart", "Agent quickstart", join("docs", "closed-alpha", "agent-quickstart.md")),
    ];
    const ready = checks.every(check => check.ok);
    const nextCommands = ready
        ? [
            "node dist/src/cli/pantheon.js repair intake --from .pantheon/repair/inbox/agent_bug_report.json",
            "node dist/src/cli/pantheon.js repair plan --repair-id <repair_id> --config pantheon.alpha.json",
            "node dist/src/cli/pantheon.js repair check --repair-id <repair_id>",
        ]
        : buildNextCommands(checks);
    return {
        repoRoot: root,
        ready,
        checks,
        nextCommands,
    };
}
function checkPantheonAgentJson(repoRoot) {
    const path = resolve(repoRoot, "pantheon.agent.json");
    if (!existsSync(path)) {
        return {
            id: "pantheon_agent_json",
            label: "pantheon.agent.json",
            ok: false,
            path,
        };
    }
    try {
        const parsed = JSON.parse(readFileSync(path, "utf-8"));
        const valid = parsed.schema_version === "pantheon_agent_entry@0.1.0"
            && parsed.primary_entrypoints?.read_first === "AGENTS.md"
            && parsed.repair_protocol?.requires_repair_id === true
            && parsed.repair_protocol?.latest_is_convenience_only === true;
        return {
            id: "pantheon_agent_json",
            label: "pantheon.agent.json",
            ok: valid,
            path,
            note: valid ? undefined : "JSON exists but is missing one or more required closed-alpha fields.",
        };
    }
    catch (error) {
        return {
            id: "pantheon_agent_json",
            label: "pantheon.agent.json",
            ok: false,
            path,
            note: error instanceof Error ? error.message : String(error),
        };
    }
}
function checkFile(repoRoot, id, label, relativePath) {
    const path = resolve(repoRoot, relativePath);
    return {
        id,
        label,
        ok: existsSync(path),
        path,
    };
}
function checkDir(repoRoot, id, label, relativePath) {
    const path = resolve(repoRoot, relativePath);
    return {
        id,
        label,
        ok: existsSync(path),
        path,
    };
}
function buildNextCommands(checks) {
    const missingIds = new Set(checks.filter(check => !check.ok).map(check => check.id));
    const commands = [];
    if (missingIds.has("dist_cli")) {
        commands.push("npm run build");
    }
    if (missingIds.has("agents_md") || missingIds.has("pantheon_agent_json") || missingIds.has("agent_quickstart")) {
        commands.push("Review the closed-alpha entry surface before asking an agent to patch code.");
    }
    if (missingIds.has("bug_report_template") || missingIds.has("repair_inbox_dir") || missingIds.has("repair_runs_dir")) {
        commands.push("Ensure .pantheon/repair/inbox and .pantheon/repair/runs are present.");
    }
    if (missingIds.has("workflow_example")) {
        commands.push("Review examples/github/repair-gate.yml before enabling GitHub repair mode.");
    }
    if (commands.length === 0) {
        commands.push("Run the repair intake command with an agent bug report template.");
    }
    return commands;
}
function displayPath(repoRoot, fullPath) {
    const normalizedRoot = `${repoRoot.replace(/\\/g, "/")}/`;
    const normalizedPath = fullPath.replace(/\\/g, "/");
    return normalizedPath.startsWith(normalizedRoot)
        ? normalizedPath.slice(normalizedRoot.length)
        : normalizedPath;
}
//# sourceMappingURL=cmdAgentDoctor.js.map