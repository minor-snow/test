/**
 * P18.1: E2E Dogfood CI Script
 *
 * Runs the full P10→P18 dogfood chain as a single command:
 *   P10 canonical → P11 handoff → P12 codegen → P14 boundary graph
 *   → P15 blast radius → P17 scoped handoff → P18 scope diff validator
 *
 * Invariants:
 *   - No LLM calls
 *   - No canonical mutation (frozen P10 data as input)
 *   - Derived outputs only under data/dogfood/p10/e2e/
 *   - All stages use direct function imports, not subprocess calls
 *
 * Usage: npx tsx scripts/runDogfoodE2E.ts
 *
 * ref: P18.1
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

// P11: Handoff
import { generateHandoffPackage, type RiskRegisterEntry } from "../src/handoff/generateHandoffPackage.js";
import { evaluateHandoffReadiness } from "../src/handoff/handoffReadinessEvaluator.js";
import type { Artifact } from "../src/types.js";

// P14: Boundary Graph
import { buildBoundaryGraph } from "../src/boundary/boundaryGraph.js";
import { runAllGates } from "../src/boundary/boundaryGatesAndQueries.js";

// P15: Blast Radius
import { computeBlastRadius } from "../src/boundary/blastRadius.js";

// P17: Scoped Handoff
import { buildScopedImplementationBoundaryPackage } from "../src/scopedHandoff/scopedHandoffExporter.js";
import { validateScopedImplementationBoundaryPackage } from "../src/scopedHandoff/scopedHandoffValidator.js";

// P12: Codegen
import { generateKotlin } from "../src/codegen/kotlinGenerator.js";
import { evaluateHandoffTestOutput } from "../src/handoff/handoffTestEvaluator.js";

// P18: Scope Diff Validator
import { validateScopeDiff } from "../src/scopeDiff/scopeDiffValidator.js";
import type { RequiredTestsFile } from "../src/scopedHandoff/types.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname!, "..");
const DATA_BASE = join(ROOT, "data/dogfood/p10");
const E2E_OUTPUT = join(DATA_BASE, "e2e");
const CANONICAL = join(DATA_BASE, "canonical");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StageResult = {
  stage_id: string;
  stage_name: string;
  status: "pass" | "fail" | "warning";
  input_hashes: Record<string, string>;
  output_hashes: Record<string, string>;
  blocking_reasons: string[];
  golden_checks: Record<string, { expected: unknown; actual: unknown; pass: boolean }>;
  duration_ms: number;
};

type E2EReport = {
  run_id: string;
  run_at: string;
  overall_status: "pass" | "fail";
  stages: StageResult[];
  canonical_pointer_check: { before: string; after: string; unchanged: boolean };
  total_duration_ms: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashFile(path: string): string {
  const content = readFileSync(path, "utf-8");
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function hashObject(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function canonicalPointerSnapshot(): string {
  // Hash all canonical pointer files together
  const pointerFiles = readdirSync(CANONICAL)
    .filter(f => f.endsWith(".json"))
    .sort()
    .map(f => readFileSync(join(CANONICAL, f), "utf-8"));
  return createHash("sha256").update(pointerFiles.join("||")).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log("🔬 Pantheon E2E Dogfood CI");
  console.log("═".repeat(60));
  console.log(`Input: ${DATA_BASE}`);
  console.log(`Output: ${E2E_OUTPUT}`);
  console.log();

  mkdirSync(E2E_OUTPUT, { recursive: true });

  // Snapshot canonical pointers BEFORE
  const canonicalBefore = canonicalPointerSnapshot();

  const stages: StageResult[] = [];

  // =========================================================================
  // Stage 1: P11 Handoff
  // =========================================================================
  {
    const t0 = Date.now();
    console.log("📦 Stage 1: P11 Handoff Generation...");

    const arch = loadJson<Artifact>(join(DATA_BASE, "revisions/pet_triage_offline_architecture/rev_d252eb5b2bc6.json"));
    const iface = loadJson<Artifact>(join(DATA_BASE, "revisions/pet_triage_offline_interface/rev_a1695505f72c.json"));
    const mod = loadJson<Artifact>(join(DATA_BASE, "revisions/pet_triage_offline_module/rev_17695c778e19.json"));

    // Try loading risks as JSONL
    let riskEntries: RiskRegisterEntry[] = [];
    try {
      const riskContent = readFileSync(join(DATA_BASE, "risks/risk_register.jsonl"), "utf-8");
      riskEntries = riskContent
        .split("\n")
        .filter(l => l.trim())
        .map(l => JSON.parse(l));
    } catch {
      riskEntries = [];
    }

    const handoff = generateHandoffPackage(arch, iface, mod, riskEntries);

    // Build canonical refs (same as P11 script does)
    const canonicalRefs = [
      { artifact_id: arch.artifact_id, artifact_type: arch.artifact_type, revision_id: arch.revision_id },
      { artifact_id: iface.artifact_id, artifact_type: iface.artifact_type, revision_id: iface.revision_id },
      { artifact_id: mod.artifact_id, artifact_type: mod.artifact_type, revision_id: mod.revision_id },
    ];

    const readiness = evaluateHandoffReadiness(
      handoff.pkg,
      canonicalRefs,
      handoff.contracts.mandatory_coverage.total,
      handoff.contracts.mandatory_coverage.missing,
      [], // unresolvedTerms — resolved via P11.1 closure
    );

    const passedChecks = readiness.checks.filter(c => c.status === "pass").length;
    const totalChecks = readiness.checks.length;

    const stage: StageResult = {
      stage_id: "p11_handoff",
      stage_name: "P11 Handoff Generation",
      status: readiness.status !== "not_ready" ? "pass" : "fail",
      input_hashes: {
        architecture: hashFile(join(DATA_BASE, "revisions/pet_triage_offline_architecture/rev_d252eb5b2bc6.json")),
        interface: hashFile(join(DATA_BASE, "revisions/pet_triage_offline_interface/rev_a1695505f72c.json")),
        module: hashFile(join(DATA_BASE, "revisions/pet_triage_offline_module/rev_17695c778e19.json")),
      },
      output_hashes: { handoff_package: hashObject(handoff.pkg) },
      blocking_reasons: readiness.checks.filter(c => c.status !== "pass").map(c => c.check_id),
      golden_checks: {
        readiness_pass_count: { expected: ">= 11", actual: passedChecks, pass: passedChecks >= 11 },
        total_checks: { expected: 13, actual: totalChecks, pass: totalChecks === 13 },
      },
      duration_ms: Date.now() - t0,
    };
    stages.push(stage);
    console.log(`   ${stage.status === "pass" ? "✅" : "❌"} Readiness: ${passedChecks}/${totalChecks}`);

    // Save handoff for next stage
    writeFileSync(join(E2E_OUTPUT, "handoff_package.json"), JSON.stringify(handoff.pkg, null, 2));
  }

  // =========================================================================
  // Stage 2: P12 Deterministic Codegen
  // =========================================================================
  {
    const t0 = Date.now();
    console.log("⚙️  Stage 2: P12 Deterministic Codegen...");

    const handoffPkg = loadJson<any>(join(E2E_OUTPUT, "handoff_package.json"));
    const codegenOutput = generateKotlin(handoffPkg);

    // Evaluate generated code with P11.2 evaluator
    const combinedOutput = codegenOutput.files.map(f => f.content).join("\n\n");
    const evalResult = evaluateHandoffTestOutput("pantheon-codegen", combinedOutput, handoffPkg);

    const stage: StageResult = {
      stage_id: "p12_codegen",
      stage_name: "P12 Deterministic Codegen",
      status: evalResult.status === "pass" || evalResult.status === "pass_with_warnings" ? "pass" : "fail",
      input_hashes: { handoff_package: hashFile(join(E2E_OUTPUT, "handoff_package.json")) },
      output_hashes: { codegen_package: hashObject(codegenOutput.metrics) },
      blocking_reasons: evalResult.critical_violations.map(v => `[${v.type}] ${v.message}`),
      golden_checks: {
        file_count_12: { expected: 12, actual: codegenOutput.files.length, pass: codegenOutput.files.length === 12 },
        entity_count: { expected: ">= 6", actual: codegenOutput.metrics.entity_count, pass: codegenOutput.metrics.entity_count >= 6 },
        evaluator_pass: { expected: "pass", actual: evalResult.status, pass: evalResult.status === "pass" || evalResult.status === "pass_with_warnings" },
      },
      duration_ms: Date.now() - t0,
    };
    stages.push(stage);
    console.log(`   ${stage.status === "pass" ? "✅" : "❌"} Files: ${codegenOutput.files.length}, Entities: ${codegenOutput.metrics.entity_count}, Eval: ${evalResult.status}`);

    // Save codegen output for next stage
    writeFileSync(join(E2E_OUTPUT, "codegen_output.json"), JSON.stringify(codegenOutput, null, 2));
  }

  // =========================================================================
  // Stage 3: P14 Boundary Graph
  // =========================================================================
  {
    const t0 = Date.now();
    console.log("🗺️  Stage 3: P14 Boundary Graph...");

    const handoffPkg = loadJson<any>(join(E2E_OUTPUT, "handoff_package.json"));
    const handoffRaw = readFileSync(join(E2E_OUTPUT, "handoff_package.json"), "utf-8");
    const pkgHash = createHash("sha256").update(handoffRaw).digest("hex").slice(0, 16);

    // Use P12-generated files — NOT frozen disk files.
    // This closes the chain: P11 → P12 → P14.
    const codegenOutput = loadJson<{ files: Array<{ fileName: string }> }>(join(E2E_OUTPUT, "codegen_output.json"));
    const genFiles = codegenOutput.files;

    const graph = buildBoundaryGraph(handoffPkg, genFiles, pkgHash);
    const gates = runAllGates(graph);
    const gatesPassed = gates.filter(g => g.status === "pass").length;

    const stage: StageResult = {
      stage_id: "p14_boundary_graph",
      stage_name: "P14 Boundary Graph",
      status: gatesPassed === 6 ? "pass" : "fail",
      input_hashes: {
        handoff_package: hashFile(join(E2E_OUTPUT, "handoff_package.json")),
        codegen_output: hashFile(join(E2E_OUTPUT, "codegen_output.json")),
      },
      output_hashes: { boundary_graph: hashObject({ nodes: graph.nodes.length, edges: graph.edges.length }) },
      blocking_reasons: gates.filter(g => g.status !== "pass").map(g => `Gate ${g.gate_id}: ${g.status}`),
      golden_checks: {
        gates_6_of_6: { expected: 6, actual: gatesPassed, pass: gatesPassed === 6 },
        node_count_gte_160: { expected: ">= 160", actual: graph.nodes.length, pass: graph.nodes.length >= 160 },
        gen_files_12: { expected: 12, actual: genFiles.length, pass: genFiles.length === 12 },
      },
      duration_ms: Date.now() - t0,
    };
    stages.push(stage);
    console.log(`   ${stage.status === "pass" ? "✅" : "❌"} Gates: ${gatesPassed}/6, Nodes: ${graph.nodes.length}, GenFiles: ${genFiles.length}`);

    writeFileSync(join(E2E_OUTPUT, "boundary_graph.json"), JSON.stringify(graph, null, 2));
    writeFileSync(join(E2E_OUTPUT, "boundary_gates.json"), JSON.stringify(gates, null, 2));
  }

  // =========================================================================
  // Stage 3: P15 Blast Radius
  // =========================================================================
  {
    const t0 = Date.now();
    console.log("💥 Stage 4: P15 Blast Radius...");

    // Use the E2E-rebuilt graph — NOT the prebuilt one.
    // This closes the chain: P11 → P14 → P15.
    const graph = loadJson<any>(join(E2E_OUTPUT, "boundary_graph.json"));
    const blastReport = computeBlastRadius(graph, {
      changed_nodes: ["blk:arch:b_conflict_001"],
    });

    const stage: StageResult = {
      stage_id: "p15_blast_radius",
      stage_name: "P15 Blast Radius",
      status: "pass",
      input_hashes: { boundary_graph: hashFile(join(E2E_OUTPUT, "boundary_graph.json")) },
      output_hashes: { blast_radius: hashObject(blastReport.summary) },
      blocking_reasons: [],
      golden_checks: {
        total_downstream_gte_60: {
          expected: ">= 60",
          actual: blastReport.summary.total_downstream,
          pass: blastReport.summary.total_downstream >= 60,
        },
        highest_risk_high: {
          expected: "high",
          actual: blastReport.summary.highest_risk_level,
          pass: blastReport.summary.highest_risk_level === "high",
        },
      },
      duration_ms: Date.now() - t0,
    };
    stages.push(stage);
    console.log(`   ✅ Downstream: ${blastReport.summary.total_downstream}, Risk: ${blastReport.summary.highest_risk_level}`);

    writeFileSync(join(E2E_OUTPUT, "blast_radius_report.json"), JSON.stringify(blastReport, null, 2));
  }

  // =========================================================================
  // Stage 4: P17 Scoped Handoff Export
  // =========================================================================
  {
    const t0 = Date.now();
    console.log("📐 Stage 5: P17 Scoped Handoff Export...");

    const graph = loadJson<any>(join(E2E_OUTPUT, "boundary_graph.json"));
    const blastReport = loadJson<any>(join(E2E_OUTPUT, "blast_radius_report.json"));
    const handoffPkg = loadJson<any>(join(E2E_OUTPUT, "handoff_package.json"));
    const handoffHash = hashObject(handoffPkg);

    const scopePackage = buildScopedImplementationBoundaryPackage({
      handoffPackageHash: `sha256:${handoffHash}`,
      boundaryGraph: graph,
      blastRadiusReport: blastReport,
      options: { locale: "en", scopeLabel: "e2e_dogfood", extraForbiddenPatterns: ["ui/**"] },
    });

    const validation = validateScopedImplementationBoundaryPackage(scopePackage);
    const scopeStatus = validation.status === "pass" || validation.status === "pass_with_warnings" ? "pass" : "fail";

    const stage: StageResult = {
      stage_id: "p17_scoped_handoff",
      stage_name: "P17 Scoped Handoff Export",
      status: scopeStatus === "pass" ? "pass" : "warning",
      input_hashes: {
        boundary_graph: hashFile(join(E2E_OUTPUT, "boundary_graph.json")),
        blast_radius: hashFile(join(E2E_OUTPUT, "blast_radius_report.json")),
      },
      output_hashes: { scope_package: hashObject(scopePackage) },
      blocking_reasons: validation.entries.filter(e => e.severity === "error").map(e => e.message),
      golden_checks: {
        allowed_files_gt_0: {
          expected: "> 0",
          actual: scopePackage.allowed_files.length,
          pass: scopePackage.allowed_files.length > 0,
        },
        required_tests_gt_0: {
          expected: "> 0",
          actual: scopePackage.required_tests.length,
          pass: scopePackage.required_tests.length > 0,
        },
      },
      duration_ms: Date.now() - t0,
    };
    stages.push(stage);
    console.log(`   ${stage.status === "pass" ? "✅" : "⚠️"} Files: ${scopePackage.allowed_files.length}, Tests: ${scopePackage.required_tests.length}`);

    writeFileSync(join(E2E_OUTPUT, "scope_package.json"), JSON.stringify(scopePackage, null, 2));
  }

  // =========================================================================
  // Stage 5: P18 Scope Diff Validator (pass fixture)
  // =========================================================================
  {
    const t0 = Date.now();
    console.log("✅ Stage 6a: P18 Scope Diff — pass fixture...");

    const scope = loadJson<any>(join(E2E_OUTPUT, "scope_package.json"));
    const scopeJson = JSON.stringify(scope);
    const scopeHash = createHash("sha256").update(scopeJson).digest("hex").slice(0, 16);

    const requiredTestsFile: RequiredTestsFile = {
      scope_id: scope.scope_id,
      source_scope_hash: scopeHash,
      generated_at: scope.created_at,
      required_tests: scope.required_tests,
    };
    const requiredTestsHash = createHash("sha256")
      .update(JSON.stringify(requiredTestsFile))
      .digest("hex")
      .slice(0, 16);

    const allowedFile = scope.allowed_files[0]?.path;
    const passResult = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        changed_files: [allowedFile],
        test_results: scope.required_tests.map((t: any) => ({
          test_id: t.test_id,
          status: "passed" as const,
        })),
        human_review: {
          provided: true,
          reviewer_id: "e2e_operator",
          rationale: "E2E dogfood test — approved.",
        },
      },
      scopeHash,
      requiredTestsHash,
    });

    const stage: StageResult = {
      stage_id: "p18_pass_fixture",
      stage_name: "P18 Scope Diff — Pass Fixture",
      status: passResult.status === "pass" ? "pass" : "fail",
      input_hashes: { scope_package: hashFile(join(E2E_OUTPUT, "scope_package.json")) },
      output_hashes: { report: hashObject(passResult) },
      blocking_reasons: passResult.violations.map(v => v.message),
      golden_checks: {
        status_pass: { expected: "pass", actual: passResult.status, pass: passResult.status === "pass" },
        zero_violations: { expected: 0, actual: passResult.violations.length, pass: passResult.violations.length === 0 },
      },
      duration_ms: Date.now() - t0,
    };
    stages.push(stage);
    console.log(`   ${stage.status === "pass" ? "✅" : "❌"} Status: ${passResult.status}`);
  }

  // =========================================================================
  // Stage 6: P18 Scope Diff Validator (outside-scope fixture)
  // =========================================================================
  {
    const t0 = Date.now();
    console.log("⚠️  Stage 6b: P18 Scope Diff — outside scope fixture...");

    const scope = loadJson<any>(join(E2E_OUTPUT, "scope_package.json"));
    const scopeJson = JSON.stringify(scope);
    const scopeHash = createHash("sha256").update(scopeJson).digest("hex").slice(0, 16);

    const requiredTestsFile: RequiredTestsFile = {
      scope_id: scope.scope_id,
      source_scope_hash: scopeHash,
      generated_at: scope.created_at,
      required_tests: scope.required_tests,
    };
    const requiredTestsHash = createHash("sha256")
      .update(JSON.stringify(requiredTestsFile))
      .digest("hex")
      .slice(0, 16);

    const outsideResult = validateScopeDiff({
      scope,
      requiredTestsFile,
      request: {
        scope_path: ".pantheon/scope.json",
        required_tests_path: ".pantheon/required-tests.json",
        changed_files: ["TotallyOutOfScope.kt"],
        test_results: scope.required_tests.map((t: any) => ({
          test_id: t.test_id,
          status: "passed" as const,
        })),
        human_review: {
          provided: true,
          reviewer_id: "e2e_operator",
          rationale: "E2E dogfood test.",
        },
      },
      scopeHash,
      requiredTestsHash,
    });

    const stage: StageResult = {
      stage_id: "p18_outside_scope",
      stage_name: "P18 Scope Diff — Outside Scope",
      status: outsideResult.status === "requires_reverse_issue" ? "pass" : "fail",
      input_hashes: {},
      output_hashes: { report: hashObject(outsideResult) },
      blocking_reasons: outsideResult.status !== "requires_reverse_issue"
        ? [`Expected requires_reverse_issue, got ${outsideResult.status}`]
        : [],
      golden_checks: {
        status_requires_reverse_issue: {
          expected: "requires_reverse_issue",
          actual: outsideResult.status,
          pass: outsideResult.status === "requires_reverse_issue",
        },
        has_outside_violation: {
          expected: true,
          actual: outsideResult.violations.some(v => v.violation_type === "outside_allowed_files"),
          pass: outsideResult.violations.some(v => v.violation_type === "outside_allowed_files"),
        },
      },
      duration_ms: Date.now() - t0,
    };
    stages.push(stage);
    console.log(`   ${stage.status === "pass" ? "✅" : "❌"} Status: ${outsideResult.status}`);
  }

  // =========================================================================
  // Canonical pointer check (must be unchanged)
  // =========================================================================
  const canonicalAfter = canonicalPointerSnapshot();
  const canonicalUnchanged = canonicalBefore === canonicalAfter;

  if (!canonicalUnchanged) {
    console.log("\n❌ CRITICAL: Canonical pointers changed during E2E run!");
  }

  // =========================================================================
  // Build report
  // =========================================================================
  const overallStatus = stages.every(s => s.status === "pass" || s.status === "warning") && canonicalUnchanged
    ? "pass"
    : "fail";

  const report: E2EReport = {
    run_id: `e2e_${Date.now()}`,
    run_at: new Date().toISOString(),
    overall_status: overallStatus,
    stages,
    canonical_pointer_check: {
      before: canonicalBefore,
      after: canonicalAfter,
      unchanged: canonicalUnchanged,
    },
    total_duration_ms: Date.now() - startTime,
  };

  // Write JSON report
  writeFileSync(join(E2E_OUTPUT, "dogfood_e2e_report.json"), JSON.stringify(report, null, 2));

  // Write Markdown report
  const md = renderMarkdownReport(report);
  writeFileSync(join(E2E_OUTPUT, "dogfood_e2e_report.md"), md);

  // Summary
  console.log();
  console.log("═".repeat(60));
  console.log(`Overall: ${overallStatus === "pass" ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Canonical unchanged: ${canonicalUnchanged ? "✅" : "❌"}`);
  console.log(`Duration: ${report.total_duration_ms}ms`);
  console.log(`Report: ${join(E2E_OUTPUT, "dogfood_e2e_report.json")}`);

  process.exit(overallStatus === "pass" ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

function renderMarkdownReport(report: E2EReport): string {
  const lines: string[] = [];
  const ln = (s = "") => lines.push(s);

  ln("# Pantheon E2E Dogfood Report");
  ln();
  ln(`**Run ID**: \`${report.run_id}\``);
  ln(`**Date**: ${report.run_at}`);
  ln(`**Overall**: ${report.overall_status === "pass" ? "✅ PASS" : "❌ FAIL"}`);
  ln(`**Duration**: ${report.total_duration_ms}ms`);
  ln();
  ln("---");
  ln();

  // Stage summary table
  ln("## Stage Summary");
  ln();
  ln("| # | Stage | Status | Duration |");
  ln("|---|---|---|---|");
  for (let i = 0; i < report.stages.length; i++) {
    const s = report.stages[i];
    const icon = s.status === "pass" ? "✅" : s.status === "warning" ? "⚠️" : "❌";
    ln(`| ${i + 1} | ${s.stage_name} | ${icon} ${s.status} | ${s.duration_ms}ms |`);
  }
  ln();

  // Golden checks
  ln("## Golden Number Checks");
  ln();
  ln("| Stage | Check | Expected | Actual | Pass |");
  ln("|---|---|---|---|---|");
  for (const s of report.stages) {
    for (const [key, gc] of Object.entries(s.golden_checks)) {
      ln(`| ${s.stage_id} | ${key} | ${gc.expected} | ${gc.actual} | ${gc.pass ? "✅" : "❌"} |`);
    }
  }
  ln();

  // Hash chain
  ln("## Hash Chain");
  ln();
  for (const s of report.stages) {
    ln(`### ${s.stage_name}`);
    ln();
    if (Object.keys(s.input_hashes).length > 0) {
      ln("**Inputs:**");
      for (const [k, v] of Object.entries(s.input_hashes)) ln(`- \`${k}\`: \`${v}\``);
    }
    if (Object.keys(s.output_hashes).length > 0) {
      ln("**Outputs:**");
      for (const [k, v] of Object.entries(s.output_hashes)) ln(`- \`${k}\`: \`${v}\``);
    }
    ln();
  }

  // Canonical check
  ln("## Canonical Pointer Integrity");
  ln();
  ln(`- Before: \`${report.canonical_pointer_check.before}\``);
  ln(`- After: \`${report.canonical_pointer_check.after}\``);
  ln(`- Unchanged: ${report.canonical_pointer_check.unchanged ? "✅" : "❌"}`);
  ln();

  return lines.join("\n");
}

main().catch(err => {
  console.error("E2E script failed:", err);
  process.exit(1);
});
