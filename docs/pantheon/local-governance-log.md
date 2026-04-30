# Local Governance Log

Pantheon writes local governance events to:

`.pantheon/governance/events.jsonl`

These events are append-only and contain repair metadata only:

- repair_id
- verdict
- attention level
- bucket counts
- review/block reasons

They do not contain source code content or diff hunks.
