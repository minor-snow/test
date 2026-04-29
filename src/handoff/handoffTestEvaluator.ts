/**
 * Handoff Test Evaluator — Checks model output against handoff package constraints
 *
 * ref: P11.2-004
 *
 * Input: handoff_package.json + model output text
 * Output: structured violation report
 */

import type { ImplementationHandoffPackage } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HandoffViolation = {
  type: string;
  message: string;
  evidence: string;
};

export type HandoffTestResult = {
  model_name: string;
  status: "pass" | "pass_with_warnings" | "fail";
  critical_violations: HandoffViolation[];
  warnings: HandoffViolation[];
  metrics: {
    invented_fields: number;
    invented_states: number;
    clinical_lww_violations: number;
    missing_required_fields: number;
    missing_conflict_tests: number;
    forbidden_assumption_violations: number;
    vector_clock_omissions: number;
    audit_required_omissions: number;
  };
  evaluated_at: string;
};

// ---------------------------------------------------------------------------
// Field / state / policy extraction from model output
// ---------------------------------------------------------------------------

/** Extract Kotlin-style val/var field declarations */
function extractFields(output: string): string[] {
  const fields: string[] = [];
  // val fieldName: Type
  const valRegex = /(?:val|var)\s+(\w+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = valRegex.exec(output)) !== null) {
    fields.push(m[1]);
  }
  // @ColumnInfo(name = "field_name")
  const colRegex = /@ColumnInfo\s*\(\s*name\s*=\s*"(\w+)"/g;
  while ((m = colRegex.exec(output)) !== null) {
    fields.push(m[1]);
  }
  return [...new Set(fields)];
}

/** Extract enum values from Kotlin-style enum declarations */
function extractEnumValues(output: string): Map<string, string[]> {
  const enums = new Map<string, string[]>();
  // enum class EnumName { VALUE_1, VALUE_2, ... }
  const enumRegex = /enum\s+class\s+(\w+)\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = enumRegex.exec(output)) !== null) {
    const name = m[1];
    const body = m[2];
    const values = body
      .split(/[,;\n]/)
      .map(v => v.trim().replace(/\(.*/, ""))
      .filter(v => v.length > 0 && v !== "}" && !v.startsWith("//") && !v.startsWith("/*"));
    enums.set(name, values);
  }
  return enums;
}

