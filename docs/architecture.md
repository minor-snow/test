# Hosted Architecture Contract

## Modules

- `Utils` owns `src/utils/**`
- `Auth` owns `src/auth/**`
- `Billing` owns `src/payment/**`

## Governance Rules

- `Utils` changes are generally allowed.
- `Auth` changes require human review.
- `Billing` changes are forbidden unless the architecture contract is explicitly changed and approved.
