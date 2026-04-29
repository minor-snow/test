# Python Governance Report

**Repo:** saleor_worktree
**Intent:** Add eco-packaging fee
**Python files observed:** 4248
**Authorized scope:** 235 files

## Risk Summary

| Metric | Value |
|---|---|
| Sensitive zones in scope | 8 |
| Sensitive files in scope | 235 |
| Highest severity in scope | critical |
| Source files with test mapping | 36 / 76 |
| High-confidence test mappings | 15 |
| Medium-confidence test mappings | 21 |

## Sensitive Zones in Scope

These areas of the authorized scope are flagged as high-risk:

### 🔴 financial_transactions (critical)

- **Files in scope:** 8
- **Source:** keyword detection

  - `saleor/checkout/payment_utils.py`
  - `saleor/checkout/tests/fixtures/checkout_with_payment.py`
  - `saleor/checkout/tests/test_payment_utils.py`
  - `saleor/graphql/checkout/tests/mutations/test_checkout_complete_with_payment.py`
  - `saleor/graphql/checkout/mutations/checkout_billing_address_update.py`
  - `saleor/graphql/checkout/tests/deprecated/test_checkout_billing_address_update.py`
  - `saleor/graphql/checkout/tests/mutations/test_checkout_billing_address_update.py`
  - `saleor/order/tests/test_order_actions_refund_products.py`

### 🟠 purchase_flow (high)

- **Files in scope:** 159
- **Source:** keyword detection

  - `saleor/checkout/**` (62 files)
  - `saleor/graphql/**` (95 files)
  - `saleor/tax/**` (2 files)

### 🟠 order_lifecycle (high)

- **Files in scope:** 64
- **Source:** keyword detection

  - `saleor/checkout/**` (1 files)
  - `saleor/graphql/**` (4 files)
  - `saleor/order/**` (57 files)
  - `saleor/tax/**` (2 files)

### 🟠 identity (high)

- **Files in scope:** 1
- **Source:** keyword detection

  - `saleor/checkout/tests/test_associate_checkout_with_account.py`

### 🟠 schema_migration (high)

- **Files in scope:** 1
- **Source:** keyword detection

  - `saleor/checkout/tests/test_migrations_tasks.py`

### 🟡 pricing_adjustment (medium)

- **Files in scope:** 4
- **Source:** keyword detection

  - `saleor/checkout/tests/fixtures/checkout_with_discount.py`
  - `saleor/graphql/checkout/tests/test_checkout_discount_expiration.py`
  - `saleor/order/tests/test_refresh_all_order_base_prices_and_discounts.py`
  - `saleor/order/tests/test_refresh_order_base_prices_and_discounts.py`

### 🟡 regulatory_calculation (medium)

- **Files in scope:** 30
- **Source:** keyword detection

  - `saleor/checkout/**` (4 files)
  - `saleor/order/**` (5 files)
  - `saleor/tax/**` (21 files)

### 🟡 external_integration (medium)

- **Files in scope:** 33
- **Source:** keyword detection

  - `saleor/checkout/**` (15 files)
  - `saleor/order/**` (12 files)
  - `saleor/tax/**` (6 files)

## Test Coverage

Source files in your scope and their test mappings:

