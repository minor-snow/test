# Scoped Handoff Report

**Status**: ⚠️ ready_with_warnings
**Scope**: `sync-conflict-policy-change_mofrw3eg`
**Risk Level**: HIGH
**Human Review Required**: yes

## Summary

| Metric | Count |
|---|---|
| Allowed files | 10 |
| Forbidden patterns | 7 |
| Required tests | 2 |
| Must-preserve constraints | 4 |
| Reverse issue triggers | 6 |

## Validation Details

⚠️ **constraint_enforcement**: High constraint constraint_preserve_pending_report_state has no enforced_by entries.
  - Consider adding enforcement references in P18.
⚠️ **constraint_enforcement**: High constraint constraint_preserve_retry_attempt_count has no enforced_by entries.
  - Consider adding enforcement references in P18.
ℹ️ **heuristic_enforcement**: Enforcement for constraint_hc_forbidden_FA_004 is heuristic-derived (file:contracts/ContractTests.kt).
  - enforced_by populated by heuristic downstream analysis, not explicit enforcement edges.
ℹ️ **heuristic_enforcement**: Enforcement for constraint_hc_forbidden_FA_004 is heuristic-derived (file:contracts/Guards.kt).
  - enforced_by populated by heuristic downstream analysis, not explicit enforcement edges.
ℹ️ **heuristic_enforcement**: Enforcement for constraint_hc_forbidden_FA_004 is heuristic-derived (test:forbidden:FA-004).
  - enforced_by populated by heuristic downstream analysis, not explicit enforcement edges.
ℹ️ **heuristic_enforcement**: Enforcement for constraint_hc_forbidden_FA_005 is heuristic-derived (file:contracts/ContractTests.kt).
  - enforced_by populated by heuristic downstream analysis, not explicit enforcement edges.
ℹ️ **heuristic_enforcement**: Enforcement for constraint_hc_forbidden_FA_005 is heuristic-derived (file:contracts/Guards.kt).
  - enforced_by populated by heuristic downstream analysis, not explicit enforcement edges.
ℹ️ **heuristic_enforcement**: Enforcement for constraint_hc_forbidden_FA_005 is heuristic-derived (test:forbidden:FA-005).
  - enforced_by populated by heuristic downstream analysis, not explicit enforcement edges.

## Outputs

- `.pantheon/scope.json`
- `.pantheon/blast-radius.json`
- `.pantheon/handoff.json`
- `.pantheon/required-tests.json`
- `.pantheon/forbidden-assumptions.md`
- `.pantheon/reverse-issue.md`
- `.pantheon/README.md`
- `.cursor/rules/pantheon-boundaries.md`
- `reports/scoped_handoff_report.json`
- `reports/scoped_handoff_report.md`