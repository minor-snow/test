# Pantheon on Saleor: Governing AI Changes in a Production-Scale Python/Django Commerce Backend

## Executive Summary

Pantheon is an AI agent boundary guard that prevents coding agents from making unauthorized changes to critical areas of a codebase. This report documents how Pantheon governs AI-driven modifications on **Saleor** — a production-scale, open-source Python/Django e-commerce platform with 4,248 Python files, 16 sensitive zones, and complex cross-module dependencies.

**Key finding**: Pantheon can observe, classify, scope, enforce, and recover from boundary violations on a real, complex Python/Django repository — without requiring full runtime understanding of Python semantics.

### Results at a Glance

| Capability | Evidence |
|---|---|
| Python file observation | 4,248 files classified (100%) |
| Sensitive zone detection | 16 zones across 9 risk categories |
| Import analysis | 12,610 observations, 977 test mappings |
| 3-tier boundary enforcement | allowed / review-required / forbidden |
| Real git diff violation detection | forbidden file caught in `check.json` |
| Structured feedback recovery | `requires_reverse_issue` → `requires_review` in 1 retry |
| Scanner contamination | 0 (Python runs as sidecar, core scanner untouched) |
| External dependencies added | 0 (no TOML parser, no AST library) |

---

## 1. Why Saleor Is Hard

Saleor is not a toy project. It is a production e-commerce backend used by real businesses:

- **4,581 total files** (4,248 `.py`)
- **Django ORM** with complex model inheritance and signal handlers
- **GraphQL API** spanning 1,521 files — the largest single module
- **1,425 migration files** that must never be auto-modified
- **Cross-cutting concerns**: checkout touches payment, tax, order, discount, and plugins
- **Dynamic Python**: `__import__`, `importlib`, metaclass registration, signal handlers

A naive AI agent given "Add an eco-packaging fee to checkout" could easily drift into payment gateway logic, tax calculation internals, or migration files — all of which would be catastrophic in production.

## 2. What Pantheon Does on Saleor

### Conservative Python Observation (P25a)

Pantheon does **not** claim to understand Python runtime semantics. Instead, it runs a conservative, syntax-level observation pass as a sidecar to the language-agnostic core scanner:

- **File classification**: Every `.py` file is bucketed as `source`, `test`, `config`, `migration`, `generated`, or `unknown`.
- **Import observation**: `import X` and `from X import Y` are parsed at syntax level. Multi-line imports are pre-joined. Dynamic imports are flagged as low-confidence.
- **Dependency extraction**: `pyproject.toml`, `setup.cfg`, and `setup.py` are parsed with regex (no TOML library). Warnings are emitted for low-confidence extractions.
- **Test mapping**: Source files are paired with candidate test files using naming conventions (`test_X.py`, `X_test.py`).
- **Sensitive zone detection**: Path patterns like `**/payment/**`, `**/migration/**`, `**/auth/**` trigger severity-tagged zones.

All observations go into `.pantheon/internal/python_observations.json` — never into the core scanner output.

### Sensitive Zone Map

Pantheon identifies 16 sensitive zones across Saleor:

| Zone | Severity | Files | Governance |
|---|---|---|---|
| financial_transactions | 🔴 critical | 339 | protected |
| schema_migration | 🟠 high | 1,425 | protected |
| order_lifecycle | 🟠 high | 689 | review-required |
| purchase_flow | 🟠 high | 412 | explicit scope |
| identity | 🟠 high | 325 | protected |
| authentication | 🟠 high | 55 | protected |
| authorization | 🟠 high | 38 | protected |
| administration | 🟠 high | 10 | protected |
| security | 🟠 high | 3 | protected |
| pricing_adjustment | 🟡 medium | 354 | review-required |
| external_integration | 🟡 medium | 266 | review-required |
| runtime_extension | 🟡 medium | 144 | protected |
| regulatory_calculation | 🟡 medium | 133 | review-required |
| infrastructure_config | 🟡 medium | 48 | review-required |
| pricing_logic | 🟠 high | (config) | protected |
| payment_gateway_integration | 🟠 high | (config) | protected |

### Scope-Aware Governance Report (P25b)

When `pantheon guard` runs on a Python-heavy repo, the generated artifacts automatically include Python governance signals:

- **task.md** gains `⚠️ Sensitive zones in your scope` before the allowed file list, ensuring the agent sees risk context first.
- **scope.md** gains a sensitive zone table and test coverage stats.
- **python_report.md** provides a full scope-aware governance report with risk summary, test coverage table, dependency audit, and cross-module dependency graph.

All reports are **scope-aware**: they only show signals relevant to the authorized change boundary, not the entire repo.

