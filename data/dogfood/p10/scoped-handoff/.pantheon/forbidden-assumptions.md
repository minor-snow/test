# Forbidden Assumptions

These assumptions are explicitly forbidden within this implementation scope.
Violating them may cause data corruption, silent overwrites, or audit failures.

## hc:forbidden:FA-004

**Statement**: FA-004

**Reason**: Forbidden assumption affected by blast radius

**Source**: `hc:forbidden:FA-004`

**Enforced by**:
- guard: `contracts/ContractTests.kt` *(heuristic)*
- guard: `contracts/Guards.kt` *(heuristic)*
- test: `contracts/Guards.kt` *(heuristic)*

## hc:forbidden:FA-005

**Statement**: FA-005

**Reason**: Forbidden assumption affected by blast radius

**Source**: `hc:forbidden:FA-005`

**Enforced by**:
- guard: `contracts/ContractTests.kt` *(heuristic)*
- guard: `contracts/Guards.kt` *(heuristic)*
- test: `contracts/Guards.kt` *(heuristic)*

---

# Must Preserve Constraints

## constraint_preserve_pending_report_state

**Conflict policy pending_report_state resolution rules must not be silently changed.**

Severity: HIGH

Source: `hc:conflict_policy:pending_report_state`

## constraint_preserve_retry_attempt_count

**Conflict policy retry_attempt_count resolution rules must not be silently changed.**

Severity: HIGH

Source: `hc:conflict_policy:retry_attempt_count`

## constraint_hc_forbidden_FA_004

**Forbidden assumption: FA-004**

Severity: HIGH

Source: `hc:forbidden:FA-004`

Enforced by:
- guard: `contracts/ContractTests.kt` *(heuristic)*
- guard: `contracts/Guards.kt` *(heuristic)*
- test: `contracts/Guards.kt` *(heuristic)*

## constraint_hc_forbidden_FA_005

**Forbidden assumption: FA-005**

Severity: HIGH

Source: `hc:forbidden:FA-005`

Enforced by:
- guard: `contracts/ContractTests.kt` *(heuristic)*
- guard: `contracts/Guards.kt` *(heuristic)*
- test: `contracts/Guards.kt` *(heuristic)*
