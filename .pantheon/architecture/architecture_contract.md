# Architecture Contract

Contract ID: archc_e46351768e6f2dc4
Source: arch_755cbc3be3b419c4
Revision: 1
Contract Hash: sha256:6e66a33ebc713b5f4ddea0195fc398138f57fcab81a6a6ca2ece9d1cd218b700

## Summary

- Accepted relations: 2
- Active constraints: 2
- Rejected claims: 0
- Unresolved claims: 4

## Global Constraints

These constraints apply to ALL changes, regardless of target.

### 🟡 Auth
Type: review_required_path | Severity: review
Paths: src/auth/login.ts

### 🔴 Billing
Type: forbidden_path | Severity: blocking
Paths: src/payment/billing.ts

## Accepted Relations

| Subject | Relation | Object | Paths | Confidence |
|---------|----------|--------|-------|------------|
| Auth | review_required_for | src/auth/login.ts | src/auth/login.ts | high |
| Billing | forbidden_change | src/payment/billing.ts | src/payment/billing.ts | high |

## Limitations

- Architecture contracts are governance constraints derived from reviewed documentation and repository evidence.
- They do not prove semantic correctness or complete dependency structure.
- Unreviewed claims are advisory only and do not affect verdicts.
- must_not_depend_on enforcement is path-pattern based; no full import/call graph analysis.
- Contextual ownership constraints only apply when the change/repair target matches the owning module.
