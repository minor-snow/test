# Pantheon Agent Quickstart

Read `AGENTS.md` first.

If you discover a bug, do not patch immediately.

Create a bug report:

`.pantheon/repair/inbox/agent_bug_report.json`

Then run:

`npx pantheon-alpha repair intake --from .pantheon/repair/inbox/agent_bug_report.json`

Capture the `repair_id`, then run:

`npx pantheon-alpha repair plan --repair-id <repair_id>`

Read:

`.pantheon/repair/runs/<repair_id>/repair_task.md`

After patching allowed files only, run:

`npx pantheon-alpha repair check --repair-id <repair_id>`

If Pantheon returns `requires_review`, stop and inspect:

`npx pantheon-alpha review list`

`npx pantheon-alpha review show --repair-id <repair_id>`
