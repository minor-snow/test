# AGENTS.md

You are working in a repository protected by Pantheon.

Pantheon is a repair governance layer for AI coding agents.

## Core rule

If you discover a bug, do not edit code immediately.

First create a structured bug report.

## Repair protocol

1. Create `.pantheon/repair/inbox/agent_bug_report.json`.
2. Run Pantheon repair intake.
3. Capture the `repair_id`.
4. Run repair plan.
5. Read `repair_task.md`.
6. Only modify files inside allowed scope.
7. Do not modify forbidden files.
8. Run repair check.
9. Follow `repair_feedback.md`.

## Commands

Run doctor:

npx pantheon-alpha doctor

Run intake:

npx pantheon-alpha repair intake --from .pantheon/repair/inbox/agent_bug_report.json

Run plan:

npx pantheon-alpha repair plan --repair-id <repair_id>

Run check:

npx pantheon-alpha repair check --repair-id <repair_id>

Review local human attention:

npx pantheon-alpha review list
npx pantheon-alpha review show --repair-id <repair_id>

Generate local governance metrics:

npx pantheon-alpha metrics daily
npx pantheon-alpha metrics status

## Do not

- Do not patch before creating a bug report.
- Do not use `latest` for correctness.
- Do not ignore `requires_replan`.
- Do not treat hypotheses as confirmed facts.
- Do not edit forbidden files.
- If Pantheon returns `requires_review`, stop modifying review-required files and wait for human approval.