| Source File | Test File | Confidence |
|---|---|---|
| `saleor/checkout/actions.py` | `saleor/checkout/tests/test_actions.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/checkout/base_calculations.py` | `saleor/checkout/tests/test_base_calculations.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/checkout/calculations.py` | `saleor/checkout/tests/test_calculations.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/checkout/delivery_context.py` | `saleor/checkout/tests/test_delivery_context.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/checkout/fetch.py` | `saleor/checkout/tests/test_fetch.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/checkout/payment_utils.py` | `saleor/checkout/tests/test_payment_utils.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/checkout/tasks.py` | `saleor/checkout/tests/test_tasks.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/checkout/utils.py` | `saleor/checkout/tests/test_utils.py`, `saleor/checkout/tests/test_checkout.py` | high |
| `saleor/graphql/checkout/utils.py` | `saleor/graphql/checkout/tests/test_utils.py`, `saleor/graphql/checkout/tests/test_checkout.py` | high |
| `saleor/order/actions.py` | `saleor/order/tests/test_actions.py`, `saleor/order/tests/test_order.py` | high |
| `saleor/order/calculations.py` | `saleor/order/tests/test_calculations.py`, `saleor/order/tests/test_order.py` | high |
| `saleor/order/fetch.py` | `saleor/order/tests/test_fetch.py`, `saleor/order/tests/test_order.py` | high |
| `saleor/order/notifications.py` | `saleor/order/tests/test_notifications.py`, `saleor/order/tests/test_order.py` | high |
| `saleor/order/tasks.py` | `saleor/order/tests/test_tasks.py`, `saleor/order/tests/test_order.py` | high |
| `saleor/tax/utils.py` | `saleor/tax/tests/test_utils.py` | high |
| `saleor/checkout/checkout_cleaner.py` | `saleor/checkout/tests/test_checkout.py` | medium |
| `saleor/checkout/complete_checkout.py` | `saleor/checkout/tests/test_checkout.py` | medium |
| `saleor/checkout/error_codes.py` | `saleor/checkout/tests/test_checkout.py` | medium |
| `saleor/checkout/lock_objects.py` | `saleor/checkout/tests/test_checkout.py` | medium |
| `saleor/checkout/models.py` | `saleor/checkout/tests/test_checkout.py` | medium |
| `saleor/checkout/problems.py` | `saleor/checkout/tests/test_checkout.py` | medium |
| `saleor/graphql/checkout/enums.py` | `saleor/graphql/checkout/tests/test_checkout.py` | medium |
| `saleor/graphql/checkout/filters.py` | `saleor/graphql/checkout/tests/test_checkout.py` | medium |
| `saleor/graphql/checkout/resolvers.py` | `saleor/graphql/checkout/tests/test_checkout.py` | medium |
| `saleor/graphql/checkout/schema.py` | `saleor/graphql/checkout/tests/test_checkout.py` | medium |
| `saleor/graphql/checkout/sorters.py` | `saleor/graphql/checkout/tests/test_checkout.py` | medium |
| `saleor/graphql/checkout/types.py` | `saleor/graphql/checkout/tests/test_checkout.py` | medium |
| `saleor/order/base_calculations.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/delivery_context.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/error_codes.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/events.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/interface.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/lock_objects.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/models.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/search.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/order/utils.py` | `saleor/order/tests/test_order.py` | medium |
| `saleor/checkout/search/indexing.py` | _no test found_ | low |
| `saleor/checkout/search/loaders.py` | _no test found_ | low |
| `saleor/checkout/webhooks/calculate_taxes.py` | _no test found_ | low |
| `saleor/checkout/webhooks/exclude_shipping.py` | _no test found_ | low |
| `saleor/checkout/webhooks/list_shipping_methods.py` | _no test found_ | low |
| `saleor/graphql/checkout/dataloaders/calculations.py` | _no test found_ | low |
| `saleor/graphql/checkout/dataloaders/checkout_delivery.py` | _no test found_ | low |
| `saleor/graphql/checkout/dataloaders/checkout_infos.py` | _no test found_ | low |
| `saleor/graphql/checkout/dataloaders/models.py` | _no test found_ | low |
| `saleor/graphql/checkout/dataloaders/problems.py` | _no test found_ | low |
| `saleor/graphql/checkout/dataloaders/promotion_rule_infos.py` | _no test found_ | low |
| `saleor/graphql/checkout/mutations/checkout_add_promo_code.py` | _no test found_ | low |
| `saleor/graphql/checkout/mutations/checkout_billing_address_update.py` | _no test found_ | low |
| `saleor/graphql/checkout/mutations/checkout_complete.py` | _no test found_ | low |
| ... | _26 more_ | |

## Dependencies

### `pyproject.toml` (high confidence)

**Packages:** `asgiref`, `authlib`, `azure_common`, `azure_storage_blob`, `azure_storage_common`, `babel`, `boto3`, `botocore`, `braintree`, `cryptography`, `dj_database_url`, `dj_email_url`, `django`, `django_cache_url`, `django_celery_beat`, `django_countries`, `django_filter`, `django_measurement`, `django_mptt`, `django_phonenumber_field` +49 more

### `setup.cfg` (low confidence)

> ⚠️ No install_requires found in setup.cfg

## Cross-Module Dependencies

Files in your scope import from these project modules:

| Module | Import Count |
|---|---|
| `saleor.checkout` | 1 |
| `saleor.webhook` | 1 |

> Changes in scope may affect or be affected by these modules.

## Actionable Unknowns

These observations could not be fully resolved:

- **Low confidence manifest** (1): Dependency manifests parsed with low confidence. Package declarations may be incomplete.

## Observation Limitations

- Python import observations are syntax-level observations, not full runtime import resolution.
- Multi-line Python import statements (from x import (
  a,
  b)) are parsed as a single observation on the module, not per-symbol.
- Scope granularity in P25 is file/path-level. Function-level scope is future work.
- pyproject.toml parsing uses regex-based extraction, not a full TOML parser.
- Dynamic imports (__import__, importlib) cannot be statically analyzed.
- Namespace packages without __init__.py are not detected as project packages.

---

_Auto-generated by Pantheon. Do not edit._