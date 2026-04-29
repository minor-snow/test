<!-- pantheon-repair-gate-v0 -->
# Pantheon Repair Gate

## Verdict

`pass`

Pantheon checked whether this PR stayed inside the approved repair scope.

## Repair session

- Repair ID: `repair_d1ee0718c948`
- Source: `existing_repair_id`
- Audit status: `approved_repair_plan`
- Contract revision: `v2`
- Evidence level: `bootstrap_conservative`
- Plan base: `662ce24b4e71ac00e2533131194a745cbd22b1f7`
- PR base: `662ce24b4e71ac00e2533131194a745cbd22b1f7`

## Bug report

### Confirmed facts

- src/utils/format.ts exists
- tests/utils/format.test.ts exists

## Repair relation graph

This is an evidence-based candidate graph, not a complete dependency graph or call graph.

- `src/utils/format.ts` -> `saleor/checkout/calculations.py` (risk_preset, low)
- `src/utils/format.ts` -> `saleor/checkout/tests/test_calculations.py` (risk_preset, low)
- `src/utils/format.ts` -> `saleor/order/models.py` (risk_preset, low)
- `src/utils/format.ts` -> `saleor/payment/gateway.py` (risk_preset, medium)
- `src/utils/format.ts` -> `src/auth/login.ts` (risk_preset, low)
- `src/utils/format.ts` -> `src/payment/billing.ts` (risk_preset, medium)
- `src/utils/format.ts` -> `src/utils/format.ts` (explicit_user_reference, high)
- `src/utils/format.ts` -> `test/auth/login.test.ts` (risk_preset, low)
- `src/utils/format.ts` -> `test/payment/billing.test.ts` (risk_preset, medium)
- `tests/utils/format.test.ts` -> `src/utils/format.ts` (test_mapping, high)

## Changed files

| File | Bucket | Result |
|---|---|---|
| `src/utils/format.ts` | allowed | ok |

## Repair scope

### Allowed

- `src/utils/format.ts`
- `tests/utils/format.test.ts`

### Review required

- `**/auth/**`
- `**/checkout/**`
- `**/order/**`
- `**/payment/**`
- `saleor/payment/gateway.py`
- `src/auth/login.ts`
- `src/payment/billing.ts`

### Forbidden

- `.cursor/**`
- `.git/**`
- `.pantheon/**`
- `node_modules/**`

## Agent next steps

- Add or run the related tests listed in the repair artifacts.
- Keep review-required files for human review.

## Artifacts

- `repair_task.md`
- `repair_report.md`
- `repair_feedback.md`
- `artifact_manifest.json`
