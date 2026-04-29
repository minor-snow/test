# Agent Bug Report

Agents must file a structured bug report before patching code.

## Template path

`.pantheon/repair/inbox/agent_bug_report.template.json`

## Required fields

- `summary`
- `observed_behavior`
- `expected_behavior`
- `evidence`
- `suspected_files`
- `requested_action`

## Hard rules

- Agent hypothesis is not a confirmed fact.
- Evidence is required.
- Paths must be repo-relative.
- Missing or invalid references will be downgraded or rejected.
