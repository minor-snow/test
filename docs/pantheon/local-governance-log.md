# Local Governance Log

Pantheon writes local governance events to:

`.pantheon/governance/events.jsonl`

These events are append-only and contain repair metadata only:

- repair id
- verdict
- attention level
- bucket counts
- review and blocking reasons

They do not include source code content or diff hunks.
