# Phase BUG-FULL Plan

Date: 2026-04-30
Status: completed

Phase BUG-FULL was executed as a stabilization-only stage before P28b. Its purpose was to close every issue still tracked in `docs/audit/BUGS_AND_DEBT.md` to one explicit disposition: `fixed`, `duplicate`, `non_repro`, `intentional_exception`, or `defer_with_reason`.

## Waves

1. BUG-FULL-0: issue-index normalization
2. BUG-FULL-1: secret cleanup and path-containment hardening
3. BUG-FULL-2: GitHub and action-surface hardening
4. BUG-FULL-3: governance-log, metrics, and review-queue reliability
5. BUG-FULL-4: alpha harness, doctor, builder, and validator consistency
6. BUG-FULL-5: Python P28b blocker cleanup
7. BUG-FULL-6: test-quality and build-hygiene cleanup
8. BUG-FULL-7: architecture, docs, and script-truth sync
9. BUG-FULL-8: bounded technical-debt consolidation
10. BUG-FULL-9: final regression and closure audit

## Outputs

- `data/audit/phase_bug_full_issue_index.json`
- `data/audit/phase_bug_full_vitest.json`
- `docs/internal/phase_bug_full_closure_report.md`
- updated `ARCHITECTURE.md`
- updated `docs/internal/script_status_inventory.md`
