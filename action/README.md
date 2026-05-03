# Pantheon Governance Gate

This composite action runs Pantheon governance inside GitHub pull requests.

Supported modes:

- `change`: checks an existing `change_id` scoped change contract.
- `repair`: checks an existing `repair_id` scoped repair contract, or creates one from an agent bug report.
- `boundary`: checks explicit `scope`, `review`, and `forbid` path boundaries.

Default mode is `change`.

## Change Mode

```yaml
- uses: pantheon/pantheon-action@v0
  id: pantheon
  with:
    mode: change
    change_id: chg_abc123
    fail_on: fail,requires_contract,requires_replan,requires_scope_expansion
```

Change mode uses the PR base SHA and, when present, the base branch architecture contract. A PR cannot modify `architecture_contract.json` and use that modified contract to authorize business code changes in the same PR.

## Repair Mode

```yaml
- uses: pantheon/pantheon-action@v0
  id: pantheon
  with:
    mode: repair
    repair_id: repair_abc123
    fail_on: fail,requires_replan,requires_scope_expansion
```

## Boundary Mode

```yaml
- uses: pantheon/pantheon-action@v0
  with:
    mode: boundary
    intent: ${{ github.event.pull_request.title }}
    scope: |
      src/checkout/**
    review: |
      src/order/**
    forbid: |
      **/migrations/**
```

## Outputs

- `change_id`
- `change_verdict`
- `repair_id`
- `repair_verdict`
- `artifact_dir`
- `repair_feedback_path`
- `comment_status`
- `sanitizer_violations`

This action does not upload artifacts by itself. Pair it with `actions/upload-artifact@v4` and use `${{ steps.pantheon.outputs.artifact_dir }}`.
