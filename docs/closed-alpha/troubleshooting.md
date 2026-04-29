# Troubleshooting

## `repair_id is required for correctness`

Pantheon found no explicit `repair_id` input. Use `pantheon repair list` and rerun with the intended repair session.

## `requires_replan`

The repair contract was generated for an older repository base. Run repair plan again for the current base SHA.

## `requires_scope_expansion`

The PR changed a file outside the approved repair scope. Revert the file or request scope expansion.

## Comment not posted

GitHub comment posting can fail on fork PRs or insufficient permissions. Check `GITHUB_STEP_SUMMARY`, action outputs, and artifacts.
