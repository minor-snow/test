/**
 * Phase 11 — Step 6: Isolated Handoff Test
 *
 * Usage: npx tsx scripts/runPhase11HandoffTest.ts
 *
 * Gives ONLY HANDOFF.md + handoff_package.json to DeepSeek.
 * No chat context, no P10 reports, no operator notes.
 * Evaluates implementation slice for 7 violation checks.
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createDeepSeekClient } from "../src/trial/deepseekAdapter.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const HANDOFF_DIR = join(STORE_ROOT, "handoff");
const EVIDENCE_DIR = join(STORE_ROOT, "evidence");
const ts = new Date().toISOString();

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY ?? "sk-90b71c8c415b41ac93f7ff4e24a08a7c";

// ---------------------------------------------------------------------------
// Prompt — ONLY handoff inputs, nothing else
// ---------------------------------------------------------------------------

function buildImplementationPrompt(handoffMd: string, handoffJson: string): string {
  return `You are a Kotlin Android developer. You have been given an implementation handoff package for a Pet Triage offline-first migration project.

Your task: implement the following Kotlin data classes, enums, and basic unit tests based ONLY on the handoff documents provided below. Do NOT invent fields, states, or policies that are not in the handoff.

## Implementation Slice Required

1. **PendingReportEntity** — Room entity with all fields from the handoff data model
2. **PendingReportState** — Enum with all states from the handoff state machine
3. **SyncOperationState** — Enum with all states from the handoff state machine
4. **ConflictResolutionState** — Enum with all states from the handoff state machine
5. **ConflictPolicy** — Enum with all policies from the handoff conflict policy matrix
6. **VectorClock** — Data class with the fields from the handoff contract definition
7. **ConflictPayload** — Data class with the fields from the handoff contract definition
8. **Basic conflict policy unit tests** — At least 3 tests verifying:
   - Clinical fields use vector_clock (not LWW)
   - Metadata fields can use LWW
   - A forbidden transition is rejected

## Output Format

Output ONLY a single JSON object with these keys:
{
  "pending_report_entity": { "fields": [{"name": "...", "type": "...", "conflict_policy": "..."}], "kotlin_code": "..." },
  "pending_report_state": { "values": ["..."], "kotlin_code": "..." },
  "sync_operation_state": { "values": ["..."], "kotlin_code": "..." },
  "conflict_resolution_state": { "values": ["..."], "kotlin_code": "..." },
  "conflict_policy": { "values": ["..."], "kotlin_code": "..." },
  "vector_clock": { "fields": [{"name": "...", "type": "..."}], "kotlin_code": "..." },
  "conflict_payload": { "fields": [{"name": "...", "type": "..."}], "kotlin_code": "..." },
  "unit_tests": { "test_count": 3, "kotlin_code": "..." }
}

No markdown fences, no explanation, just the JSON.

---

## HANDOFF.md

${handoffMd}

---

## handoff_package.json (contract definitions, conflict matrix, data models, state machines)

${handoffJson}
`;
}

// ---------------------------------------------------------------------------
// Violation checks
// ---------------------------------------------------------------------------

type ViolationCheck = {
  check_id: string;
  status: "pass" | "fail";
  message: string;
};

function evaluateOutput(output: Record<string, unknown>): ViolationCheck[] {
  const checks: ViolationCheck[] = [];

  // 1. Self-invented fields
  const knownEntityFields = new Set([
    "report_id", "clinic_id", "patient_case_id", "triage_result_json",
    "status", "created_at", "updated_at", "vector_clock_json",
    "retry_count", "last_error",
  ]);
  const entityOutput = output.pending_report_entity as { fields?: Array<{ name: string }> } | undefined;
  const inventedFields: string[] = [];
  if (entityOutput?.fields) {
    for (const f of entityOutput.fields) {
      // Normalize: allow slight naming variations (snake_case)
      const normalized = f.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const matches = [...knownEntityFields].some(k =>
        normalized === k || normalized.replace(/_/g, "") === k.replace(/_/g, "")
      );
      if (!matches) inventedFields.push(f.name);
    }
  }
  checks.push({
    check_id: "invented_fields",
    status: inventedFields.length === 0 ? "pass" : "fail",
    message: inventedFields.length === 0
      ? "No self-invented fields"
      : `Self-invented fields: ${inventedFields.join(", ")}`,
  });

  // 2. LWW misuse on clinical fields
  const clinicalConflictPolicies: string[] = [];
  if (entityOutput?.fields) {
    const clinicalFields = ["status", "triage_result_json"];
    for (const f of entityOutput.fields as Array<{ name: string; conflict_policy?: string }>) {
      const normalized = f.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      if (clinicalFields.some(cf => normalized.includes(cf.replace(/_/g, ""))) &&
          f.conflict_policy?.toLowerCase()?.includes("lww")) {
        clinicalConflictPolicies.push(f.name);
      }
    }
  }
  checks.push({
    check_id: "lww_misuse",
    status: clinicalConflictPolicies.length === 0 ? "pass" : "fail",
    message: clinicalConflictPolicies.length === 0
      ? "No LWW misuse on clinical fields"
      : `Clinical fields using LWW: ${clinicalConflictPolicies.join(", ")}`,
  });

  // 3. Missing vector clock
  const vcOutput = output.vector_clock as { fields?: Array<{ name: string }> } | undefined;
  const hasVcFields = vcOutput?.fields && vcOutput.fields.length > 0;
  checks.push({
    check_id: "vector_clock_present",
    status: hasVcFields ? "pass" : "fail",
    message: hasVcFields
      ? `VectorClock defined with ${vcOutput!.fields!.length} fields`
      : "VectorClock missing or has no fields",
  });

  // 4. Invented states
  const expectedPRStates = new Set([
    "draft", "completed_offline", "queued_for_sync", "syncing", "merged",
    "conflicted", "requires_review", "failed_retryable", "failed_terminal",
  ]);
  const prStateOutput = output.pending_report_state as { values?: string[] } | undefined;
  const inventedStates: string[] = [];
  if (prStateOutput?.values) {
    for (const v of prStateOutput.values) {
      const normalized = v.toLowerCase().replace(/[^a-z0-9]/g, "_");
      if (!expectedPRStates.has(normalized)) inventedStates.push(v);
    }
  }
  checks.push({
    check_id: "invented_states",
    status: inventedStates.length === 0 ? "pass" : "fail",
    message: inventedStates.length === 0
      ? "No invented states in PendingReportState"
      : `Invented states: ${inventedStates.join(", ")}`,
  });

  // 5. Missing audit_required on conflict transitions
  // (check via unit_tests — presence of conflict-related test)
  const unitTests = output.unit_tests as { test_count?: number; kotlin_code?: string } | undefined;
  const hasConflictTest = unitTests?.kotlin_code?.toLowerCase()?.includes("conflict") ?? false;
  checks.push({
    check_id: "audit_conflict_test",
    status: hasConflictTest ? "pass" : "fail",
    message: hasConflictTest
      ? "Conflict-related unit test present"
      : "No conflict-related unit test found",
  });

  // 6. Forbidden assumption violations (check for invented conflict policies)
  const expectedPolicies = new Set([
    "vector_clock", "last_writer_wins", "server_token",
    "local_only", "manual_review", "derived_recompute",
  ]);
  const cpOutput = output.conflict_policy as { values?: string[] } | undefined;
  const inventedPolicies: string[] = [];
  if (cpOutput?.values) {
    for (const v of cpOutput.values) {
      const normalized = v.toLowerCase().replace(/[^a-z0-9]/g, "_");
      if (!expectedPolicies.has(normalized)) inventedPolicies.push(v);
    }
  }
  checks.push({
    check_id: "invented_policies",
    status: inventedPolicies.length === 0 ? "pass" : "fail",
    message: inventedPolicies.length === 0
      ? "No invented conflict policies"
      : `Invented policies: ${inventedPolicies.join(", ")}`,
  });

  // 7. Missing conflict payload fields
  const expectedCPFields = new Set([
    "report_id", "local_version", "remote_version",
    "local_clock", "remote_clock", "conflicting_fields",
  ]);
  const cpPayload = output.conflict_payload as { fields?: Array<{ name: string }> } | undefined;
  const missingCPFields: string[] = [];
  if (cpPayload?.fields) {
    for (const expected of expectedCPFields) {
      const found = cpPayload.fields.some(f =>
        f.name.toLowerCase().replace(/[^a-z0-9]/g, "_") === expected
      );
      if (!found) missingCPFields.push(expected);
    }
  } else {
    missingCPFields.push("(entire ConflictPayload missing)");
  }
  checks.push({
    check_id: "conflict_payload_completeness",
    status: missingCPFields.length === 0 ? "pass" : "fail",
    message: missingCPFields.length === 0
      ? "ConflictPayload has all required fields"
      : `Missing ConflictPayload fields: ${missingCPFields.join(", ")}`,
  });

  return checks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P11 Step 6: Isolated Handoff Test (DeepSeek)        ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Load ONLY handoff inputs
  console.log("  [1/4] Loading handoff inputs (ONLY these two files)...");
  const handoffMd = await fs.readFile(join(HANDOFF_DIR, "HANDOFF.md"), "utf8");
  const handoffJson = await fs.readFile(join(HANDOFF_DIR, "handoff_package.json"), "utf8");
  console.log(`    HANDOFF.md: ${handoffMd.length} chars`);
  console.log(`    handoff_package.json: ${handoffJson.length} chars`);
  console.log("    ⚠️  No P10 reports, no chat context, no operator notes provided");

  // Call DeepSeek
  console.log("\n  [2/4] Calling DeepSeek...");
  const client = createDeepSeekClient({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    maxTokens: 8192,
    temperature: 0.2,
  });

  const prompt = buildImplementationPrompt(handoffMd, handoffJson);
  console.log(`    Prompt: ${prompt.length} chars`);

  let rawResponse: string;
  try {
    rawResponse = await client.complete(prompt);
    console.log(`    Response: ${rawResponse.length} chars`);
  } catch (err) {
    console.error(`    ❌ DeepSeek API failed: ${err}`);
    process.exit(1);
  }

  // Parse response
  console.log("\n  [3/4] Evaluating response...");
  let parsed: Record<string, unknown>;
  try {
    // Try to extract JSON from possible markdown fences
    let jsonStr = rawResponse;
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1];
    parsed = JSON.parse(jsonStr);
    console.log("    ✅ Response is valid JSON");
  } catch {
    console.error("    ❌ Response is not valid JSON");
    console.error("    Raw (first 500 chars):", rawResponse.slice(0, 500));

    // Save raw response for debugging
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(join(EVIDENCE_DIR, "p11_handoff_test_raw.txt"), rawResponse, "utf8");

    // Still try to evaluate what we can
    parsed = {};
  }

  // Run violation checks
  const checks = evaluateOutput(parsed);
  for (const c of checks) {
    const icon = c.status === "pass" ? "✅" : "❌";
    console.log(`    ${icon} ${c.check_id}: ${c.message}`);
  }

  const criticalViolations = checks.filter(c => c.status === "fail");
  const hasCritical = criticalViolations.length > 0;

  const testResult = hasCritical ? "not_ready" : "ready";
  console.log(`\n    Handoff test result: ${testResult.toUpperCase()}`);
  console.log(`    Violations: ${criticalViolations.length} / ${checks.length}`);

  // Save reports
  console.log("\n  [4/4] Saving reports...");
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });

  const report = {
    test_id: "p11_handoff_test",
    model: "deepseek-chat",
    model_note: "same-model handoff test is optimistic, not adversarial",
    inputs: ["HANDOFF.md", "handoff_package.json"],
    excluded_inputs: ["P10 report", "chat context", "ArchitectureDraft", "InterfaceSpec", "ModuleSpec", "operator notes"],
    result: testResult,
    checks,
    critical_violations: criticalViolations.map(c => c.message),
    raw_response_length: rawResponse.length,
    prompt_length: prompt.length,
    created_at: ts,
  };

  await fs.writeFile(join(EVIDENCE_DIR, "p11_handoff_test_report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("    ✅ p11_handoff_test_report.json");

  await fs.writeFile(join(EVIDENCE_DIR, "p11_handoff_test_raw.txt"), rawResponse, "utf8");
  console.log("    ✅ p11_handoff_test_raw.txt");

  await fs.writeFile(join(EVIDENCE_DIR, "p11_handoff_test_parsed.json"), JSON.stringify(parsed, null, 2), "utf8");
  console.log("    ✅ p11_handoff_test_parsed.json");

  // Generate markdown report
  const md = `# P11 Handoff Test Report

**Date**: ${ts}
**Model**: deepseek-chat
**Result**: \`${testResult}\`
**Note**: Same-model handoff test is optimistic, not adversarial.

## Inputs Provided

- HANDOFF.md (${handoffMd.length} chars)
- handoff_package.json (${handoffJson.length} chars)

## Inputs Excluded

- P10 report
- Chat context
- ArchitectureDraft / InterfaceSpec / ModuleSpec
- Operator notes

## Violation Checks (${checks.length})

| Check | Status | Message |
|---|---|---|
${checks.map(c => `| ${c.check_id} | ${c.status === "pass" ? "✅" : "❌"} | ${c.message} |`).join("\n")}

## Critical Violations

${criticalViolations.length === 0 ? "None." : criticalViolations.map(c => `- ${c.message}`).join("\n")}

## Conclusion

${testResult === "ready"
    ? "The handoff package was sufficient for the implementation agent to produce a correct implementation slice without self-invention or policy violations."
    : "The handoff package did not prevent the implementation agent from making errors. See violations above."}
`;

  await fs.writeFile(join(HANDOFF_DIR, "HANDOFF-TEST-report.md"), md, "utf8");
  console.log("    ✅ HANDOFF-TEST-report.md");

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P11 HANDOFF TEST: ${testResult === "ready" ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  ══════════════════════════════════════════════════`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main().catch(err => { console.error("P11 test failed:", err); process.exit(1); });
