# Pantheon Hosted Verification Entry

This public repository is the hosted verification entry for the Pantheon GitHub Action.

It exists to exercise the real pull-request governance flow in GitHub-hosted Actions:

- Standard / Contract Gate
- Change Governance
- Repair Governance
- Architecture self-authorization protection

The workflows in `.github/workflows/` map trusted scenario branches to fixed action inputs.
PR-authored changes do not decide the action mode or the contract identifiers used for evaluation.

By default, the hosted matrix validates Pantheon's minimal-disclosure pull request surface:

- verdict
- reason kinds
- next local command

Detailed governance evidence remains local unless a dedicated full-disclosure scenario branch opts into richer sanitized output.
