import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DoctorCheckResult } from "./externalDoctor.js";

export type SelfDoctorResult = {
  ready: boolean;
  checks: DoctorCheckResult[];
};

export function runSelfDoctor(repoRoot = "."): SelfDoctorResult {
  const root = resolve(repoRoot);
  const checks: DoctorCheckResult[] = [];

  const mustExist = [
    { id: "src_dir", label: "Source Directory", path: "src" },
    { id: "test_dir", label: "Test Directory", path: "test" },
    { id: "dist_cli", label: "Compiled CLI", path: join("dist", "src", "cli", "pantheon.js") },
    { id: "action_dist", label: "Compiled Action", path: join("action", "dist", "index.js") },
    { id: "dogfood_dir", label: "Dogfood Fixtures", path: join("data", "dogfood") },
    { id: "closed_alpha_docs", label: "Closed Alpha Docs", path: join("docs", "closed-alpha") },
  ];

  for (const item of mustExist) {
    const fullPath = join(root, item.path);
    if (existsSync(fullPath)) {
      checks.push({ id: item.id, label: item.label, status: "pass", path: fullPath });
    } else {
      checks.push({
        id: item.id,
        label: item.label,
        status: "fail",
        message: `Missing required internal path: ${item.path}`,
        path: fullPath,
      });
    }
  }

  const ready = !checks.some(c => c.status === "fail");

  return { ready, checks };
}
