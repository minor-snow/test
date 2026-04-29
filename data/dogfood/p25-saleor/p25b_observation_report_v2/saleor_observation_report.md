# Saleor Observation Report v2

## Executive Summary

Saleor is **ready for explicit-scope governance** and **not ready for automatic intent-to-scope inference**.

- Pantheon can already govern Saleor changes when a human or team provides an authorized directory/file scope.
- Pantheon does not claim full Python runtime understanding; observations remain syntax-level and file/path-level.
- This report is repo-wide evidence for boundary proposals, synthetic PR checks, and future agent trials.

## Repo Scale

| Metric | Value |
|---|---|
| Repo label | salary |
| Observed files | 4579 |
| Python files | 4251 |
| Scan time | 569ms |
| Python enhancement time | 470ms |

| Python bucket | Count |
|---|---|
| config | 4 |
| migration | 1420 |
| script | 1 |
| source | 1142 |
| test | 1684 |

## Python Observation Summary

| Signal | Baseline Smoke Scan | Current Sidecar |
|---|---|---|
| Observed files | 4573 | 4579 |
| Import observations | 0 | 12610 |
| Test mappings | 0 | 977 |
| Sensitive paths / zones | 0 | 14 |
| Unknown bucket files | 4457 | 1* |

* Current unknown count is the Python sidecar taxonomy, not the raw generic scanner bucket count. Baseline numbers are from the first generic Saleor smoke scan before the Python sidecar existed.

## Sensitive Zone Map

| Category | Severity | Files | Source | Pattern |
|---|---|---|---|---|
| financial_transactions | critical | 339 | keyword | `**/payment/**` |
| schema_migration | high | 1425 | keyword | `**/migration/**` |
| order_lifecycle | high | 689 | keyword | `**/order/**` |
| purchase_flow | high | 412 | keyword | `**/checkout/**` |
| identity | high | 325 | keyword | `**/account/**` |
| authentication | high | 55 | keyword | `**/auth/**` |
| authorization | high | 38 | keyword | `**/permission/**` |
| administration | high | 10 | keyword | `**/admin/**` |
| security | high | 3 | keyword | `**/security/**` |
| pricing_adjustment | medium | 354 | keyword | `**/discount/**` |
| external_integration | medium | 266 | keyword | `**/webhook/**` |
| runtime_extension | medium | 144 | keyword | `**/plugin/**` |
| regulatory_calculation | medium | 133 | keyword | `**/tax/**` |
| infrastructure_config | medium | 48 | keyword | `**/settings/**` |

## High-Risk Saleor Domains

| Domain | Pattern | Risk | Files | Source | Tests | Project Imports | Governance Recommendation |
|---|---|---|---|---|---|---|---|
| checkout | `saleor/checkout/**` | purchase flow / pricing behavior | 184 | 22 | 40 | 1 | explicit-scope candidate |
| payment | `saleor/payment/**` | financial transactions | 151 | 29 | 33 | 0 | protected |
| order | `saleor/order/**` | order lifecycle | 345 | 18 | 39 | 0 | review required |
| account | `saleor/account/**` | identity / user state | 149 | 22 | 9 | 0 | protected |
| discount | `saleor/discount/**` | pricing adjustment | 144 | 13 | 23 | 1 | review required |
| tax | `saleor/tax/**` | regulatory / financial calculation | 35 | 10 | 11 | 0 | review required |
| plugins | `saleor/plugins/**` | runtime extension behavior | 120 | 34 | 74 | 4 | protected |
| graphql | `saleor/graphql/**` | public API surface | 1521 | 694 | 827 | 3 | review required |
| core | `saleor/core/**` | shared infrastructure | 152 | 89 | 51 | 3 | review required |

## Test Mapping Coverage

| Metric | Value |
|---|---|
| Total mappings | 977 |
| High-confidence mappings | 120 |
| Medium-confidence mappings | 120 |
| Low-confidence mappings | 737 |
| Unknown mappings | 0 |
| Mapped source ratio | 21.0% |

## Dependency / Import Observation Summary

| Metric | Value |
|---|---|
| Import observations | 12610 |
| Project imports | 16 |
| Declared packages | 1967 |
| Undeclared packages | 187 |
| Dynamic/unresolved imports | 0 |
| Dependency manifests | 2 |
| Low-confidence manifests | 1 |

## Unknown Taxonomy

| Classification | Count |
|---|---|
| actionable | 1 |
| intrinsic | 0 |

| Category | Classification | Count | Note |
|---|---|---|---|
| low_confidence_manifest | actionable | 1 | Dependency manifests parsed with low confidence. Package declarations may be incomplete. |

## Suggested Protected Zones

- `saleor/payment/**`
- `saleor/account/**`
- `saleor/plugins/**`
- `migrations/**`

## Suggested Review-Required Zones

- `saleor/order/**`
- `saleor/tax/**`
- `saleor/discount/**`
- `saleor/graphql/**`
- `saleor/core/**`

## Boundary Readiness

- **Explicit-scope governance:** `ready_for_explicit_scope`
- **Automatic intent-to-scope inference:** `not_ready_for_auto_scope`

- Observed 8/8 key Saleor domains with file/path-level signals.
- Project import observations are present (16), which is enough for conservative cross-module awareness.
- Test mapping candidates are present (977), so scoped changes can be paired with verification guidance.
- Automatic intent-to-scope inference remains out of scope because import observations are syntax-level only and scope granularity is file/path-level.

Scope granularity in P25 is file/path-level. Function-level and semantic delta constraints are future work.

## Recommended Trial Scenario

**Intent:** Add an eco-packaging fee during checkout for selected product types.

Allowed candidate scope:
- `saleor/checkout/**`
- `saleor/graphql/checkout/**`

Review-required candidate scope:
- `saleor/order/**`
- `saleor/tax/**`
- `tests/integration/**`

Forbidden / protected candidate scope:
- `saleor/payment/**`
- `saleor/account/**`
- `saleor/discount/**`
- `saleor/plugins/**`
- `migrations/**`
- `saleor/core/settings.py`
- `.pantheon/**`
- `.cursor/**`
- `.git/**`

This trial exercises checkout logic while keeping financial, identity, plugin, and migration surfaces protected.

## Limitations

- Python import observations are syntax-level observations, not full runtime import resolution.
- Scope granularity in P25 is file/path-level. Function-level scope is future work.
- pyproject.toml parsing uses regex-based extraction, not a full TOML parser.
- Dynamic imports (__import__, importlib) cannot be statically analyzed.
- Namespace packages without __init__.py are not detected as project packages.

---

_This report is derived from conservative Python observations. It is evidence for explicit-scope governance, not full Python runtime understanding._