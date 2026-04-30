# AGENTS.md

You are working in the Pantheon closed-alpha repository.

Pantheon is a repair governance layer for AI coding agents.

## Core rule

If you discover a bug, do not edit code immediately.

First create a structured bug report.

## Main commands

Install:

`npm install`

Build:

`npm run build`

Typecheck:

`node ./node_modules/typescript/bin/tsc --noEmit`

Test:

`node ./node_modules/vitest/vitest.mjs run --reporter=dot`

Doctor:

`node dist/src/cli/pantheon-alpha.js doctor`

## Repair protocol

1. Create `.pantheon/repair/inbox/agent_bug_report.json`.
2. Run repair intake.
3. Capture the `repair_id`.
4. Run repair plan with that `repair_id`.
5. Read `repair_task.md`.
6. Only modify files inside allowed scope.
7. Do not modify forbidden files.
8. Run repair check.
9. Follow `repair_feedback.md`.

Commands:

- `node dist/src/cli/pantheon-alpha.js repair intake --from .pantheon/repair/inbox/agent_bug_report.json`
- `node dist/src/cli/pantheon-alpha.js repair plan --repair-id <repair_id>`
- `node dist/src/cli/pantheon-alpha.js repair check --repair-id <repair_id>`

## Human review

If Pantheon returns `requires_review`, stop modifying review-required files and wait for human approval.

Use:

- `node dist/src/cli/pantheon-alpha.js review list`
- `node dist/src/cli/pantheon-alpha.js review show --repair-id <repair_id>`
- `node dist/src/cli/pantheon-alpha.js metrics daily`
- `node dist/src/cli/pantheon-alpha.js metrics status`

## Do not

- Do not patch before creating a bug report.
- Do not use `latest` for correctness.
- Do not ignore `requires_replan`.
- Do not treat agent hypotheses as confirmed facts.
- Do not edit forbidden files.
- Do not modify generated `dist` files unless explicitly requested.
