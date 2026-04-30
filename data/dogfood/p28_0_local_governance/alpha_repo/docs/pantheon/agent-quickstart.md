# Pantheon Agent Quickstart

If you discover a bug, do not patch immediately.

Create a bug report first:

.pantheon/repair/inbox/agent_bug_report.json

Then run:

npx pantheon-alpha repair intake --from .pantheon/repair/inbox/agent_bug_report.json
npx pantheon-alpha repair plan --repair-id <repair_id>
npx pantheon-alpha repair check --repair-id <repair_id>

If Pantheon returns `requires_review`, stop modifying review-required files and run:

npx pantheon-alpha review list
npx pantheon-alpha review show --repair-id <repair_id>
