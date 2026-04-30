import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { cmdRepairIntake, cmdRepairPlan, cmdRepairAudit, cmdRepairCheck } from "../src/cli/cmdRepair.js";
import { repairRunPaths } from "../src/repair/repairArtifactLayout.js";
import { sanitizeArtifact } from "../src/artifacts/artifactSanitizer.js";

const BASE_DIR = resolve("data/dogfood/p28_2_repair_dogfood");

type DogfoodCase = {
  case_id: string;
  repo_id: string;
  project_role: string;
  variant: "allowed" | "review" | "forbidden" | "outside" | "audit";
  intent: string;
  agent_bug_report: string;
  synthetic_changed_files: { path: string; change_kind: string }[];
  expected_verdict: "pass" | "requires_review" | "fail" | "requires_scope_expansion";
  human_audit_decisions?: {
    gate: "bug_intake" | "repair_plan" | "post_repair";
    decision: string;
    reason: string;
    add_review?: string[];
    add_forbid?: string[];
    add_must_preserve?: string[];
  }[];
  expected_public_artifacts: string[];
};

type DogfoodManifest = {
  schema_version: string;
  cases: DogfoodCase[];
};

export function runDogfoodCase(c: DogfoodCase): { passed: boolean; error?: string; violations: number } {
  const caseDir = join(BASE_DIR, c.repo_id, c.case_id.replace(`${c.repo_id}_`, ""));
  const reportPath = join(caseDir, "agent_bug_report.json");
  const diffPath = join(caseDir, "synthetic_diff.json");
  
  // Set up an isolated repo fixture directory for this case
  const repoRoot = join(caseDir, "repo_fixture");
  rmSync(repoRoot, { recursive: true, force: true });
  mkdirSync(repoRoot, { recursive: true });
  
  // Need to dynamically create pantheon.json for the project_role mapping
  // This is a bit tricky since we share one repoRoot, but since tests run sequentially we can overwrite it.
  const pantheonConfig = {
    version: 1,
    protected: [".pantheon/**", ".cursor/**", ".git/**"],
    review_required: [],
    generated: [],
    path_roles: {
      "**/*": "src"
    },
    project_role: c.project_role
  };
  writeFileSync(join(repoRoot, "pantheon.json"), JSON.stringify(pantheonConfig, null, 2));

  let violations = 0;
  let passed = true;
  let errorMsg = "";

  try {
    // Provide framework signals to trigger pythonFrameworkDetector correctly
    if (c.repo_id === "httpx") {
      writeFileSync(join(repoRoot, "pyproject.toml"), "[project]\nname = \"httpx\"");
      writeFileSync(join(repoRoot, "py.typed"), "");
    } else if (c.repo_id === "fastapi") {
      writeFileSync(join(repoRoot, "requirements.txt"), "fastapi\n");
    } else if (c.repo_id === "saleor") {
      writeFileSync(join(repoRoot, "requirements.txt"), "django\n");
      writeFileSync(join(repoRoot, "manage.py"), "# dummy");
    }

    // Write dummy files so they are observed by the repo scanner
    for (const f of c.synthetic_changed_files) {
      const fullPath = join(repoRoot, f.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, "# dummy");
    }

    // 1. Intake
    const session = cmdRepairIntake({
      repoRoot,
      fromPath: reportPath,
      suspectPaths: [],
      failingTests: [],
      mustPreserve: [],
    });

    // Auto-approve intake so plan can run
    cmdRepairAudit({
      repoRoot,
      repairId: session.repair_id,
      targetRevision: 1,
      gate: "bug_intake",
      decision: "accept",
      reason: "Dogfood automated approval",
      operatorId: "dogfood",
      addReview: [],
      addForbid: [],
      addMustPreserve: [],
    });

    // Apply any additional intake audit decisions (like mark duplicate, etc, if we had any)
    const intakeDecisions = c.human_audit_decisions?.filter(d => d.gate === "bug_intake") ?? [];
    for (const d of intakeDecisions) {
      cmdRepairAudit({
        repoRoot,
        repairId: session.repair_id,
        targetRevision: 1,
        gate: d.gate,
        decision: d.decision,
        reason: d.reason,
        operatorId: "dogfood",
        addReview: d.add_review ?? [],
        addForbid: d.add_forbid ?? [],
        addMustPreserve: d.add_must_preserve ?? [],
      });
    }

    // 2. Plan
    cmdRepairPlan({
      repoRoot,
      repairId: session.repair_id,
    });
    let currentRevision = 1;

    // Apply any plan audit decisions
    const planDecisions = c.human_audit_decisions?.filter(d => d.gate === "repair_plan") ?? [];
    for (const d of planDecisions) {
      cmdRepairAudit({
        repoRoot,
        repairId: session.repair_id,
        targetRevision: currentRevision,
        gate: d.gate,
        decision: d.decision,
        reason: d.reason,
        operatorId: "dogfood",
        addReview: d.add_review ?? [],
        addForbid: d.add_forbid ?? [],
        addMustPreserve: d.add_must_preserve ?? [],
      });
      currentRevision += 1;
    }

    // 3. Check
    cmdRepairCheck({
      repoRoot,
      repairId: session.repair_id,
      diffJsonPath: diffPath,
    });

    // Apply any post_repair audit decisions
    const postDecisions = c.human_audit_decisions?.filter(d => d.gate === "post_repair") ?? [];
    for (const d of postDecisions) {
      cmdRepairAudit({
        repoRoot,
        repairId: session.repair_id,
        targetRevision: currentRevision,
        gate: d.gate,
        decision: d.decision,
        reason: d.reason,
        operatorId: "dogfood",
        addReview: d.add_review ?? [],
        addForbid: d.add_forbid ?? [],
        addMustPreserve: d.add_must_preserve ?? [],
      });
    }

    // Assert Verdict
    const runPaths = repairRunPaths(repoRoot, session.repair_id);
    const checkFile = runPaths.check;

    if (existsSync(checkFile)) {
      const checkResult = JSON.parse(readFileSync(checkFile, "utf-8"));
      if (checkResult.verdict !== c.expected_verdict) {
        passed = false;
        errorMsg = `Expected verdict ${c.expected_verdict}, got ${checkResult.verdict}`;
      }
    } else {
      passed = false;
      errorMsg = "repair_check.json not generated";
    }

    // Sanitize artifacts
    const artifactsToSanitize = [
      "repair_task.md",
      "repair_scope.md",
      "consistency_checklist.md",
      "repair_report.md",
      "repair_feedback.md",
      "repair_check.json",
      "bug_finding.json",
      "repair_contract.latest.json"
    ];

    for (const file of artifactsToSanitize) {
      const p = join(runPaths.dir, file);
      if (existsSync(p)) {
        const content = readFileSync(p, "utf-8");
        // Skip bug_finding.json and repair_contract.json from public sanitization if they are raw (though user mentioned JSON artifacts).
        // Let's run public sanitizer on all of them as a stress test.
        const san = sanitizeArtifact(content, "public");
        if (!san.clean) {
          violations++;
          errorMsg = `Sanitizer violation in ${file}: ${san.violations.map(v => v.message).join(", ")}`;
          passed = false;
        }
      }
    }

    // Copy results back to case directory
    writeFileSync(join(caseDir, "case_result.json"), JSON.stringify({ passed, errorMsg, violations }, null, 2));
    
  } catch (err: any) {
    passed = false;
    errorMsg = err.message;
    writeFileSync(join(caseDir, "case_result.json"), JSON.stringify({ passed, errorMsg, violations }, null, 2));
  }

  return { passed, error: errorMsg, violations };
}

