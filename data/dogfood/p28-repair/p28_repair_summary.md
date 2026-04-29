# P28 Dogfood Summary

**Generated:** 2026-04-29T04:05:28.694Z

## Variant Results

| Case | Variant | Verdict | Expected | Match |
|------|---------|---------|----------|-------|
| httpx-sdk | allowed | pass | pass | ✓ |
| httpx-sdk | review | requires_review | requires_review | ✓ |
| httpx-sdk | forbidden | fail | fail | ✓ |
| httpx-sdk | outside | requires_scope_expansion | requires_scope_expansion | ✓ |
| fastapi-service | allowed | pass | pass | ✓ |
| fastapi-service | review | requires_review | requires_review | ✓ |
| fastapi-service | forbidden | fail | fail | ✓ |
| fastapi-service | outside | requires_scope_expansion | requires_scope_expansion | ✓ |
| saleor-commerce | allowed | requires_review | requires_review | ✓ |
| saleor-commerce | review | requires_review | requires_review | ✓ |
| saleor-commerce | forbidden | fail | fail | ✓ |
| saleor-commerce | outside | requires_scope_expansion | requires_scope_expansion | ✓ |

**Verdict pass rate:** 12/12

## Audit Results

| Case | Audit | Status | Expected | Rev | Match |
|------|-------|--------|----------|-----|-------|
| httpx-sdk | approve_plan | approved_repair_plan | approved_repair_plan | 2 | ✓ |
| httpx-sdk | add_forbid | approved_with_modifications | approved_with_modifications | 3 | ✓ |
| fastapi-service | approve_plan | approved_repair_plan | approved_repair_plan | 2 | ✓ |
| fastapi-service | restrict_config | approved_with_modifications | approved_with_modifications | 3 | ✓ |
| saleor-commerce | approve_plan | approved_repair_plan | approved_repair_plan | 2 | ✓ |
| saleor-commerce | add_review_order_tax | approved_with_modifications | approved_with_modifications | 3 | ✓ |

**Audit pass rate:** 6/6

## Variant Details

### httpx-sdk / allowed
- **Verdict:** pass (expected pass) ✓
- **Changed files:** tests/test_auth.py
- **Summary:** allowed=1, review=0, forbidden=0, outside=0, warnings=0

### httpx-sdk / review
- **Verdict:** requires_review (expected requires_review) ✓
- **Changed files:** httpx/_auth.py
- **Summary:** allowed=0, review=1, forbidden=0, outside=0, warnings=1

### httpx-sdk / forbidden
- **Verdict:** fail (expected fail) ✓
- **Changed files:** .pantheon/tmp/secret.py
- **Summary:** allowed=0, review=0, forbidden=1, outside=0, warnings=1

### httpx-sdk / outside
- **Verdict:** requires_scope_expansion (expected requires_scope_expansion) ✓
- **Changed files:** README.md
- **Summary:** allowed=0, review=0, forbidden=0, outside=1, warnings=1

### fastapi-service / allowed
- **Verdict:** pass (expected pass) ✓
- **Changed files:** app/api/routes/articles.py
- **Summary:** allowed=1, review=0, forbidden=0, outside=0, warnings=1

### fastapi-service / review
- **Verdict:** requires_review (expected requires_review) ✓
- **Changed files:** app/core/security.py
- **Summary:** allowed=0, review=1, forbidden=0, outside=0, warnings=1

### fastapi-service / forbidden
- **Verdict:** fail (expected fail) ✓
- **Changed files:** app/api/routes/articles.py, alembic/env.py
- **Summary:** allowed=1, review=0, forbidden=1, outside=0, warnings=1

### fastapi-service / outside
- **Verdict:** requires_scope_expansion (expected requires_scope_expansion) ✓
- **Changed files:** app/api/routes/articles.py, README.md
- **Summary:** allowed=1, review=0, forbidden=0, outside=1, warnings=1

### saleor-commerce / allowed
- **Verdict:** requires_review (expected requires_review) ✓
- **Changed files:** saleor/checkout/calculations.py
- **Summary:** allowed=0, review=1, forbidden=0, outside=0, warnings=1

### saleor-commerce / review
- **Verdict:** requires_review (expected requires_review) ✓
- **Changed files:** saleor/checkout/calculations.py, saleor/order/actions.py
- **Summary:** allowed=0, review=2, forbidden=0, outside=0, warnings=1

### saleor-commerce / forbidden
- **Verdict:** fail (expected fail) ✓
- **Changed files:** saleor/checkout/calculations.py, saleor/payment/gateway.py
- **Summary:** allowed=0, review=1, forbidden=1, outside=0, warnings=1

### saleor-commerce / outside
- **Verdict:** requires_scope_expansion (expected requires_scope_expansion) ✓
- **Changed files:** saleor/checkout/calculations.py, README.md
- **Summary:** allowed=0, review=1, forbidden=0, outside=1, warnings=1

## Audit Details

### httpx-sdk / approve_plan
- **Status:** approved_repair_plan (expected approved_repair_plan) ✓
- **Revision:** 2
- **Forbidden:** 4, Review: 15

### httpx-sdk / add_forbid
- **Status:** approved_with_modifications (expected approved_with_modifications) ✓
- **Revision:** 3
- **Forbidden:** 5, Review: 13

### fastapi-service / approve_plan
- **Status:** approved_repair_plan (expected approved_repair_plan) ✓
- **Revision:** 2
- **Forbidden:** 9, Review: 7

### fastapi-service / restrict_config
- **Status:** approved_with_modifications (expected approved_with_modifications) ✓
- **Revision:** 3
- **Forbidden:** 10, Review: 6

### saleor-commerce / approve_plan
- **Status:** approved_repair_plan (expected approved_repair_plan) ✓
- **Revision:** 2
- **Forbidden:** 246, Review: 10

### saleor-commerce / add_review_order_tax
- **Status:** approved_with_modifications (expected approved_with_modifications) ✓
- **Revision:** 3
- **Forbidden:** 246, Review: 11

---

_Auto-generated by P28-5 dogfood._
