# Repair ID Flow

## Why repair_id exists

Pantheon repair governance is session-based.

Every repair flow must stay inside its own `repair_id`.

## Main sequence

1. Submit a bug report.
2. Run `repair intake`.
3. Capture the created `repair_id`.
4. Run `repair plan --repair-id <repair_id>`.
5. Run `repair check --repair-id <repair_id>`.

## Hard rules

- `latest` is convenience only.
- Audit and check must target `repair_id`.
- Human audit decisions must target the current revision.
- Stale plans must be replanned instead of silently reused.
