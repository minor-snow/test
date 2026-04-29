/**
 * Phase 11.2 — Cross-Model Handoff Test
 *
 * Usage: npx tsx scripts/runPhase11CrossModelTest.ts [generate|evaluate <output-file>]
 *
 * Modes:
 *   generate  — Creates cross_model_test_prompt.md for external model
 *   evaluate  — Evaluates model output against handoff constraints
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { evaluateHandoffTestOutput } from "../src/handoff/handoffTestEvaluator.js";
import type { ImplementationHandoffPackage } from "../src/handoff/types.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const HANDOFF_DIR = join(STORE_ROOT, "handoff");
const OUTPUT_DIR = join(HANDOFF_DIR, "cross_model_output");

// ---------------------------------------------------------------------------
// Prompt generation
// ---------------------------------------------------------------------------

function buildTestPrompt(handoffMd: string, _pkg: ImplementationHandoffPackage): string {
  return `# Implementation Task: Pet Triage Offline-First Data Model Slice

You are a Kotlin/Android engineer. You have been given a **complete implementation handoff package** for an offline-first pet triage system. Your task is to implement a **data-model slice** based ONLY on the information below.

## CRITICAL RULES

1. **Do NOT invent fields** not present in the handoff package.
2. **Do NOT invent states** outside the state machines defined below.
3. **Do NOT use LWW (Last-Writer-Wins)** for clinical fields unless the conflict policy matrix explicitly permits it.
4. **Do NOT omit VectorClock metadata** for clinical conflict-sensitive fields.
5. **Do NOT ignore audit_required flags** from the conflict policy matrix.
6. **Do NOT assume a single clinic** — the system supports multiple independent clinic backends.
7. **Do NOT skip ConflictPayload required fields**.
8. **Do NOT add ML/AI-based triage** — the decision tree is deterministic.

## REQUIRED OUTPUTS

Implement the following in Kotlin:

### 1. Room Entities
- \`PendingReportEntity\` (with @Entity, @PrimaryKey, @ColumnInfo)
- \`SyncOperationEntity\`
- \`ConflictRecordEntity\`
- \`VectorClockEntry\`
- \`AuditEventEntity\`
- \`RetryLedgerEntry\`

### 2. DTOs
- \`ConflictPayload\`
- \`VectorClock\` (as data class)
- \`OfflineReportEnvelope\`
- \`SyncUploadResult\`

### 3. Enums
- \`PendingReportState\`
- \`SyncOperationState\`
- \`ConflictResolutionState\`
- \`ConflictPolicy\` (enum of policies used)

### 4. Unit Tests
- Clinical fields require vector_clock policy
- LWW only allowed for configured low-risk metadata
- \`retry_attempt_count\` is local_only
- \`sync_cursor\` is server_token
- Forbidden state transitions rejected
- ConflictPayload required fields validated

## HANDOFF PACKAGE (NORMATIVE)

The following is your ONLY source of truth. Do not deviate.

---

${handoffMd}
`;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function renderReport(result: ReturnType<typeof evaluateHandoffTestOutput>): string {
  const lines: string[] = [];
  const ln = (s = "") => lines.push(s);

  ln("# P11.2 Cross-Model Handoff Test Report");
  ln();
  ln(`**Model**: ${result.model_name}`);
  ln(`**Date**: ${result.evaluated_at}`);
  ln(`**Status**: ${result.status.toUpperCase()}`);
  ln();
  ln("---");
  ln();
  ln("## Metrics");
  ln();
  ln("| Check | Count |");
  ln("|---|---|");
  for (const [key, value] of Object.entries(result.metrics)) {
    const icon = value === 0 ? "✅" : "❌";
    ln(`| ${key} | ${icon} ${value} |`);
  }
  ln();
  ln("---");
  ln();

  if (result.critical_violations.length > 0) {
    ln("## Critical Violations");
    ln();
    for (const v of result.critical_violations) {
      ln(`### ❌ ${v.type}`);
      ln();
      ln(v.message);
      ln();
      ln(`Evidence: \`${v.evidence}\``);
      ln();
    }
    ln("---");
    ln();
  }

  if (result.warnings.length > 0) {
    ln("## Warnings");
    ln();
    for (const w of result.warnings) {
      ln(`### ⚠️ ${w.type}`);
      ln();
      ln(w.message);
      ln();
      ln(`Evidence: \`${w.evidence}\``);
      ln();
    }
    ln("---");
    ln();
  }

  ln("## Conclusion");
  ln();
  if (result.status === "pass") {
    ln("The model output adheres to all handoff package constraints. No invented fields, states, or policy violations detected.");
  } else if (result.status === "pass_with_warnings") {
    ln("The model output has minor deviations (warnings only). No critical violations. Review warnings for non-blocking issues.");
  } else {
    ln("The model output contains critical violations. The handoff package was NOT sufficient to prevent hallucination. Review and fix the handoff package or model prompt.");
  }
  ln();

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const mode = process.argv[2] || "generate";

  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P11.2: Cross-Model Handoff Test                    ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  if (mode === "generate") {
    console.log("  Mode: GENERATE prompt bundle\n");

    const handoffMd = await fs.readFile(join(HANDOFF_DIR, "HANDOFF.md"), "utf8");
    const pkg: ImplementationHandoffPackage = JSON.parse(
      await fs.readFile(join(HANDOFF_DIR, "handoff_package.json"), "utf8"),
    );

    const prompt = buildTestPrompt(handoffMd, pkg);

    await fs.mkdir(HANDOFF_DIR, { recursive: true });
    await fs.writeFile(join(HANDOFF_DIR, "cross_model_test_prompt.md"), prompt, "utf8");

    const stats = {
      prompt_length: prompt.length,
      handoff_md_length: handoffMd.length,
      total_sections: (handoffMd.match(/^## /gm) || []).length,
      contract_definitions: pkg.contract_definitions.length,
      data_models: pkg.data_models.length,
      state_machines: pkg.state_machines.length,
      forbidden_assumptions: pkg.forbidden_assumptions.length,
    };

    console.log("  Prompt generated:");
    for (const [k, v] of Object.entries(stats)) {
      console.log(`    ${k}: ${v}`);
    }
    console.log(`\n  Output: ${join(HANDOFF_DIR, "cross_model_test_prompt.md")}`);
    console.log("\n  ──────────────────────────────────────────────────────");
    console.log("  Next steps:");
    console.log("  1. Copy cross_model_test_prompt.md to an external coding agent");
    console.log("  2. Do NOT provide any other context (no P10 reports, no chat history)");
    console.log("  3. Save the model's complete output to:");
    console.log(`     ${join(OUTPUT_DIR, "<model_name>_output.kt")}`);
    console.log("  4. Run: npx tsx scripts/runPhase11CrossModelTest.ts evaluate <output-file>");
    console.log("  ──────────────────────────────────────────────────────\n");

  } else if (mode === "evaluate") {
    const outputFile = process.argv[3];
    const modelName = process.argv[4] || "unknown_model";

    if (!outputFile) {
      console.error("  ❌ Usage: evaluate <output-file> [model-name]");
      process.exit(1);
    }

    console.log(`  Mode: EVALUATE model output\n`);
    console.log(`  Output file: ${outputFile}`);
    console.log(`  Model: ${modelName}`);

    const output = await fs.readFile(outputFile, "utf8");
    const pkg: ImplementationHandoffPackage = JSON.parse(
      await fs.readFile(join(HANDOFF_DIR, "handoff_package.json"), "utf8"),
    );

    console.log(`  Output length: ${output.length} chars\n`);

    const result = evaluateHandoffTestOutput(modelName, output, pkg);

    // Print results
    console.log("  Evaluation Results:");
    for (const [key, value] of Object.entries(result.metrics)) {
      const icon = value === 0 ? "✅" : "❌";
      console.log(`    ${icon} ${key}: ${value}`);
    }

    console.log(`\n  Critical violations: ${result.critical_violations.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);
    console.log(`  Status: ${result.status.toUpperCase()}`);

    // Save reports
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const reportMd = renderReport(result);
    await fs.writeFile(join(HANDOFF_DIR, "HANDOFF-CROSS-MODEL-TEST-report.md"), reportMd, "utf8");
    console.log("\n  ✅ HANDOFF-CROSS-MODEL-TEST-report.md");

    await fs.writeFile(join(HANDOFF_DIR, "HANDOFF-CROSS-MODEL-TEST-report.json"), JSON.stringify(result, null, 2), "utf8");
    console.log("  ✅ HANDOFF-CROSS-MODEL-TEST-report.json");

    console.log(`\n  ══════════════════════════════════════════════════`);
    console.log(`  P11.2 CROSS-MODEL TEST: ${result.status === "fail" ? "❌ FAIL" : result.status === "pass" ? "✅ PASS" : "⚠️ PASS WITH WARNINGS"}`);
    console.log(`  ══════════════════════════════════════════════════\n`);
  } else {
    console.error(`  Unknown mode: ${mode}. Use 'generate' or 'evaluate'.`);
    process.exit(1);
  }
}

main().catch(err => { console.error("P11.2 failed:", err); process.exit(1); });
