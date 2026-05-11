# Pantheon Agent Quickstart

Read `AGENTS.md` first.

If you discover a bug, do not patch immediately.

Create:

`.pantheon/repair/inbox/agent_bug_report.json`

Start intake:

`node dist/src/cli/pantheon-alpha.js repair intake --from .pantheon/repair/inbox/agent_bug_report.json`

Capture the `repair_id`, then run:

`node dist/src/cli/pantheon-alpha.js repair plan --repair-id <repair_id>`

Read:

`.pantheon/repair/runs/<repair_id>/repair_task.md`

Patch only allowed files, then run:

`node dist/src/cli/pantheon-alpha.js repair check --repair-id <repair_id>`

If Pantheon returns `requires_review`, stop and inspect:

- `node dist/src/cli/pantheon-alpha.js review list`
- `node dist/src/cli/pantheon-alpha.js review show --target-type repair --target-id <repair_id>`