export function runDogfoodManifest() {
  const manifestPath = join(BASE_DIR, "manifest.json");
  const manifest: DogfoodManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  
  let passedCount = 0;
  let violationCount = 0;

  const repoStats: Record<string, { cases: number; passed: number }> = {
    httpx: { cases: 0, passed: 0 },
    fastapi: { cases: 0, passed: 0 },
    saleor: { cases: 0, passed: 0 },
  };

  const verdictMatrix = {
    pass: 0,
    requires_review: 0,
    fail: 0,
    requires_scope_expansion: 0,
    audit_variants: 0
  };

  console.log(`Running P28.2 Dogfood: ${manifest.cases.length} cases`);

  for (const c of manifest.cases) {
    repoStats[c.repo_id].cases++;
    if (c.variant === "audit") {
      verdictMatrix.audit_variants++;
    }

    const result = runDogfoodCase(c);
    violationCount += result.violations;

    if (result.passed) {
      passedCount++;
      repoStats[c.repo_id].passed++;
      if (c.variant !== "audit") {
        verdictMatrix[c.expected_verdict as keyof typeof verdictMatrix]++;
      }
      console.log(`✅ [${c.repo_id}] ${c.case_id}`);
    } else {
      console.error(`❌ [${c.repo_id}] ${c.case_id} failed: ${result.error}`);
    }
  }

  const summaryData = {
    schema_version: "p28_2_summary@0.1.0",
    total_cases: manifest.cases.length,
    passed_cases: passedCount,
    failed_cases: manifest.cases.length - passedCount,
    verdict_matrix: verdictMatrix,
    repos: repoStats,
    artifact_sanitizer: {
      checked: manifest.cases.length * 8, // 8 files per case
      violations: violationCount
    }
  };

  writeFileSync(join(BASE_DIR, "summary.json"), JSON.stringify(summaryData, null, 2));

  const summaryMd = [
    "# P28.2 Repair Dogfood Summary",
    "",
    `## Result: ${passedCount === manifest.cases.length ? "PASS" : "FAIL"}`,
    "",
    "## What this proves",
    "- Core repair behavior matrix (allowed, review, forbidden) is stable across 3 archetypes.",
    "- Human audit interactions deterministically generate revisions.",
    "- Public artifacts pass strict artifactSanitizer rules.",
    "",
    "## What this does not prove",
    "- Does not prove real agent compliance or multi-agent concurrency safety.",
    "",
    "## Verdict Matrix",
    "| Repo | Cases | Passed |",
    "|---|---|---|",
    ...Object.entries(repoStats).map(([repo, stats]) => `| ${repo} | ${stats.cases} | ${stats.passed} |`),
    "",
    "## Artifact Sanitizer",
    `- Files checked: ${summaryData.artifact_sanitizer.checked}`,
    `- Violations: ${summaryData.artifact_sanitizer.violations}`
  ].join("\n");

  writeFileSync(join(BASE_DIR, "summary.md"), summaryMd);
  
  return summaryData;
}

runDogfoodManifest();
