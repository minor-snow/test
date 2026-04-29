# Pantheon Boundary Check

Verdict: `requires_reverse_issue`

| Diff | Value |
|---|---|
| Base | `cf9b59513d0a` |
| Head | `cf9b59513d0a` |

| Category | Count |
|---|---:|
| In allowed scope | 0 |
| Review required | 0 |
| Forbidden | 1 |
| Outside scope | 1 |

Blocking boundary violations detected.

- `saleor/checkout/migrations/9999_auto_eco_fee.py` - outside authorized scope
- `saleor/discount/models.py` - forbidden boundary

See `pantheon-report/` for generated artifacts.