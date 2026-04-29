# Scope Diff Validation Report

**Generated**: 2026-04-26T12:58:03.545Z
**Scope**: `sync-conflict-policy-change_mofrw3eg`

## Status

🔒 **REQUIRES_HUMAN_REVIEW**

## Blocking Reasons

- Human review is required for HIGH risk scope.

## Summary

| Metric | Count |
|---|---|
| Changed files | 1 |
| Allowed files modified | 1 |
| Outside scope | 0 |
| Forbidden files | 0 |
| Protocol files | 0 |
| Generated boundary files | 1 |
| Required tests | 2 |
| Tests passed | 2 |
| Tests failed | 0 |
| Tests missing | 0 |
| Reverse issue triggers | 1 |

## Violations

### 🔴 human_review_missing

- **ID**: `v_human_review_missing`
- **Severity**: high
- **Message**: Human review is required for HIGH risk scope.
- **Required action**: Provide human review with reviewer_id and rationale before proceeding.

### 🔴 reverse_issue_required

- **ID**: `v_reverse_issue_required`
- **Severity**: high
- **Message**: One or more changes require a Pantheon Reverse Issue or approved scope expansion.
- **Required action**: Create a Pantheon Reverse Issue or expand scope through approved Pantheon workflow.

## Warnings

- **generated_file_modified_but_allowed**: Generated boundary files should normally be regenerated through Pantheon, not hand-edited. File: "ConflictPolicy.kt".

## Required Actions

1. Provide human review with reviewer_id and rationale.

## Source

- Scope hash: `63865805dd982b4a`
- Required tests hash: `2dfa090f9529a409`