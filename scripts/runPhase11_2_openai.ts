/**
 * P11.2 — Cross-Model Handoff Test via OpenAI GPT-4o-mini
 *
 * Reads the generated prompt, sends to GPT-4o-mini, evaluates output.
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { evaluateHandoffTestOutput } from "../src/handoff/handoffTestEvaluator.js";
import type { ImplementationHandoffPackage } from "../src/handoff/types.js";

const API_KEY = process.argv[2] || process.env.OPENAI_API_KEY || "";
const MODEL = "gpt-4o-mini";
const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const HANDOFF_DIR = join(STORE_ROOT, "handoff");
const OUTPUT_DIR = join(HANDOFF_DIR, "cross_model_output");

async function callOpenAI(prompt: string): Promise<string> {
  console.log(`  Calling ${MODEL}... (prompt: ${prompt.length} chars)`);

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a senior Kotlin/Android engineer. Respond ONLY with Kotlin code. No markdown fences, no explanations outside code comments. Implement everything requested.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 16384,
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as {
    choices: { message: { content: string } }[];
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  console.log(`  Tokens — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}, total: ${data.usage.total_tokens}`);

  return data.choices[0].message.content;
}

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
    ln("The cross-model output adheres to all handoff package constraints. No invented fields, states, or policy violations detected.");
  } else if (result.status === "pass_with_warnings") {
    ln("The cross-model output has minor deviations (warnings only). No critical contract violations. Review warnings for non-blocking issues.");
  } else {
    ln("The cross-model output contains critical contract violations. The handoff package was NOT sufficient to prevent hallucination from an isolated model.");
  }
  ln();

  return lines.join("\n");
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P11.2: Cross-Model Handoff Test (GPT-4o-mini)      ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  if (!API_KEY) {
    console.error("  ❌ No API key. Pass as first arg or set OPENAI_API_KEY.");
    process.exit(1);
  }

  // Load prompt
  const prompt = await fs.readFile(join(HANDOFF_DIR, "cross_model_test_prompt.md"), "utf8");
  const pkg: ImplementationHandoffPackage = JSON.parse(
    await fs.readFile(join(HANDOFF_DIR, "handoff_package.json"), "utf8"),
  );

  console.log(`  Prompt: ${prompt.length} chars`);
  console.log(`  Package: ${pkg.contract_definitions.length} contracts, ${pkg.data_models.length} models, ${pkg.state_machines.length} state machines\n`);

  // Call OpenAI
  const output = await callOpenAI(prompt);

  console.log(`\n  Output: ${output.length} chars\n`);

  // Save raw output
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(join(OUTPUT_DIR, "gpt4omini_output.kt"), output, "utf8");
  console.log("  ✅ Saved raw output: gpt4omini_output.kt\n");

  // Evaluate
  console.log("  Evaluating output...\n");
  const result = evaluateHandoffTestOutput(MODEL, output, pkg);

  // Print results
  for (const [key, value] of Object.entries(result.metrics)) {
    const icon = value === 0 ? "✅" : "❌";
    console.log(`    ${icon} ${key}: ${value}`);
  }

  if (result.critical_violations.length > 0) {
    console.log(`\n  Critical violations (${result.critical_violations.length}):`);
    for (const v of result.critical_violations) {
      console.log(`    ❌ [${v.type}] ${v.message}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\n  Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) {
      console.log(`    ⚠️  [${w.type}] ${w.message}`);
    }
  }

  // Save reports
  const reportMd = renderReport(result);
  await fs.writeFile(join(HANDOFF_DIR, "HANDOFF-CROSS-MODEL-TEST-report.md"), reportMd, "utf8");
  console.log("\n  ✅ HANDOFF-CROSS-MODEL-TEST-report.md");

  await fs.writeFile(join(HANDOFF_DIR, "HANDOFF-CROSS-MODEL-TEST-report.json"), JSON.stringify(result, null, 2), "utf8");
  console.log("  ✅ HANDOFF-CROSS-MODEL-TEST-report.json");

  // Save evidence to p10 evidence dir
  const evidenceDir = join(STORE_ROOT, "evidence");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(join(evidenceDir, "p11_2_cross_model_test.json"), JSON.stringify({
    phase: "P11.2",
    model: MODEL,
    result: result.status,
    metrics: result.metrics,
    critical_count: result.critical_violations.length,
    warning_count: result.warnings.length,
    output_chars: output.length,
    evaluated_at: result.evaluated_at,
  }, null, 2), "utf8");
  console.log("  ✅ p11_2_cross_model_test.json (evidence)");

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P11.2 CROSS-MODEL TEST (${MODEL}): ${result.status === "fail" ? "❌ FAIL" : result.status === "pass" ? "✅ PASS" : "⚠️ PASS WITH WARNINGS"}`);
  console.log(`  Critical: ${result.critical_violations.length} | Warnings: ${result.warnings.length}`);
  console.log(`  ══════════════════════════════════════════════════\n`);
}

main().catch(err => { console.error("P11.2 failed:", err); process.exit(1); });
