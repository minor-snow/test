# Pantheon Change Contract Lite

## Decision
- **Verdict:** pass

## Intent
Add a checkoutDelete mutation that allows customers to delete their own abandoned checkout sessions, cleaning up stale data.

## Changed Files
- `saleor/checkout/actions.py`
- `saleor/checkout/utils.py`
- `saleor/graphql/checkout/mutations/__init__.py`
- `saleor/graphql/checkout/schema.py`

## Changed File Statuses
| Path | Status | Reason |
|---|---|---|
| `saleor/checkout/actions.py` | observed | File found in observations |
| `saleor/checkout/utils.py` | observed | File found in observations |
| `saleor/graphql/checkout/mutations/__init__.py` | observed | File found in observations |
| `saleor/graphql/checkout/schema.py` | observed | File found in observations |

## Observed Scope
- **Touched buckets:** unknown

## References
- **Repo observations hash:** `sha256:a613fbe6573ef0d2ffa08c45c199dcf6425068cdba34c0773d2df692aec5d7ff`
- **Head commit:** cf9b59513d0a8c83d410eb5b176e5a55de018797
- **Repo state:** git_clean
- **Uncommitted changes:** false

---

> **Notice:** This is a bootstrap contract derived from deterministic repo observations.
> It is not a full governed ChangeContract.
> The decision is based on user-provided changed files and path-convention analysis.
