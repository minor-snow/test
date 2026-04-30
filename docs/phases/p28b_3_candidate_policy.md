# P28b-3 Candidate Generation Policy

This policy document outlines the selection criteria, category quotas, and the fallback replacement pool strategy for expanding the P28b Python testing matrix from 50 to 150 repositories.

## 0. Hybrid Strategy (Curated-First)

P28b-3 uses a hybrid, 3-layer approach to candidate selection:

1. **Primary Path (Curated Seed List)**: We use a manually prepared seed list of ~120-150 repositories (`p28b_3_seed_repos.json`) to quickly and predictably fill the quotas without being bottlenecked by GitHub search quality.
2. **Auxiliary Path (API Enrichment)**: GitHub API discovery is used **only** for quota refills and generating a replacement pool if the curated seeds fail preflight or do not fulfill niche categories.
3. **Ground Truth (Preflight Observation)**: Final category assignment is determined by Pantheon's own `repoObservation` pipeline, **not** by GitHub topics or intended seed categories. Topics are hints; Pantheon observation is truth.

## 1. Category Quotas

To ensure the 150-repository matrix does not over-represent popular frameworks (like Django or FastAPI) and accurately reflects the diversity of Python applications, the 100 new repositories MUST be sourced according to the following category quotas:

| Category | Target Quota | Expected Focus Areas |
|---|---|---|
| Django | 12 | `manage.py`, settings, migrations, apps |
| FastAPI / Starlette | 12 | routes, schemas, SQLAlchemy, Alembic |
| Flask | 12 | `app.py`, blueprints, extensions |
| SDK / library | 16 | `py.typed`, public exports, tests |
| CLI | 12 | entrypoints, commands, Click/Typer |
| Data pipeline / orchestration | 10 | DAGs, config, schedules |
| ML / scientific tooling | 12 | models, loaders, eval |
| Packaging-heavy / tooling | 8 | Build systems, poetry, flit, setup.py |
| Monorepo / multi-package | 6 | Multiple roots, packages (observed_only) |
| **Total New Repos** | **100** | |

*(Note: These 100 repositories are in addition to the original 50 repositories from P28b-1, bringing the total to 150.)*

## 2. Selection Criteria (Candidate Pool)

All candidate repositories must satisfy the following strict rules:

- **Visibility**: Public
- **Status**: Non-archived
- **Fork Status**: Non-fork preferred
- **Primary Language**: Python
- **Popularity**: `stars >= 500` (Category-fill repos may allow `stars >= 100` if necessary to meet quotas for niche categories like Monorepos)
- **Activity**: Recently active preferred (pushed within the last 2 years)
- **Content**: Must contain actual Python source code (Not pure Jupyter notebook, not pure data/docs)

## 3. Preflight Hard Gates

Before a candidate is finalized into `manifest_150.json`, it must pass the preflight phase:

1. **Clone Speed**: `git clone --depth 1` MUST complete in `<= 2 minutes`.
2. **Commit Pinning**: The `pinned_commit` MUST be successfully recorded.
3. **Observation Verification**: The repository must not be completely empty of python files or manifest files.

## 4. Replacement Pool Strategy

If a category cannot fulfill its quota due to preflight failures (e.g., clone timeout, archived state) or simply a lack of valid high-star repositories:

1. The candidate script will fall back to a predefined replacement pool (or dynamically search with lower star thresholds down to 100).
2. If a category remains under quota, the shortfall will be reallocated to **SDK / library** or **CLI**, as these categories provide the most generic testing value for core Python parsing.
3. Any reallocation must be explicitly documented in the `p28b_3_summary.md` indicating:
   - Quota target
   - Actual count
   - Why shortfall occurred
   - Replacement category used
