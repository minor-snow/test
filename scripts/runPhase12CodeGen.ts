/**
 * P12 — Deterministic Kotlin Code Generation from Handoff Package
 *
 * Reads handoff_package.json → generates Kotlin → evaluates → reports.
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { generateKotlin } from "../src/codegen/kotlinGenerator.js";
import { evaluateHandoffTestOutput } from "../src/handoff/handoffTestEvaluator.js";
import type { ImplementationHandoffPackage } from "../src/handoff/types.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const HANDOFF_DIR = join(STORE_ROOT, "handoff");
const IMPL_DIR = join(STORE_ROOT, "implementation", "generated");
const REPORT_DIR = join(STORE_ROOT, "implementation", "report");
const EVIDENCE_DIR = join(STORE_ROOT, "evidence");
const CROSS_MODEL_DIR = join(HANDOFF_DIR, "cross_model_output");

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P12: Deterministic Kotlin Code Generation           ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Step 1: Load handoff package (ONLY input)
  console.log("  1. Loading handoff_package.json...");
  const pkg: ImplementationHandoffPackage = JSON.parse(
    await fs.readFile(join(HANDOFF_DIR, "handoff_package.json"), "utf8"),
  );
  console.log(`     Contracts: ${pkg.contract_definitions.length}`);
  console.log(`     Data models: ${pkg.data_models.length}`);
  console.log(`     State machines: ${pkg.state_machines.length}`);
  console.log(`     Conflict policies: ${pkg.conflict_policy_matrix.length}\n`);

  // Step 2: Generate Kotlin
  console.log("  2. Generating Kotlin code...");
  const output = generateKotlin(pkg);
  console.log(`     Files: ${output.files.length}`);
  console.log(`     Package hash: ${output.package_hash}`);
  console.log(`     Entities: ${output.metrics.entity_count}`);
  console.log(`     DTOs: ${output.metrics.dto_count}`);
  console.log(`     Enums: ${output.metrics.enum_count}`);
  console.log(`     State machines: ${output.metrics.state_machine_count}`);
  console.log(`     Policy groups: ${output.metrics.conflict_policy_groups}`);
  console.log(`     Total fields: ${output.metrics.total_fields}`);
  console.log(`     Allowed transitions: ${output.metrics.allowed_transitions}`);
  console.log(`     Forbidden transitions: ${output.metrics.forbidden_transitions}`);
  console.log(`     --- P13 Contract Boundary ---`);
  console.log(`     Interfaces: ${output.metrics.interface_count}`);
  console.log(`     Guards: ${output.metrics.guard_count}`);
  console.log(`     Contract tests: ${output.metrics.contract_test_count}`);
  console.log(`     TODO stubs: ${output.metrics.todo_stub_count}\n`);

  // Step 3: Write files
  console.log("  3. Writing generated files...");
  await fs.mkdir(IMPL_DIR, { recursive: true });
  await fs.mkdir(join(IMPL_DIR, "contracts"), { recursive: true });
  for (const f of output.files) {
    await fs.writeFile(join(IMPL_DIR, f.fileName), f.content, "utf8");
    console.log(`     ✅ ${f.fileName} (${f.content.length} chars)`);
  }
  console.log();

  // Step 4: Evaluate with P11.2 evaluator
  console.log("  4. Evaluating generated code with P11.2 evaluator...");
  const combinedOutput = output.files.map(f => f.content).join("\n\n");
  const evalResult = evaluateHandoffTestOutput("pantheon-codegen", combinedOutput, pkg);

  for (const [key, value] of Object.entries(evalResult.metrics)) {
    const icon = value === 0 ? "✅" : "❌";
    console.log(`     ${icon} ${key}: ${value}`);
  }

  if (evalResult.critical_violations.length > 0) {
    console.log(`\n  ❌ Critical violations (${evalResult.critical_violations.length}):`);
    for (const v of evalResult.critical_violations) {
      console.log(`     [${v.type}] ${v.message}`);
    }
  }
  if (evalResult.warnings.length > 0) {
    console.log(`\n  ⚠️  Warnings (${evalResult.warnings.length}):`);
    for (const w of evalResult.warnings) {
      console.log(`     [${w.type}] ${w.message}`);
    }
  }
  console.log();

  // Step 5: Structural diff against GPT-4o-mini output
  console.log("  5. Structural diff vs GPT-4o-mini P11.2 output...");
  try {
    const gptEntities = await fs.readFile(join(CROSS_MODEL_DIR, "gpt4omini_output.kt"), "utf8");
    const gptTests = await fs.readFile(join(CROSS_MODEL_DIR, "gpt4omini_conflict_tests.kt"), "utf8");

    // Compare enum values
    const genEnumFile = output.files.find(f => f.fileName === "Enums.kt")!.content;
    const genStates = genEnumFile.match(/\b(draft|completed_offline|queued_for_sync|syncing|merged|conflicted|requires_review|failed_retryable|failed_terminal)\b/g) || [];
    const gptStates = gptEntities.match(/\b(draft|completed_offline|queued_for_sync|syncing|merged|conflicted|requires_review|failed_retryable|failed_terminal)\b/g) || [];
    const genSet = new Set(genStates);
    const gptSet = new Set(gptStates);
    const stateMatch = genSet.size === gptSet.size && [...genSet].every(s => gptSet.has(s));
    console.log(`     PendingReportState values match: ${stateMatch ? "✅" : "❌"}`);

    // Compare entity field count
    const genEntityFile = output.files.find(f => f.fileName === "Entities.kt")!.content;
    const genFields = (genEntityFile.match(/@ColumnInfo/g) || []).length;
    const gptFields = (gptEntities.match(/@ColumnInfo/g) || []).length;
    console.log(`     Entity @ColumnInfo fields: gen=${genFields} vs gpt=${gptFields} ${genFields === gptFields ? "✅" : "⚠️"}`);

    // Compare test count
    const genTestFile = output.files.find(f => f.fileName === "ConflictPolicyTests.kt")!.content;
    const genTestCount = (genTestFile.match(/@Test/g) || []).length;
    const gptTestCount = (gptTests.match(/@Test/g) || []).length;
    console.log(`     Test functions: gen=${genTestCount} vs gpt=${gptTestCount} ${genTestCount === gptTestCount ? "✅" : "⚠️"}`);
  } catch {
    console.log("     ⚠️  GPT-4o-mini output not found, skipping diff.");
  }
  console.log();

  // Step 6: Generate reports
  console.log("  6. Generating reports...");
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });

  const report = {
    phase: "P12",
    generator: "pantheon-codegen",
    package_id: pkg.package_id,
    package_hash: output.package_hash,
    generated_at: new Date().toISOString(),
    files: output.files.map(f => ({ name: f.fileName, chars: f.content.length })),
    metrics: output.metrics,
    evaluation: {
      status: evalResult.status,
      critical_violations: evalResult.critical_violations.length,
      warnings: evalResult.warnings.length,
      details: evalResult.metrics,
    },
  };

  await fs.writeFile(join(REPORT_DIR, "PHASE-12-codegen-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("     ✅ PHASE-12-codegen-report.json");

  // Markdown report
  const md = [
    "# Phase 12: Deterministic Kotlin Code Generation Report",
    "",
    `**Generator**: pantheon-codegen (deterministic)`,
    `**Package ID**: ${pkg.package_id}`,
    `**Package Hash**: ${output.package_hash}`,
    `**Date**: ${new Date().toISOString()}`,
    `**Evaluator Status**: ${evalResult.status.toUpperCase()}`,
    "",
    "---",
    "",
    "## Generated Files",
    "",
    "| File | Size | Content |",
    "|---|---|---|",
    ...output.files.map(f => `| ${f.fileName} | ${f.content.length} chars | ${describeFile(f.fileName)} |`),
    "",
    "## Metrics",
    "",
    `| Metric | Value |`,
    `|---|---|`,
    ...Object.entries(output.metrics).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Evaluator Results",
    "",
    `| Check | Result |`,
    `|---|---|`,
    ...Object.entries(evalResult.metrics).map(([k, v]) => `| ${k} | ${v === 0 ? "✅ 0" : "❌ " + v} |`),
    "",
    "## Conclusion",
    "",
    evalResult.status === "pass"
      ? "✅ All generated code passes structural validation. Zero invented fields, states, or policy violations."
      : evalResult.status === "pass_with_warnings"
        ? "⚠️ Generated code passes with warnings. Review warnings for non-blocking issues."
        : "❌ Generated code has critical violations. Review and fix generator.",
    "",
  ].join("\n");
  await fs.writeFile(join(REPORT_DIR, "PHASE-12-codegen-report.md"), md, "utf8");
  console.log("     ✅ PHASE-12-codegen-report.md");

  // Evidence
  await fs.writeFile(join(EVIDENCE_DIR, "p12_codegen.json"), JSON.stringify({
    phase: "P12",
    result: evalResult.status,
    metrics: output.metrics,
    evaluation: evalResult.metrics,
    critical: evalResult.critical_violations.length,
    warnings: evalResult.warnings.length,
    generated_at: report.generated_at,
  }, null, 2), "utf8");
  console.log("     ✅ p12_codegen.json (evidence)");

  // Final
  const icon = evalResult.status === "pass" ? "✅ PASS" : evalResult.status === "pass_with_warnings" ? "⚠️ PASS WITH WARNINGS" : "❌ FAIL";

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P12 DETERMINISTIC CODEGEN: ${icon}`);
  console.log(`  Files: ${output.files.length} | Fields: ${output.metrics.total_fields}`);
  console.log(`  Entities: ${output.metrics.entity_count} | DTOs: ${output.metrics.dto_count}`);
  console.log(`  Evaluator: ${evalResult.status} (${evalResult.critical_violations.length} critical, ${evalResult.warnings.length} warnings)`);
  console.log(`  ══════════════════════════════════════════════════\n`);
}

function describeFile(name: string): string {
  const desc: Record<string, string> = {
    "Enums.kt": "State machine enums + ConflictType + ConflictPolicy",
    "Entities.kt": "6 Room @Entity data classes",
    "Dtos.kt": "8 network DTO data classes",
    "StateMachines.kt": "3 state machine validators (allowed/forbidden/audit)",
    "ConflictPolicy.kt": "Conflict policy registry (13 field groups)",
    "ConflictPolicyTests.kt": "6 JUnit4 conflict policy tests",
    "contracts/Interfaces.kt": "7 boundary interfaces",
    "contracts/AbstractBases.kt": "2 abstract base classes with guardrails",
    "contracts/Guards.kt": "PantheonGuards object (5 runtime guards)",
    "contracts/RetryPolicy.kt": "Retry/backoff policy table",
    "contracts/ContractTests.kt": "5 abstract contract test classes",
    "contracts/TodoStubs.kt": "6 TODO implementation stubs",
  };
  return desc[name] || name;
}

main().catch(err => { console.error("P12 failed:", err); process.exit(1); });
