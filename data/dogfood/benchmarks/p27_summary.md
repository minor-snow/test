# P27 Summary: Python Observation Expansion

## 1. Goal

P27 expanded Pantheon's Python observation capabilities from a single Saleor proof-of-concept to a structured, multi-dimensional analysis system that works across three fundamentally different Python project archetypes:

- **Django commerce monolith** (Saleor)
- **FastAPI service backend** (fastapi-realworld)
- **Python SDK / HTTP client library** (httpx)

P27.5 then extended that benchmark coverage into a broader smoke pack without changing the detector core.

## 2. Benchmark Repositories

**Core 3 (Validated)**
| Repo | Commit | Category | Support Level | Python Files |
|---|---|---|---|---:|
| [saleor/saleor](https://github.com/saleor/saleor) | `cf9b5951` | Django commerce | validated | 4,248 |
| [nsidnev/fastapi-realworld](https://github.com/nsidnev/fastapi-realworld-example-app) | `2318463f` | FastAPI service | validated | 60 |
| [encode/httpx](https://github.com/encode/httpx) | `b5addb64` | Python SDK/library | validated | 60 |

**Extended 5 (Smoke Baselines - P27.5)**
| Repo | Commit | Category | Support Level | Python Files |
|---|---|---|---|---:|
| [flaskbb/flaskbb](https://github.com/flaskbb/flaskbb) | `3df43f16` | Flask web app | smoke | 146 |
| [httpie/cli](https://github.com/httpie/cli) | `5b604c37` | CLI tool | smoke | 133 |
| [meltano/meltano](https://github.com/meltano/meltano) | `e99eac14` | Data pipeline | smoke | 318 |
| [openai/tiktoken](https://github.com/openai/tiktoken) | `dcb39287` | ML tooling / tokenizer | smoke | 18 |
| [KPLauritzen/python-monorepo](https://github.com/KPLauritzen/python-monorepo) | `95d8695b` | Monorepo | observed-only | 6 |

## 3. What P27.5 Adds

P27.5 extends the benchmark pack from the validated Core 3 to an 8-class Python coverage set:

- `validated`: 3
- `smoke`: 4
- `observed-only`: 1
- `unsupported`: 0

The key result is that the extended 5 smoke baselines were produced **without a single modification to the core logic**. P27.5 proves portability of the observation pipeline, not deep semantic validation for every additional repo class.

## 4. What Changed: P27-0 to P27-1

### P27-0 (Harness)
- Created `benchmark_manifest.json` and `p27_run_benchmark.ts`
- Established Core 3 preflight with timebox discipline
- No new detectors; only proved the harness works

### P27-1a (Dependency Expansion)
Added 6 new manifest source types: `uv.lock`, `poetry.lock`, `pdm.lock`, `environment.yml`, `tox.ini`, `noxfile.py`.

### P27-1b (Layout Classification)
Two-dimensional layout classification:
- `primary_layout`: django_project, api_service, library_package, cli_app
- `package_layout`: src_layout, django_app_layout, flat_package

### P27-1c (Framework & Project-Role Detection)
Multi-dimensional evidence scoring with hard rules:
- 2+ evidence dimensions required for `high` confidence
- Dependency-only evidence caps at `medium`
- `pytest` is `test_framework` kind, never a project role

### P27-1d (Framework-Aware Test Mapping)
Added library/SDK and FastAPI service test mapping patterns:
- httpx: 0 to 13 high-confidence mappings
- FastAPI: 0 to 4 high-confidence mappings
- Saleor: 120 high (no regression)

### P27-1e (Risk Preset Validation)
Evidence-based risk boundary suggestions:
- 7 preset rule sets (`django_commerce`, `fastapi_service`, `python_sdk_library`, etc.)
- SDK/library defaults to review, not forbid
- All suggestions are `suggested`, not auto-enforced

## 5. Final Core 3 Results

### Saleor

```text
Layout:          django_project / django_app_layout / high
Frameworks:      django/high, celery/high, click/high, pytest/medium
Project roles:   commerce_backend/high, cli_application/high
Risk preset:     django_commerce / validated / high
Test mappings:   977 (120 high, 120 medium)
Forbidden:       1 (migrations: 1,422 paths)
Review:          9 areas
```

### FastAPI

```text
Layout:          api_service / flat_package / medium
Frameworks:      fastapi/high, sqlalchemy/high
Project roles:   service_backend/high
Risk preset:     fastapi_service / validated / high
Test mappings:   29 (4 high)
Forbidden:       1 (alembic: 4 paths)
Review:          5 areas
```

### httpx

```text
Layout:          library_package / flat_package / high
Frameworks:      click/high, pytest/medium
Project roles:   python_sdk_library/high, http_client_library/high
Risk preset:     python_sdk_library / validated / high
Test mappings:   21 (13 high)
Forbidden:       0
Review:          7 areas
```

## 6. P27.5 Narrative Clarifications

### HTTPie

- **Detector output**: `python_sdk_library/high`
- **Narrative interpretation**: primary = `cli_application`, secondary = `python_sdk_library`

P27.5 does not claim that CLI primary-role detection is fully solved. It claims that Pantheon can run and classify a real CLI repo honestly, while preserving the detector's current evidence ordering.

### Meltano

- **Detector output**: `cli_application/high`, `python_sdk_library/high`
- **Narrative interpretation**: data-pipeline-shaped repo with strong CLI and library signals

P27.5 does not claim that `data_pipeline` role detection is validated. It claims that Pantheon can process a real ETL-style repo and produce stable smoke artifacts without semantic overreach.

### tiktoken

- **Detector output**: `python_sdk_library/high`
- **Narrative interpretation**: `ml_tooling_tokenizer`

P27.5 should not be described as generic ML inference coverage. `tiktoken` proves smoke-level handling of a thin Python layer around a Rust-backed tokenizer library.

### python-monorepo

- **Support level**: `observed-only`
- **Meaning**: the pipeline runs and documents the gap honestly, but current layout/framework/role detectors do not yet understand workspace/package boundaries well enough for smoke-level confidence

This is a successful benchmark result, not a phase failure.

## 7. Known Limitations

1. **Import analysis is syntax-level**, not runtime resolution. Dynamic imports (`__import__`, `importlib`) are not detected.
2. **pyproject.toml parsing uses regex**, not a full TOML parser. Edge cases in complex build configs may be missed.
3. **Scope granularity is file/path-level.** Function-level scope analysis is future work.
4. **Multi-line imports** are parsed as module-level observations, not per-symbol.
5. **Namespace packages** without `__init__.py` are not detected as project packages.
6. **Risk preset rules are heuristic.** They are suggestions, not security guarantees.
7. **Test mapping does not verify test content.** A matched test file may not actually test the mapped source.
8. **Monorepo boundaries are not fully supported.** Monorepos currently default to `observed-only` support level unless future workspace/package-boundary detectors are introduced.
9. **Role taxonomy is still coarse for some archetypes.** HTTPie and Meltano demonstrate this most clearly.
10. **ML tooling is not generic inference.** `tiktoken` does not validate model serving, evaluation pipelines, or end-to-end inference governance.

## 8. What P27 / P27.5 Prove

1. Pantheon can observe and classify three fundamentally different Python project archetypes with validated confidence: Django monolith, API service, and SDK/library.
2. Multi-dimensional evidence scoring prevents single-signal false confidence; dependency-only detection never reaches `high`.
3. Framework-aware test mapping significantly improves mapping quality for non-Django projects.
4. Risk preset validation adapts to project role; SDK/library defaults to review-only boundaries while commerce backends surface stronger protected zones.
5. The observation pipeline is additive and non-breaking; each P27-1 sub-phase preserved all existing test suites and Saleor baselines.
6. P27.5 extends this to an 8-class benchmark pack: 3 validated, 4 smoke, and 1 observed-only, without changing the detector core.

## 9. What P27 / P27.5 Do NOT Prove

1. **Runtime correctness.** P27 does not execute tests or verify that boundary enforcement stops real violations at runtime.
2. **Sufficient coverage.** Test mapping shows "likely related" tests, not "sufficient" tests. No coverage claim is made.
3. **Risk preset completeness.** The suggested boundaries are not exhaustive security policies. They are observational suggestions.
4. **Full monorepo support.** P27.5 intentionally leaves monorepo at `observed-only`.
5. **Framework-specific governance contracts.** P27 observes frameworks but does not produce Django-specific or FastAPI-specific governance contracts.
6. **Generic ML inference support.** P27.5 uses `tiktoken` as an ML tooling/tokenizer smoke baseline, not as proof of model inference coverage.
7. **Production GitHub Action integration.** P27 is local benchmark tooling. P26 handles CI/PR integration separately.

## 10. Regression Anchors

```text
Vitest:      1,641 / 1,641 tests passing (111 files)
tsc:         clean (0 errors)
Core 3:      3/3 green (validated)
Extended 5:  4 smoke + 1 observed-only
Baseline:    p27_baseline.json / p27_extended_baseline.json frozen
```

## 11. Next Steps

| Phase | Description |
|---|---|
| P27-2 | Completed output + baseline |
| P27.5 | Completed extended 5 benchmark smoke baseline |
| P27.6 | Benchmark narrative cleanup |
| P28 | Thin IDE guard or extended repo capability deepening |
| P29 | Audit bundle / cross-repo governance evidence |
| P30 | Test obligation engine (which tests "should" run) |
| P31 | Production risk preset catalog |

---

_Generated by P27.6. This document summarizes the P27 Core 3 validation wave and the P27.5 extended smoke benchmark pack._
