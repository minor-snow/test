# P11.2 Cross-Model Handoff Test Report

**Model**: gpt-4o-mini
**Date**: 2026-04-26T08:42:07.941Z
**Status**: PASS_WITH_WARNINGS

---

## Metrics

| Check | Count |
|---|---|
| invented_fields | ✅ 0 |
| invented_states | ✅ 0 |
| clinical_lww_violations | ✅ 0 |
| missing_required_fields | ✅ 0 |
| missing_conflict_tests | ❌ 1 |
| forbidden_assumption_violations | ✅ 0 |
| vector_clock_omissions | ✅ 0 |
| audit_required_omissions | ✅ 0 |

---

## Warnings

### ⚠️ missing_conflict_tests

No conflict-policy related tests found in output

Evidence: `Total tests found: 0, none conflict-related`

---

## Conclusion

The cross-model output has minor deviations (warnings only). No critical contract violations. Review warnings for non-blocking issues.
