import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { matchesGlob } from "../../globMatch.js";
import { readdirSync, accessSync, constants } from "node:fs";

export type DoctorCheckResult = {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail";
  message?: string;
  path?: string;
};

export type ExternalDoctorResult = {
  ready: boolean;
  checks: DoctorCheckResult[];
};

export function runExternalDoctor(repoRoot = "."): ExternalDoctorResult {
  const root = resolve(repoRoot);
  const checks: DoctorCheckResult[] = [];

  // 1. git repo exists
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: root, stdio: "ignore" });
    checks.push({ id: "git_repo", label: "Git Repository", status: "pass" });
  } catch {
    checks.push({
      id: "git_repo",
      label: "Git Repository",
      status: "fail",
      message: "Not a git repository.",
    });
  }

  // 2. pantheon.alpha.json
  const alphaJsonPath = join(root, "pantheon.alpha.json");
  if (existsSync(alphaJsonPath)) {
    try {
      JSON.parse(readFileSync(alphaJsonPath, "utf-8"));
      checks.push({ id: "pantheon_alpha_json", label: "pantheon.alpha.json", status: "pass", path: alphaJsonPath });
    } catch {
      checks.push({ id: "pantheon_alpha_json", label: "pantheon.alpha.json", status: "fail", message: "Invalid JSON", path: alphaJsonPath });
    }
  } else {
    checks.push({ id: "pantheon_alpha_json", label: "pantheon.alpha.json", status: "fail", message: "Missing file", path: alphaJsonPath });
  }

  // 3. pantheon.agent.json
  const agentJsonPath = join(root, "pantheon.agent.json");
  if (existsSync(agentJsonPath)) {
    try {
      JSON.parse(readFileSync(agentJsonPath, "utf-8"));
      checks.push({ id: "pantheon_agent_json", label: "pantheon.agent.json", status: "pass", path: agentJsonPath });
    } catch {
      checks.push({ id: "pantheon_agent_json", label: "pantheon.agent.json", status: "fail", message: "Invalid JSON", path: agentJsonPath });
    }
  } else {
    checks.push({ id: "pantheon_agent_json", label: "pantheon.agent.json", status: "fail", message: "Missing file", path: agentJsonPath });
  }

  // 4. .pantheon directory
  const pantheonDir = join(root, ".pantheon");
  if (existsSync(pantheonDir)) {
    checks.push({ id: "pantheon_dir", label: ".pantheon directory", status: "pass", path: pantheonDir });
  } else {
    try {
      accessSync(root, constants.W_OK);
      checks.push({ id: "pantheon_dir", label: ".pantheon directory", status: "warning", message: "Directory missing (can be created)", path: pantheonDir });
    } catch {
      checks.push({ id: "pantheon_dir", label: ".pantheon directory", status: "fail", message: "Directory missing and root is unwritable", path: pantheonDir });
    }
  }

  // 5. AGENTS.md or docs/pantheon/**
  const agentsMdPath = join(root, "AGENTS.md");
  const docsPantheonDir = join(root, "docs", "pantheon");
  if (existsSync(agentsMdPath)) {
    checks.push({ id: "agents_docs", label: "Agent Documentation", status: "pass", path: agentsMdPath });
  } else if (existsSync(docsPantheonDir) && readdirSync(docsPantheonDir).length > 0) {
    checks.push({
      id: "agents_docs",
      label: "Agent Documentation",
      status: "warning",
      message: "AGENTS.md missing, but docs/pantheon/** exists.",
      path: docsPantheonDir,
    });
  } else {
    checks.push({
      id: "agents_docs",
      label: "Agent Documentation",
      status: "fail",
      message: "Neither AGENTS.md nor docs/pantheon/** found.",
    });
  }

  const ready = !checks.some(c => c.status === "fail");

  return { ready, checks };
}