/** Extract test function names */
function extractTestNames(output: string): string[] {
  const tests: string[] = [];
  const testRegex = /@Test\s+fun\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = testRegex.exec(output)) !== null) {
    tests.push(m[1]);
  }
  // Also JUnit5 style
  const junitRegex = /fun\s+`([^`]+)`/g;
  while ((m = junitRegex.exec(output)) !== null) {
    tests.push(m[1]);
  }
  return tests;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkInventedFields(
  outputFields: string[],
  pkg: ImplementationHandoffPackage,
): { violations: HandoffViolation[]; count: number } {
  // Collect all known fields from data models + contract definitions
  const known = new Set<string>();

  for (const dm of pkg.data_models) {
    for (const f of dm.fields) {
      known.add(f.name);
      // Also add camelCase version
      known.add(f.name.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
    }
  }
  for (const cd of pkg.contract_definitions) {
    known.add(cd.term);
    if (cd.fields) {
      for (const f of cd.fields) {
        known.add(f.name);
        known.add(f.name.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
      }
    }
  }
  for (const cpm of pkg.conflict_policy_matrix) {
    for (const f of cpm.fields) {
      known.add(f);
      known.add(f.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
    }
  }
  // Common Kotlin/Room/standard fields that are NOT invented
  const standard = new Set([
    "id", "serialVersionUID", "INSTANCE", "companion", "entries",
    "tableName", "name", "ordinal", "value", "toString",
    // State machine validator internals
    "allowedTransitions", "forbiddenTransitions", "auditRequiredTransitions",
    // Conflict policy registry internals
    "allFieldGroups", "clinicalFieldGroups", "lwwFieldGroups",
    "fieldGroup",
    // P13 contract boundary fields
    "resolution", "mergedFields", "requiresClinician", "auditEventGenerated",
    "repository", "auditWriter", "guards",
    // P13 retry policy constants
    "INITIAL_DELAY_MS", "BACKOFF_MULTIPLIER", "MAX_RETRIES", "MAX_DELAY_MS",
  ]);

  const invented: string[] = [];
  for (const f of outputFields) {
    if (!known.has(f) && !standard.has(f)) {
      invented.push(f);
    }
  }

  return {
    violations: invented.map(f => ({
      type: "invented_field",
      message: `Field '${f}' not found in handoff package`,
      evidence: f,
    })),
    count: invented.length,
  };
}

function checkInventedStates(
  outputEnums: Map<string, string[]>,
  pkg: ImplementationHandoffPackage,
): { violations: HandoffViolation[]; count: number } {
  const violations: HandoffViolation[] = [];
  let count = 0;

  // Map handoff state machine names to their states
  const knownStates = new Map<string, Set<string>>();
  for (const sm of pkg.state_machines) {
    const stateSet = new Set(sm.states);
    knownStates.set(sm.name, stateSet);
    // Also map by snake_case
    const snake = sm.name.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    knownStates.set(snake, stateSet);
  }

  // Also add contract enum values
  for (const cd of pkg.contract_definitions) {
    if (cd.enum_values) {
      const stateSet = new Set(cd.enum_values.map(v => v.value));
      knownStates.set(cd.term, stateSet);
    }
  }

  for (const [enumName, values] of outputEnums) {
    // Find matching handoff state machine
    const lowerName = enumName.toLowerCase();
    let matched: Set<string> | undefined;
    for (const [key, states] of knownStates) {
      if (lowerName.includes(key.toLowerCase().replace(/_/g, "")) ||
          key.toLowerCase().replace(/_/g, "").includes(lowerName)) {
        matched = states;
        break;
      }
    }

    if (matched) {
      for (const v of values) {
        const vLower = v.toLowerCase();
        const hasMatch = [...matched].some(s =>
          s === vLower || s.replace(/_/g, "") === vLower.replace(/_/g, "")
        );
        if (!hasMatch) {
          violations.push({
            type: "invented_state",
            message: `Enum value '${v}' in '${enumName}' not found in handoff state machine`,
            evidence: `${enumName}.${v}`,
          });
          count++;
        }
      }
    }
  }

  return { violations, count };
}

function checkClinicalLwwViolations(
  output: string,
  pkg: ImplementationHandoffPackage,
): { violations: HandoffViolation[]; count: number } {
  const violations: HandoffViolation[] = [];
  const lwwPatterns = ["last_writer_wins", "lww", "LastWriterWins", "LWW"];

  // Test assertion markers — if LWW appears near these, it's a test
  // verifying that LWW is NOT used on clinical fields, not implementing it.
  // Also covers Kotlin when-blocks in test helpers and policy mapping functions.
  const assertionMarkers = [
    "assert", "Assert", "@Test", "assertFailsWith",
    "assertEquals", "assertThrows", "expect", "should",
    "getConflictPolicy", "when (field)", "return when",
    "fun test", "fun Test", "private fun",
    // Generated code context markers
    "ConflictPolicyRegistry", "clinicalFieldGroups", "lwwFieldGroups",
    "val allFieldGroups", "listOf(",
  ];

  // Identify clinical fields from conflict policy matrix
  const clinicalFields: string[] = [];
  for (const cpm of pkg.conflict_policy_matrix) {
    if (cpm.policy === "vector_clock" && cpm.risk_level === "high") {
      clinicalFields.push(...cpm.fields);
    }
  }

  // Check if any clinical field is near LWW references
  for (const field of clinicalFields) {
    const fieldCamel = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    for (const lww of lwwPatterns) {
      // Check for proximity (within 200 chars)
      const indices: number[] = [];
      let idx = output.indexOf(lww);
      while (idx !== -1) {
        indices.push(idx);
        idx = output.indexOf(lww, idx + 1);
      }
      for (const lwwIdx of indices) {
        const context = output.slice(Math.max(0, lwwIdx - 200), lwwIdx + 200);
        if (context.includes(field) || context.includes(fieldCamel)) {
          // Skip if this is inside a test assertion context.
          // Use a wider window (500 chars) to catch function signatures.
          const wideContext = output.slice(Math.max(0, lwwIdx - 500), lwwIdx + 200);
          const isTestContext = assertionMarkers.some(m => wideContext.includes(m));
          if (isTestContext) continue;

          violations.push({
            type: "clinical_lww_violation",
            message: `Clinical field '${field}' appears near LWW policy '${lww}'`,
            evidence: context.slice(0, 100),
          });
        }
      }
    }
  }

  return { violations, count: violations.length };
}

function checkVectorClockPresence(
  output: string,
  pkg: ImplementationHandoffPackage,
): { violations: HandoffViolation[]; count: number } {
  const violations: HandoffViolation[] = [];
  const hasVectorClock =
    output.includes("VectorClock") ||
    output.includes("vector_clock") ||
    output.includes("vectorClock") ||
    output.includes("Map<String, Int>");

  // Check clinical-conflict fields require vector clock
  const hasConflictFields = pkg.conflict_policy_matrix.some(
    cpm => cpm.policy === "vector_clock" && cpm.risk_level === "high"
  );

  if (hasConflictFields && !hasVectorClock) {
    violations.push({
      type: "vector_clock_omission",
      message: "Clinical conflict fields defined but VectorClock DTO/type not found in output",
      evidence: "Missing VectorClock definition for clinical field conflict detection",
    });
  }

  return { violations, count: violations.length };
}

function checkAuditRequired(
  output: string,
  pkg: ImplementationHandoffPackage,
): { violations: HandoffViolation[]; count: number } {
  const violations: HandoffViolation[] = [];
  const auditRequiredGroups = pkg.conflict_policy_matrix
    .filter(cpm => cpm.audit_required)
    .map(cpm => cpm.field_group);

  const hasAuditMention =
    output.includes("audit") || output.includes("Audit") ||
    output.includes("AuditEvent");

  if (auditRequiredGroups.length > 0 && !hasAuditMention) {
    violations.push({
      type: "audit_required_omission",
      message: `${auditRequiredGroups.length} field groups require audit but no audit mechanism found`,
      evidence: `Audit-required groups: ${auditRequiredGroups.join(", ")}`,
    });
  }

  return { violations, count: violations.length };
}

function checkConflictPayloadFields(
  outputFields: string[],
  pkg: ImplementationHandoffPackage,
): { violations: HandoffViolation[]; count: number } {
  const violations: HandoffViolation[] = [];

  // Find ConflictPayload required fields from contract definitions
  const cpDef = pkg.contract_definitions.find(cd => cd.term === "conflict_payload");
  if (!cpDef?.fields) return { violations, count: 0 };

  const requiredFields = cpDef.fields.filter(f => f.required).map(f => f.name);
  const outputFieldSet = new Set(outputFields.map(f =>
    f.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "")
  ));
  // Also add originals
  for (const f of outputFields) outputFieldSet.add(f);

  for (const rf of requiredFields) {
    const camel = rf.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (!outputFieldSet.has(rf) && !outputFieldSet.has(camel)) {
      violations.push({
        type: "missing_conflict_payload_field",
        message: `ConflictPayload required field '${rf}' not found in output`,
        evidence: rf,
      });
    }
  }

  return { violations, count: violations.length };
}

function checkForbiddenAssumptions(
  output: string,
  pkg: ImplementationHandoffPackage,
): { violations: HandoffViolation[]; count: number } {
  const violations: HandoffViolation[] = [];

  // Check specific forbidden patterns
  for (const fa of pkg.forbidden_assumptions) {
    // Check for common violations based on assumption text
    const lowerStmt = fa.statement.toLowerCase();

    if (lowerStmt.includes("do not use lww for clinical") || lowerStmt.includes("clinical fields")) {
      // Already checked in clinical LWW
      continue;
    }

    if (lowerStmt.includes("do not assume single clinic") || lowerStmt.includes("multi-clinic")) {
      // Check for hardcoded single clinic
      if (output.includes("\"clinic\"") && !output.includes("clinic_id") && !output.includes("clinicId")) {
        violations.push({
          type: "forbidden_assumption_violation",
          message: `Possible single-clinic assumption: ${fa.statement}`,
          evidence: fa.assumption_id,
        });
      }
    }
  }

  return { violations, count: violations.length };
}

function checkConflictTests(
  testNames: string[],
): { violations: HandoffViolation[]; count: number } {
  const violations: HandoffViolation[] = [];
  const conflictRelated = testNames.filter(t => {
    const lower = t.toLowerCase();
    return lower.includes("conflict") || lower.includes("lww") ||
           lower.includes("vector") || lower.includes("merge") ||
           lower.includes("resolution");
  });

  if (conflictRelated.length === 0) {
    violations.push({
      type: "missing_conflict_tests",
      message: "No conflict-policy related tests found in output",
      evidence: `Total tests found: ${testNames.length}, none conflict-related`,
    });
  }

  return { violations, count: conflictRelated.length === 0 ? 1 : 0 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function evaluateHandoffTestOutput(
  modelName: string,
  output: string,
  pkg: ImplementationHandoffPackage,
): HandoffTestResult {
  const fields = extractFields(output);
  const enums = extractEnumValues(output);
  const tests = extractTestNames(output);

  const inventedFields = checkInventedFields(fields, pkg);
  const inventedStates = checkInventedStates(enums, pkg);
  const clinicalLww = checkClinicalLwwViolations(output, pkg);
  const vectorClock = checkVectorClockPresence(output, pkg);
  const auditRequired = checkAuditRequired(output, pkg);
  const conflictPayload = checkConflictPayloadFields(fields, pkg);
  const forbiddenAssumptions = checkForbiddenAssumptions(output, pkg);
  const conflictTests = checkConflictTests(tests);

  // Classify violations
  const critical: HandoffViolation[] = [
    ...clinicalLww.violations,
    ...inventedStates.violations,
    ...vectorClock.violations,
    ...forbiddenAssumptions.violations,
    ...conflictPayload.violations,
  ];

  const warnings: HandoffViolation[] = [
    ...inventedFields.violations,
    ...auditRequired.violations,
    ...conflictTests.violations,
  ];

  // Determine status
  let status: "pass" | "pass_with_warnings" | "fail";
  if (critical.length > 0) {
    status = "fail";
  } else if (warnings.length > 0) {
    status = "pass_with_warnings";
  } else {
    status = "pass";
  }

  return {
    model_name: modelName,
    status,
    critical_violations: critical,
    warnings,
    metrics: {
      invented_fields: inventedFields.count,
      invented_states: inventedStates.count,
      clinical_lww_violations: clinicalLww.count,
      missing_required_fields: conflictPayload.count,
      missing_conflict_tests: conflictTests.count,
      forbidden_assumption_violations: forbiddenAssumptions.count,
      vector_clock_omissions: vectorClock.count,
      audit_required_omissions: auditRequired.count,
    },
    evaluated_at: new Date().toISOString(),
  };
}
