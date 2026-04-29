# AGENTS.md

You are working in a sample-service repository governed by Pantheon repair protocol.

## Core rule

If you discover a bug, do not edit code immediately.
First create a structured bug report.

## Repair protocol

1. Create `.pantheon/repair/inbox/agent_bug_report.json`.
2. Run: `node pantheon/dist/src/cli/pantheon.js repair intake --from .pantheon/repair/inbox/agent_bug_report.json`
3. Capture the `repair_id`.
4. Run: `node pantheon/dist/src/cli/pantheon.js repair plan --repair-id <repair_id> --config pantheon.json`
5. Read `repair_task.md`.
6. Only modify files inside allowed scope.
7. Do not modify forbidden files.
8. Run: `node pantheon/dist/src/cli/pantheon.js repair check --repair-id <repair_id>`
9. Follow `repair_feedback.md`.

## Do not

- Do not patch before creating a bug report.
- Do not edit forbidden files.
- Do not treat agent hypotheses as confirmed facts.
