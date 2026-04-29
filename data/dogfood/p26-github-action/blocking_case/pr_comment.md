<!-- pantheon-boundary-check-v0 -->
## Pantheon Boundary Check [BLOCKED]

**Verdict:** `requires_reverse_issue`

| Category | Count |
|---|---:|
| In allowed scope | 0 |
| Review required | 0 |
| Forbidden | 1 |
| Outside scope | 1 |

### Blocking boundary violations

- `saleor/checkout/migrations/9999_auto_eco_fee.py`
  - Reason: outside authorized scope
  - Required action: `revert_file` or `request_reverse_issue`
- `saleor/discount/models.py`
  - Reason: forbidden boundary
  - Required action: `revert_file`

Use `feedback.md` to instruct the agent to recover.

Artifacts:
- `report.md`
- `check.json`
- `feedback.md`