## 3. Boundary Proposal: Eco-Packaging Fee

For the trial scenario "Add an eco-packaging fee during checkout for selected product types", Pantheon establishes a 3-tier boundary:

### Allowed (157 files)
```
saleor/checkout/**
saleor/graphql/checkout/**
```

### Review-Required (78 files)
```
saleor/tax/**
saleor/order/**
```

### Forbidden (13 patterns)
```
saleor/payment/**
saleor/account/**
saleor/discount/**
saleor/plugins/**
saleor/core/settings.py
**/migrations/**
```

This boundary communicates a clear product judgment:

- Checkout logic is the agent's workspace.
- Tax and order modules may be affected — changes require human review.
- Payment, identity, plugins, settings, and migrations are off-limits.

## 4. Violation Detection (P25d)

Using a `git worktree` for isolation, a synthetic PR modifies files across all three tiers:

| File | Tier | Expected Result |
|---|---|---|
| `saleor/checkout/models.py` | Allowed | ✅ No violation |
| `saleor/tax/models.py` | Review-required | ⚠️ Review flag |
| `saleor/payment/gateway.py` | Forbidden | 🚫 Blocking violation |

`pantheon check` produces:

```json
{
  "verdict": "requires_reverse_issue",
  "findings": [
    {
      "kind": "forbidden_file_modified",
      "severity": "reverse_issue_required",
      "file": "saleor/payment/gateway.py",
      "allowed_actions": ["revert_file"]
    },
    {
      "kind": "outside_scope_file",
      "severity": "reverse_issue_required",
      "file": "saleor/tax/models.py",
      "allowed_actions": ["revert_file", "request_reverse_issue"]
    }
  ]
}
```

The allowed file (`checkout/models.py`) does not appear in findings — it is within the authorized scope.

## 5. Feedback Recovery (P25e)

The structured `check.json` findings drive a deterministic recovery loop:

1. Read `check.json.findings[*].allowed_actions` (not `feedback.md` text).
2. Revert only files with `revert_file` in blocking findings.
3. Re-run `pantheon check`.

### Recovery Result

```
attempt_1: requires_reverse_issue (blocking: 1, total: 2)
recovery:  reverted saleor/payment/gateway.py
attempt_2: requires_review        (blocking: 0, review: 1)
```

| Assertion | Result |
|---|---|
| Verdict improved | ✅ `requires_reverse_issue` → `requires_review` |
| All blocking findings cleared | ✅ 0 blocking |
| Forbidden file absent from findings | ✅ |
| Allowed file preserved | ✅ `checkout/models.py` still modified |
| Review file retained | ✅ `tax/models.py` still flagged for review |
| Attempt history tracks both | ✅ 2 entries |

**Pantheon can clear blocking boundary violations without discarding valid work.**

## 6. Evidence Chain

```
P25a   Python observation sidecar
       4,248 files • 12,610 imports • 977 test mappings • 16 sensitive zones

P25a.1 Guard integration
       Auto-detect Python repos • Config overrides • Multiline imports

P25b   Scope-aware governance report
       task.md warnings • scope.md risk table • python_report.md

P25c   Formal 3-tier boundary proposal
       allowed: 157 • review: 78 • forbidden: 13 patterns

P25d   Synthetic PR violation detection
       checkout ✅ • tax ⚠️ • payment 🚫 • git worktree isolation

P25e   Structured feedback recovery
       requires_reverse_issue → requires_review • 1 retry
```

## 7. Limitations

Pantheon is honest about what it cannot do on Python/Django:

1. **Syntax-level only**: Import observations are not full runtime resolution. `__import__()`, `importlib`, and metaclass-driven registration are flagged as low-confidence.
2. **File/path-level scope**: Pantheon cannot scope at the function or class level. A file-level boundary is the honest granularity.
3. **No TOML parser**: `pyproject.toml` extraction is regex-based. Complex TOML expressions may be missed.
4. **No Django model graph**: Pantheon does not understand Django ORM relationships, signal handlers, or migration dependency chains.
5. **No automatic intent-to-scope inference**: The human must provide the boundary. Pantheon enforces it — it does not guess it.

## 8. Conclusions

1. Pantheon can govern AI changes on production-scale Python/Django repositories.
2. Conservative, syntax-level observation is sufficient for file/path-level governance.
3. The 3-tier boundary model (allowed / review-required / forbidden) maps naturally to real business scenarios.
4. Structured feedback (`check.json` → `revert_file` → re-check) is mechanically correct.
5. The core scanner remains uncontaminated — Python runs as a sidecar with zero dependencies added.

---

_Generated by Pantheon P25f. Evidence artifacts are stored in `data/dogfood/p25-saleor/`._
