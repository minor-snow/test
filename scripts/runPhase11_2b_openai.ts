/**
 * P11.2b — Cross-Model Conflict Test Supplement
 *
 * Sends GPT-4o-mini the handoff package + its own data model output,
 * asks it to ONLY write conflict policy unit tests.
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { evaluateHandoffTestOutput } from "../src/handoff/handoffTestEvaluator.js";
import type { ImplementationHandoffPackage } from "../src/handoff/types.js";

const API_KEY = process.argv[2] || "";
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
          content: "You are a senior Kotlin/Android test engineer. Write ONLY Kotlin unit test code using JUnit4 @Test annotations. No explanations, no markdown. Every test function must use @Test annotation.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 8192,
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

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P11.2b: Cross-Model Conflict Test Supplement        ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  if (!API_KEY) { console.error("  ❌ Pass API key as first arg."); process.exit(1); }

  // Load handoff + previous data model output
  const handoffMd = await fs.readFile(join(HANDOFF_DIR, "HANDOFF.md"), "utf8");
  const prevOutput = await fs.readFile(join(OUTPUT_DIR, "gpt4omini_output.kt"), "utf8");
  const pkg: ImplementationHandoffPackage = JSON.parse(
    await fs.readFile(join(HANDOFF_DIR, "handoff_package.json"), "utf8"),
  );

  // Extract just the conflict policy matrix and state machine sections from HANDOFF.md
  const conflictSection = handoffMd.match(/## 4\. Conflict Policy Matrix[\s\S]*?(?=## 5\.)/)?.[0] || "";
  const stateSection = handoffMd.match(/## 6\. State Machines[\s\S]*?(?=## 7\.)/)?.[0] || "";
  const forbiddenSection = handoffMd.match(/## 8\. Forbidden Assumptions[\s\S]*?(?=## 9\.)/)?.[0] || "";

  const prompt = `# Task: Write Conflict Policy Unit Tests

You previously implemented these Kotlin data models for an offline-first pet triage system:

\`\`\`kotlin
${prevOutput}
\`\`\`

Now write **ONLY unit tests** (JUnit4 with @Test) that verify the conflict policy contracts. Use the normative conflict policy matrix and state machines below as your ONLY source of truth.

## Required Tests (MUST implement all 6):

### 1. Clinical fields require vector_clock policy
Test that these high-risk field groups use vector_clock, NOT LWW:
- patient_case_status (case_status, triage_urgency)
- vet_note_summary (remote_vet_note, case_note_summary, clinical_notes)
- triage_report_body (triage_result, symptom_assessment)
- risk_level (risk_level, severity_score, clinical_risk)
- suspected_condition (suspected_condition, differential_diagnosis)

### 2. LWW only for low-risk metadata
Test that ONLY these field groups use last_writer_wins:
- last_viewed_screen
- local_cache_timestamp
Verify that NO high-risk field group uses LWW.

### 3. retry_attempt_count is local_only
Test that retry_count, attempt_number fields use local_only policy.

### 4. sync_cursor is server_token
Test that sync_cursor, pull_cursor, server_cursor, next_token use server_token policy.

### 5. Forbidden state transitions rejected
Test ALL forbidden transitions from each state machine:
PendingReportState:
  - conflicted → queued_for_sync (FORBIDDEN)
  - failed_terminal → syncing (FORBIDDEN)
  - requires_review → queued_for_sync (FORBIDDEN)
  - merged → draft (FORBIDDEN)
  - merged → queued_for_sync (FORBIDDEN)

SyncOperationState:
  - dead_lettered → queued (FORBIDDEN)
  - acknowledged → in_flight (FORBIDDEN)
  - dead_lettered → in_flight (FORBIDDEN)

ConflictResolutionState:
  - manual_review_required → auto_merged (FORBIDDEN)
  - clinician_resolved → manual_review_required (FORBIDDEN)
  - lww_applied → manual_review_required (FORBIDDEN)

### 6. ConflictPayload required fields validation
Test that ConflictPayload has ALL 6 required fields:
- report_id, local_version, remote_version, local_clock, remote_clock, conflicting_fields

## Normative Reference

${conflictSection}

${stateSection}

${forbiddenSection}
`;

  console.log(`  Prompt: ${prompt.length} chars`);
  console.log(`  Previous output: ${prevOutput.length} chars\n`);

  // Call OpenAI
  const output = await callOpenAI(prompt);
  console.log(`\n  Output: ${output.length} chars\n`);

  // Save raw output
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(join(OUTPUT_DIR, "gpt4omini_conflict_tests.kt"), output, "utf8");
  console.log("  ✅ Saved: gpt4omini_conflict_tests.kt\n");

  // Combine with previous output for evaluation
  const combined = prevOutput + "\n\n" + output;

  // Evaluate combined
  const result = evaluateHandoffTestOutput(MODEL + " (combined)", combined, pkg);

  // Print
  for (const [key, value] of Object.entries(result.metrics)) {
    const icon = value === 0 ? "✅" : "❌";
    console.log(`    ${icon} ${key}: ${value}`);
  }

  if (result.critical_violations.length > 0) {
    console.log(`\n  Critical (${result.critical_violations.length}):`);
    for (const v of result.critical_violations) console.log(`    ❌ [${v.type}] ${v.message}`);
  }
  if (result.warnings.length > 0) {
    console.log(`\n  Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) console.log(`    ⚠️  [${w.type}] ${w.message}`);
  }

  // Check specific test presence
  const testNames = output.match(/@Test\s+fun\s+(\w+)/g)?.map(m => m.replace(/@Test\s+fun\s+/, "")) || [];
  const backtickTests = output.match(/fun\s+`([^`]+)`/g)?.map(m => m.replace(/fun\s+`/, "").replace(/`$/, "")) || [];
  const allTests = [...testNames, ...backtickTests];

  console.log(`\n  Tests found in output: ${allTests.length}`);
  for (const t of allTests) console.log(`    - ${t}`);

  // Check conflict test coverage
  const hasConflictTest = allTests.some(t => /conflict|lww|vector|merge|resolution|forbidden|policy/i.test(t));
  console.log(`\n  Conflict-related tests: ${hasConflictTest ? "✅ FOUND" : "❌ MISSING"}`);

  // Save combined report
  const report = {
    phase: "P11.2b",
    model: MODEL,
    supplement_type: "conflict_policy_tests_only",
    result: result.status,
    conflict_tests_found: hasConflictTest,
    test_names: allTests,
    metrics: result.metrics,
    critical_count: result.critical_violations.length,
    warning_count: result.warnings.length,
    evaluated_at: result.evaluated_at,
  };

  await fs.writeFile(join(STORE_ROOT, "evidence", "p11_2b_conflict_test.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("  ✅ p11_2b_conflict_test.json (evidence)");

  const finalStatus = result.critical_violations.length === 0 && hasConflictTest ? "PASS" : "FAIL";

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P11.2b CONFLICT TEST SUPPLEMENT: ${finalStatus === "PASS" ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Tests: ${allTests.length} | Conflict tests: ${hasConflictTest ? "yes" : "no"}`);
  console.log(`  Combined status: ${result.status}`);
  console.log(`  ══════════════════════════════════════════════════\n`);
}

main().catch(err => { console.error("P11.2b failed:", err); process.exit(1); });
