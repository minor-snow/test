# Pantheon Boundaries

This task is scoped by Pantheon.

## Human Review

- Required: **yes**
- Reason: HIGH risk blast radius

## Scope Summary

- Risk level: **HIGH**
- Changed nodes:
  - `blk:arch:b_sync_001`
  - `blk:arch:b_sync_003`
  - `blk:arch:nonexistent`
- Affected files: 10
- Affected symbols: 21
- Required tests: 2

## Allowed Files

You may read and modify only these files unless the user explicitly approves a Pantheon reverse issue:

- `Enums.kt` (read, modify, regenerate, test)
- `Entities.kt` (read, modify, regenerate, test)
- `Dtos.kt` (read, modify, regenerate, test)
- `StateMachines.kt` (read, modify, regenerate, test)
- `ConflictPolicy.kt` (read, modify, regenerate, test)
- `ConflictPolicyTests.kt` (read, modify, test)
- `contracts/Interfaces.kt` (read, modify, regenerate, test)
- `contracts/Guards.kt` (read, modify, regenerate, test)
- `contracts/ContractTests.kt` (read, modify, test)
- `contracts/TodoStubs.kt` (read, modify, regenerate, test)

## Forbidden Files

Do not modify:

- `.pantheon/**`
- `.cursor/**`
- `ui/**`
- `navigation/**`
- `theme/**`
- `build/**`
- `gradle/**`

## Required Tests

Before completion, run or preserve:

- `test:forbidden:FA-004` — must run
  - File: `contracts/Guards.kt`
- `test:forbidden:FA-005` — must run
  - File: `contracts/Guards.kt`

## Must Preserve Constraints

- Conflict policy pending_report_state resolution rules must not be silently changed.
  - Source: `hc:conflict_policy:pending_report_state`
- Conflict policy retry_attempt_count resolution rules must not be silently changed.
  - Source: `hc:conflict_policy:retry_attempt_count`
- Forbidden assumption: FA-004
  - Source: `hc:forbidden:FA-004`
  - Enforced by: `contracts/ContractTests.kt`, `contracts/Guards.kt`, `contracts/Guards.kt`
- Forbidden assumption: FA-005
  - Source: `hc:forbidden:FA-005`
  - Enforced by: `contracts/ContractTests.kt`, `contracts/Guards.kt`, `contracts/Guards.kt`

## Forbidden Assumptions

These assumptions are explicitly forbidden:

- **FA-004**
  - Enforced by: `contracts/ContractTests.kt`, `contracts/Guards.kt`, `contracts/Guards.kt`
- **FA-005**
  - Enforced by: `contracts/ContractTests.kt`, `contracts/Guards.kt`, `contracts/Guards.kt`

## Reverse Issue Required If

Stop and create a Pantheon reverse issue if:

- A required field is missing from generated models.
- A new state transition is required that is not in the generated state machine.
- A new conflict policy is required.
- Implementation needs to modify a file outside the allowed list.
- A generated contract test blocks implementation.
- Downstream agent needs to change generated boundary code directly.

Use: `npx tsx scripts/createImplementationIssue.ts` to create a structured reverse issue.
