# GitHub Quickstart

## Purpose

Use Pantheon repair mode in a pull request to verify that a bug fix stayed inside an approved repair contract.

## Main workflow

1. Create or load a repair session.
2. Generate a repair plan for the current repository state.
3. Open or update a pull request.
4. Run the Pantheon repair action in `mode: repair`.
5. Read the PR comment, step summary, review request artifact, and public artifacts.

## Recommended workflow

Use the repair-id path as the primary entrypoint:

```yaml
- uses: ./action
  id: pantheon
  with:
    mode: repair
    repair_id: repair_abc123
    artifact_mode: public
    post_comment: true
    fail_on: fail,requires_replan,requires_scope_expansion
```

Then upload the stable artifact directory:

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: pantheon-repair-report
    path: ${{ steps.pantheon.outputs.artifact_dir }}
```

The uploaded directory includes:

- `repair_report.md`
- `repair_feedback.md`
- `review_request.md` when human attention is required
- `artifact_manifest.json`
