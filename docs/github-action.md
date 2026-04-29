# Pantheon GitHub Action

Pantheon turns explicit AI coding boundaries into a GitHub PR gate.

The action runs compiled JavaScript only. It installs Pantheon's runtime dependencies with `npm ci --omit=dev` inside the action bundle before executing the compiled entrypoint.

## Quickstart

```yaml
name: Pantheon Boundary Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  pantheon:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pantheon/pantheon-action@v0
        with:
          intent: ${{ github.event.pull_request.title }}
          scope: |
            saleor/checkout/**
            saleor/graphql/checkout/**
          review: |
            saleor/tax/**
            saleor/order/**
          forbid: |
            saleor/payment/**
            saleor/account/**
            saleor/discount/**
            **/migrations/**
          fail_on: forbidden,outside_scope
          post_comment: true
          artifact_mode: public

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pantheon-report
          path: pantheon-report/
```

## Inputs

- `intent`: optional; defaults to PR title.
- `scope`: required; allowed glob patterns, one per line.
- `review`: optional; review-required glob patterns, one per line.
- `forbid`: optional; forbidden glob patterns, one per line.
- `config_path`: optional; defaults to `pantheon.json`.
- `fail_on`: optional; defaults to `forbidden,outside_scope`.
- `post_comment`: optional; defaults to `true`.
- `upload_artifacts`: optional; defaults to `true`. When `false`, the action still writes the PR comment and step summary, but does not stage public files into `pantheon-report/`.
- `artifact_mode`: `public` or `debug`, defaults to `public`.
- `comment_mode`: `update` or `off`, defaults to `update`.

## fail_on behavior

Default behavior:

- `forbidden` -> fail
- `outside_scope` -> fail
- `review_required` -> warning only

To fail on review-required findings too:

```yaml
fail_on: forbidden,outside_scope,review_required
```

## Public vs debug artifacts

Default `artifact_mode: public` writes:

- `task.md`
- `scope.md`
- `check.json`
- `report.md`
- `feedback.md`
- `python_report.md` if present

`artifact_mode: debug` writes the full `.pantheon/` directory.

Debug mode may include internal diagnostics. Do not enable on public repos unless you understand the output.

This action does not upload artifacts by itself. Pair it with `actions/upload-artifact@v4` if you want to keep the generated public outputs from the run.

## Permissions

Recommended workflow permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

If PR comment posting is not permitted, Pantheon still writes:

- `GITHUB_STEP_SUMMARY`
- `pantheon-report/` when `upload_artifacts: true`
- a correct exit code

## Recommended checkout config

Always use:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

Pantheon uses the PR base SHA and runs:

```text
pantheon check --base <base_sha>
```

This keeps PR diff semantics stable and avoids mixing in local working-tree noise.

## Large repo guidance

Use directory-level boundaries instead of huge file lists:

```yaml
scope: |
  saleor/checkout/**
  saleor/graphql/checkout/**
review: |
  saleor/tax/**
  saleor/order/**
forbid: |
  saleor/payment/**
  **/migrations/**
```

## Troubleshooting

- `scope is required`: ensure `scope:` contains at least one non-empty line.
- No PR comment posted: confirm `pull-requests: write` permission and `post_comment: true`.
- Unexpected diff behavior: verify `fetch-depth: 0` and that the workflow runs on `pull_request`.
- Missing artifacts: set `upload_artifacts: true` and upload `pantheon-report/` using `actions/upload-artifact`.
