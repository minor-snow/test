# Troubleshooting

If `repair plan` fails:

- Confirm `pantheon.alpha.json` exists.
- Confirm the repair session exists under `.pantheon/repair/runs/`.

If `requires_replan` appears:

- Re-run `npx pantheon-alpha repair plan --repair-id <repair_id>`.
