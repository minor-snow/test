# Agent Task 02: Submit Bug Report

1. Copy `.pantheon/repair/inbox/agent_bug_report.template.json` to `.pantheon/repair/inbox/agent_bug_report.json`.
2. Fill in evidence, suspected files, and agent hypothesis.
3. Run `node dist/src/cli/pantheon.js repair intake --from .pantheon/repair/inbox/agent_bug_report.json`.
4. Capture the returned `repair_id`.
