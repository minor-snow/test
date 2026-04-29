# Blast Radius Report

> Sync layer refactor

## Changed Nodes

- `blk:arch:b_sync_001`
- `blk:arch:b_sync_003`
- `blk:arch:nonexistent` ⚠️ (not found)

## Summary

| Metric | Count |
|---|---|
| Changed nodes | 3 (2 valid) |
| Direct impact | 25 |
| Total downstream | 58 |
| Affected files | 10 |
| Affected symbols | 21 |
| Affected tests | 2 |
| Highest risk | **high** |
| Risk amplifications | 4 |

## Affected Generated Files

- `file:Enums.kt`
- `file:Entities.kt`
- `file:Dtos.kt`
- `file:StateMachines.kt`
- `file:ConflictPolicy.kt`
- `file:ConflictPolicyTests.kt`
- `file:contracts/Interfaces.kt`
- `file:contracts/Guards.kt`
- `file:contracts/ContractTests.kt`
- `file:contracts/TodoStubs.kt`

## Affected Tests

- `test:forbidden:FA-004`
- `test:forbidden:FA-005`

## Risk Amplification

### hc:conflict_policy:pending_report_state — **high**

- Reason: High-risk conflict policy affected
- Path: `blk:arch:b_sync_001` → `hc:conflict_policy:pending_report_state`

### hc:conflict_policy:retry_attempt_count — **high**

- Reason: High-risk conflict policy affected
- Path: `blk:arch:b_sync_001` → `hc:conflict_policy:retry_attempt_count`

### hc:forbidden:FA-004 — **high**

- Reason: Forbidden assumption affected
- Tests: `test:forbidden:FA-004`
- Path: `blk:arch:b_sync_001` → `hc:forbidden:FA-004`

### hc:forbidden:FA-005 — **high**

- Reason: Forbidden assumption affected
- Tests: `test:forbidden:FA-005`
- Path: `blk:arch:b_sync_001` → `hc:forbidden:FA-005`

## Critical Paths

🔴 `blk:arch:b_sync_001` → `hc:forbidden:FA-004` → `test:forbidden:FA-004`

🔴 `blk:arch:b_sync_001` → `hc:forbidden:FA-005` → `test:forbidden:FA-005`

🔴 `blk:arch:b_sync_003` → `hc:forbidden:FA-004` → `test:forbidden:FA-004`

🔴 `blk:arch:b_sync_003` → `hc:forbidden:FA-005` → `test:forbidden:FA-005`
