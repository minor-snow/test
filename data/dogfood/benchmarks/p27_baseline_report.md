# P27 Baseline Report

Frozen: 2026-04-29  
Phase: P27-1 (Observation Expansion Wave)  
Status: **FROZEN**

## Core 3 Regression Anchors

| Metric | Value |
|---|---|
| Vitest tests | 1,641 / 1,641 |
| Vitest files | 111 / 111 |
| tsc | clean |
| Core 3 benchmark | 3/3 green |

---

## Saleor (Django Commerce)

| Dimension | Value |
|---|---|
| Commit | `cf9b5951` |
| Layout | django_project / django_app_layout / high |
| Frameworks | django/high, celery/high, click/high, pytest/medium |
| Project roles | commerce_backend/high, cli_application/high |
| Risk preset | django_commerce / validated / high |
| Python files | 4,248 |
| Classified ratio | 100% |
| Import observations | 12,610 |
| Test mappings | 977 (120 high, 120 medium) |
| Sensitive zones | 14 |
| Manifests | 3 (pyproject.toml, setup.cfg, uv.lock) |

### Risk Boundaries

| Type | Pattern | Severity | Paths |
|---|---|---|---:|
| 🚫 forbidden | `**/migrations/**` | critical | 1,422 |
| 🔍 review | `**/payment/**` | critical | 234 |
| 🔍 review | `**/checkout/**` | high | 383 |
| 🔍 review | `**/order/**` | high | 479 |
| 🔍 review | `**/account/**` | high | 318 |
| 🔍 review | `**/auth/**` | high | 15 |
| 🔍 review | `**/discount/**` | medium | 244 |
| 🔍 review | `**/tax/**` | medium | 67 |
| 🔍 review | `**/plugin*/**` | medium | 255 |
| 🔍 review | `**/settings*` | medium | 3 |
| 💤 dormant | `**/billing/**` | — | 0 |

---

## FastAPI Realworld (Service Backend)

| Dimension | Value |
|---|---|
| Commit | `2318463f` |
| Layout | api_service / flat_package / medium |
| Frameworks | fastapi/high, sqlalchemy/high, click/medium, pytest/medium, httpx/medium |
| Project roles | service_backend/high |
| Risk preset | fastapi_service / validated / high |
| Python files | 60 |
| Classified ratio | 100% |
| Import observations | 174 |
| Test mappings | 29 (4 high, 0 medium) |
| Sensitive zones | 2 |
| Manifests | 3 (pyproject.toml, requirements.txt, uv.lock) |

### Risk Boundaries

| Type | Pattern | Severity | Paths |
|---|---|---|---:|
| 🚫 forbidden | `alembic/**` | critical | 4 |
| 🔍 review | `**/auth*` | high | 1 |
| 🔍 review | `**/security*` | high | 1 |
| 🔍 review | `**/db/**` | high | 3 |
| 🔍 review | `**/config*` | medium | 1 |
| 🔍 review | `**/deps*` | medium | 1 |
| 💤 dormant | `**/middleware*` | — | 0 |

---

## httpx (Python SDK / HTTP Client Library)

| Dimension | Value |
|---|---|
| Commit | `b5addb64` |
| Layout | library_package / flat_package / high |
| Frameworks | click/high, pytest/medium |
| Project roles | python_sdk_library/high, http_client_library/high |
| Risk preset | python_sdk_library / validated / high |
| Python files | 60 |
| Classified ratio | 100% |
| Import observations | 223 |
| Test mappings | 21 (13 high, 0 medium) |
| Sensitive zones | 1 |
| Manifests | 2 (pyproject.toml, requirements.txt) |

### Risk Boundaries

| Type | Pattern | Severity | Paths |
|---|---|---|---:|
| 🔍 review | `**/_client*` | high | 1 |
| 🔍 review | `**/_transport*/**` | high | 6 |
| 🔍 review | `**/_auth*` | high | 1 |
| 🔍 review | `**/_config*` | medium | 1 |
| 🔍 review | `**/__init__.py` | medium | 5 |
| 🔍 review | `**/_models*` | medium | 1 |
| 🔍 review | `**/_urls*` | medium | 1 |

> **Note**: httpx has 0 forbidden candidates and 0 dormant patterns.  
> SDK/library projects default to review-required, not forbidden.

---

## P27-1 Sub-phase Summary

| Phase | Description | Key Result |
|---|---|---|
| P27-1a | Dependency extractor expansion | +6 manifest types (uv.lock, poetry.lock, pdm.lock, etc.) |
| P27-1b | Layout classification | django_project / api_service / library_package |
| P27-1c | Framework & project-role detection | Multi-dimensional evidence scoring (2+ dims for high) |
| P27-1d | Framework-aware test mapping | httpx 0→13 high, FastAPI 0→4 high |
| P27-1e | Risk preset validation | django_commerce / fastapi_service / python_sdk_library |

---

_Frozen by P27-2a. This baseline serves as the regression anchor for Extended 5 and P28+ benchmark packs._
