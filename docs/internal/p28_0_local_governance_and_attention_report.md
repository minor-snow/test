# P28-0 — Local Governance And Human Attention Report

## Purpose

P28-0 closes the gap between an agent-installable alpha harness and a repo that is genuinely usable by agents and humans in daily work.

It adds three things:

1. Command surface consistency for `pantheon-alpha`
2. A local append-only governance ledger
3. A human attention layer through review requests, review queue, and daily metrics

## What P28-0 Adds

### Agent command surface consistency

`pantheon-alpha` now exposes the same repair commands that agent-facing docs reference:

- `npx pantheon-alpha repair intake`
- `npx pantheon-alpha repair plan`
- `npx pantheon-alpha repair check`
- `npx pantheon-alpha review list`
- `npx pantheon-alpha review show --repair-id <repair_id>`
- `npx pantheon-alpha metrics daily`
- `npx pantheon-alpha metrics status`

Generated alpha docs and machine-readable agent metadata are tested against the real CLI command surface.

### Local governance ledger

Pantheon now records local governance events under:

`./.pantheon/governance/events.jsonl`

The ledger is append-only and stores:

- event type
- repair id
- contract revision
- verdict
- attention level
- bucket counts
- sanitized reason kinds

It does not store:

- source code content
- diff hunks
- raw patches
- debug traces

### Human attention layer

Pantheon now materializes non-pass repair outcomes into local review requests:

- `./.pantheon/reviews/review_requests/review_<repair_id>.json`
- `./.pantheon/reviews/review_requests/review_<repair_id>.md`
- `./.pantheon/reviews/review_queue.json`

This makes `requires_review`, `requires_scope_expansion`, `requires_replan`, and `fail` visible as explicit human work items instead of buried CLI output.

### Daily local metrics

Pantheon can now generate local governance reports under:

- `./.pantheon/metrics/daily/YYYY-MM-DD.json`
- `./.pantheon/metrics/daily/YYYY-MM-DD.md`

The report summarizes:

- repair checks
- verdict counts
- intercept reasons
- open review requests
- common review areas

Path anonymization is supported through `pantheon.alpha.json`.

### GitHub attention integration

Repair-mode PR comments now include explicit attention blocks:

- `Human review required`
- `Blocked`
- `Agent next steps`

Public repair artifacts now include `review_request.md` when Pantheon requires human attention.

## Privacy Guarantees

P28-0 keeps metrics and review surfaces local by default.

Governance events and daily reports are sanitized before writing. They may contain repo-relative paths, verdicts, buckets, and counts, but they do not include code content or diff hunks.

## What P28-0 Proves

1. Agent-facing CLI commands and docs can stay in sync through tests.
2. Pantheon governance outcomes can be recorded locally without a cloud service.
3. `requires_review` is a visible human attention state, not an invisible soft warning.
4. Blocking repair outcomes now carry explicit next actions.
5. GitHub repair comments can guide both humans and agents after a verdict.

## What P28-0 Does Not Prove

1. Slack, email, or IDE real-time notification flows
2. Cloud dashboards
3. Cross-repo organization analytics
4. Enterprise permissioning
5. Patch semantic correctness

## Notes

GitHub PR labels remain intentionally deferred in this phase. P28-0 establishes the local and PR-visible attention surfaces first through:

- review requests
- review queue
- governance events
- daily metrics
- PR comment attention blocks

This keeps the phase focused on deterministic local value visibility rather than expanding the notification surface area.
