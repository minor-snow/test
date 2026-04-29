# Pantheon GitHub Action

Pantheon checks whether an AI-generated PR stayed inside the boundaries you defined.

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
            **/migrations/**

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pantheon-report
          path: pantheon-report/
```

Pantheon will:

- allow changes in `scope`
- flag changes in `review`
- block changes in `forbid`
- post a PR comment with the result
- write `pantheon-report/` for optional artifact upload

This action does not upload artifacts by itself. Pair it with `actions/upload-artifact@v4` if you want to keep the generated public outputs from the run.

The action executes compiled JavaScript only. It installs Pantheon's runtime dependencies with `npm ci --omit=dev` inside the action bundle before running the compiled entrypoint.
