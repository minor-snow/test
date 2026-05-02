import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getAllGateIds } from "../gateRegistry.js";
import { getCriticalFieldBehaviors } from "../governance/fieldBehaviorRegistry.js";
import { cmdDoctor } from "./cmdDoctor.js";

export type AgentDoctorCheck = {
  readonly id:
    | "agents_md"
    | "pantheon_agent_json"
    | "bug_report_template"
    | "repair_inbox_dir"
    | "repair_runs_dir"
    | "governance_dir"
    | "reviews_dir"
    | "metrics_dir"
    | "dist_cli"
    | "workflow_example"
    | "agent_quickstart";
  readonly label: string;
  readonly ok: boolean;
  readonly path: string;
  readonly note?: string;
};

export type AgentDoctorResult = {
  readonly repoRoot: string;
  readonly ready: boolean;
  readonly checks: readonly AgentDoctorCheck[];
  readonly nextCommands: readonly string[];
};

export function cmdAgentDoctor(repoRoot = "."): void {
  console.warn("WARN: `pantheon agent doctor` is deprecated. Please use `pantheon doctor` instead.\n");
  cmdDoctor(repoRoot);
}

export function runAgentDoctor(repoRoot = "."): AgentDoctorResult {
  const root = resolve(repoRoot);
  const checks: AgentDoctorCheck[] = [
    checkFile(root, "agents_md", "AGENTS.md", "AGENTS.md"),
    checkPantheonAgentJson(root),
    checkFile(
      root,
      "bug_report_template",
      "Agent bug report template",
      join(".pantheon", "repair", "inbox", "agent_bug_report.template.json"),
    ),
    checkDir(root, "repair_inbox_dir", "Repair inbox", join(".pantheon", "repair", "inbox")),
    checkDir(root, "repair_runs_dir", "Repair runs directory", join(".pantheon", "repair", "runs")),
    checkDir(root, "governance_dir", "Governance log directory", join(".pantheon", "governance")),
    checkDir(root, "reviews_dir", "Review queue directory", join(".pantheon", "reviews")),
    checkDir(root, "metrics_dir", "Metrics directory", join(".pantheon", "metrics")),
    checkFile(root, "dist_cli", "Compiled Pantheon CLI", join("dist", "src", "cli", "pantheon.js")),
    checkFile(root, "workflow_example", "GitHub repair workflow example", join("examples", "github", "repair-gate.yml")),
    checkFile(root, "agent_quickstart", "Agent quickstart", join("docs", "closed-alpha", "agent-quickstart.md")),
  ];

  const ready = checks.every(check => check.ok);
  const nextCommands = ready
    ? [
        "node dist/src/cli/pantheon-alpha.js repair intake --from .pantheon/repair/inbox/agent_bug_report.json",
        "node dist/src/cli/pantheon-alpha.js repair plan --repair-id <repair_id>",
        "node dist/src/cli/pantheon-alpha.js repair check --repair-id <repair_id>",
        "node dist/src/cli/pantheon-alpha.js review list",
        "node dist/src/cli/pantheon-alpha.js metrics daily",
      ]
    : buildNextCommands(checks);

  return {
    repoRoot: root,
    ready,
    checks,
    nextCommands,
  };
}

function checkPantheonAgentJson(repoRoot: string): AgentDoctorCheck {
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
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as {
      schema_version?: string;
      primary_entrypoints?: { read_first?: string };
      entrypoints?: { read_first?: string };
      commands?: {
        repair_intake?: string;
        repair_plan?: string;
        repair_check?: string;
        review_list?: string;
        metrics_daily?: string;
        metrics_status?: string;
      };
      repair_protocol?: { requires_repair_id?: boolean; latest_is_convenience_only?: boolean };
      local_governance?: { events?: string; review_queue?: string; daily_metrics?: string };
    };
    const valid = parsed.schema_version === "pantheon_agent_entry@0.1.0"
      && (parsed.primary_entrypoints?.read_first === "AGENTS.md" || parsed.entrypoints?.read_first === "AGENTS.md")
      && typeof parsed.commands?.repair_intake === "string"
      && typeof parsed.commands?.repair_plan === "string"
      && typeof parsed.commands?.repair_check === "string"
      && typeof parsed.commands?.review_list === "string"
      && typeof parsed.commands?.metrics_daily === "string"
      && typeof parsed.commands?.metrics_status === "string"
      && parsed.repair_protocol?.requires_repair_id === true
      && parsed.repair_protocol?.latest_is_convenience_only === true
      && typeof parsed.local_governance?.events === "string"
      && typeof parsed.local_governance?.review_queue === "string"
      && typeof parsed.local_governance?.daily_metrics === "string";

    return {
      id: "pantheon_agent_json",
      label: "pantheon.agent.json",
      ok: valid,
      path,
      note: valid ? undefined : "JSON exists but is missing one or more required closed-alpha fields.",
    };
  } catch (error) {
    return {
      id: "pantheon_agent_json",
      label: "pantheon.agent.json",
      ok: false,
      path,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkFile(
  repoRoot: string,
  id: AgentDoctorCheck["id"],
  label: string,
  relativePath: string,
): AgentDoctorCheck {
  const path = resolve(repoRoot, relativePath);
  return {
    id,
    label,
    ok: existsSync(path),
    path,
  };
}

function checkDir(
  repoRoot: string,
  id: AgentDoctorCheck["id"],
  label: string,
  relativePath: string,
): AgentDoctorCheck {
  const path = resolve(repoRoot, relativePath);
  return {
    id,
    label,
    ok: existsSync(path),
    path,
  };
}

function buildNextCommands(checks: readonly AgentDoctorCheck[]): string[] {
  const missingIds = new Set(checks.filter(check => !check.ok).map(check => check.id));
  const commands: string[] = [];

  if (missingIds.has("dist_cli")) {
    commands.push("npm run build");
  }
  if (missingIds.has("agents_md") || missingIds.has("pantheon_agent_json") || missingIds.has("agent_quickstart")) {
    commands.push("Review the closed-alpha entry surface before asking an agent to patch code.");
  }
  if (missingIds.has("bug_report_template") || missingIds.has("repair_inbox_dir") || missingIds.has("repair_runs_dir")) {
    commands.push("Ensure .pantheon/repair/inbox and .pantheon/repair/runs are present.");
  }
  if (missingIds.has("governance_dir") || missingIds.has("reviews_dir") || missingIds.has("metrics_dir")) {
    commands.push("Ensure .pantheon/governance, .pantheon/reviews, and .pantheon/metrics are present.");
  }
  if (missingIds.has("workflow_example")) {
    commands.push("Review examples/github/repair-gate.yml before enabling GitHub repair mode.");
  }

  if (commands.length === 0) {
    commands.push("Run the repair intake command with an agent bug report template.");
  }
  return commands;
}

function displayPath(repoRoot: string, fullPath: string): string {
  const normalizedRoot = `${repoRoot.replace(/\\/g, "/")}/`;
  const normalizedPath = fullPath.replace(/\\/g, "/");
  return normalizedPath.startsWith(normalizedRoot)
    ? normalizedPath.slice(normalizedRoot.length)
    : normalizedPath;
}
