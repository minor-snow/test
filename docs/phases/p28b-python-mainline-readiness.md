# P28b — Python Mainline Readiness

**状态**: 执行中 (P28b-1) | **就绪裁决**: cleared (Phase BUG-FULL) | **开始日期**: 2026-04-30

| 阶段 | 状态 |
|---|---|
| P28b-0: Harness + Repo Selection | ✅ 完成 (2026-04-30) |
| P28b-1: 50 Repo Baseline + Gap Fix | ✅ 完成 (2026-04-30) |
| P28b-2: Repair Dogfood | ✅ 完成 (2026-04-30) |
| P28b-3: 150 Repo Validation | 🔵 就绪 |
| P28b-4: 400 Sweep + Closure | ⬜ 待开始 |

---

## 一句话定义

```
P28b 用 50 → 150 → 400 个真实 Python 仓库矩阵，验证并增强 Pantheon 对常规 Python 项目的
观测、分类、测试映射、风险边界、repair plan、PR gate 和本地治理体验。
```

P28b 证明的是：**常规 Python 项目可以稳定进入 Pantheon repair governance workflow，并获得有用、保守、可审计、可人审、可产品化的修复治理信号。**

---

## 前置条件（已满足）

- Phase BUG-FULL: 110 条索引项，83 fixed，25 deferred，Critical open = 0，High public-surface open = 0
- 回归通过：1,871 Vitest + ncc build + npm pack + doctor + metrics daily + review list
- ARCHITECTURE.md 明确: "P28b 就绪裁决: cleared"

---

## P28b 不做什么

```
不做新的 repair governance core
不做新的 GitHub Action 架构
不做新的多 agent session 模型
不做 TS/JS / Java 支持
不做 IDE 插件 / 云端 dashboard
不执行测试作为 correctness proof
不自动生成 patch / 不调用 LLM
不做完整 Python call graph
不做跨仓库组织级 metrics
```

---

## 成功口径（4 层）

| 层级 | 内容 |
|---|---|
| Level 1: Workflow entry | init / doctor / repo observation / artifact sanitizer |
| Level 2: Useful observation | layout / framework / project_role / test_mapping / risk_preset / unknowns |
| Level 3: Repair governance | intake / repair_id / contract / task / scope / check / review_request / metrics |
| Level 4: Agent workflow | AGENTS.md / PR gate / pass/review/block/replan 可判定 |

P28b 要求大多数常规 Python 项目达到 Level 2/3。Level 4 覆盖 validated 等级 repo。

---

## 支持等级定义

| 等级 | 条件 |
|---|---|
| `validated` | 完整 workflow 可跑；信号清楚；有 deterministic repair dogfood；check verdict 符合预期；sanitizer clean |
| `supported` | 核心 workflow 可跑；observation 信号足够有用；repair plan 可生成；无 hallucination |
| `smoke` | 能扫描、能产出 observation、不会 crash；但信号可能薄弱 |
| `observed_only` | 能安全承认未知；不强行分类；不 hallucinate single root / framework / risk |
| `unsupported` | 不能安全进入 workflow；必须有明确 reason |

---

## 5 阶段结构

### P28b-0 — Harness + Repo Selection ✅

**目标**: 建立可重复跑真实 Python repo 的矩阵系统，完成 Core 3 + Extended 5 性能基线。

**交付**:
- `scripts/p28b_run_python_matrix.ts` — 矩阵 runner
- `scripts/p28b_collect_support_matrix.ts` — 结果聚合
- `data/dogfood/p28b_python_matrix/manifest.json` — 50 repo manifest
- `data/dogfood/p28b_python_matrix/perf_baseline.json` — Core 3 + Extended 5 性能数据
- scanner 接口冻结决定

**验收** (✅ = 已完成):
- [x] 50 repo manifest 完成，来源明确（Source A/B/C）— 8 ready + 42 pending clone
- [x] 每个 repo clone --depth 1 <= 2min 规则已写入 manifest
- [x] Core 3 + Extended 5 性能基线完成 — p50=2509ms, p95=3704ms, 0 timeouts
- [x] repoScanner 接口在此阶段后冻结 — `scanner_interface_frozen: true` @ 2026-04-30

**实测性能基线**:

| 仓库 | 类别 | 时间 | Python 文件数 |
|---|---|---:|---:|
| saleor-django-commerce | django_commerce | 3704ms | 4248 |
| fastapi-realworld | fastapi_service | 2380ms | 60 |
| httpx-sdk | python_sdk_library | 2409ms | 60 |
| flaskbb-flask-app | flask_web_app | 2674ms | 146 |
| httpie-cli-tool | python_cli_tool | 2509ms | 133 |
| meltano-etl | data_pipeline | 2701ms | 318 |
| tiktoken-ml | ml_tooling_tokenizer | 2426ms | 18 |
| python-monorepo | python_monorepo | 2449ms | 6 |

> p50=2509ms | p95=3704ms | 预算: **远优于 30s 目标，category-aware 预算已确定**

---

### P28b-1 — 50 Repo Baseline + Gap Fix ✅

**目标**: 先跑 raw baseline 暴露 gap，修 top gaps，再重跑验证（最多 2 轮）。

**交付**:
- `data/dogfood/p28b_python_matrix/baseline_raw/aggregate.json`
- `data/dogfood/p28b_python_matrix/gap_taxonomy.md`
- `data/dogfood/p28b_python_matrix/sanity_audit.md` (90% CALIBRATED)
- `data/dogfood/p28b_python_matrix/p28b_1_closure_report.md` (PASS)

**结果**: Baseline 已远超预期 (Smoke+ 100%, Supported+ 98%)。决定不做 adapter fix，4 个 top gaps 全部 deferred 至 P28b-3。

**验收** (✅ = 已完成):
- [x] 0 unhandled crash
- [x] 0 sanitizer violations
- [x] 90% smoke-or-better (实测 100%)
- [x] 70% supported-or-better (实测 98%)
- [x] 每个 unsupported 有 reason (实测 0 unsupported)
- [x] top gap taxonomy 收敛
- [x] framework high confidence 需要 2+ evidence dimensions
- [x] dependency-only signal 不超过 medium
- [x] pytest 不作为 project_role
- [x] monorepo 默认 observed_only，禁止 hallucinate single root

---

### P28b-2 — Repair Dogfood

**目标**: 从 matrix 中选 repo 做 deterministic repair dogfood。验证 supported+ repos 的 observation 输出是否真正能指导 agent 完成 repair workflow。

**设计文档**: [P28b-2 — Repair Dogfood](p28b-2-repair-dogfood.md)

**Tier 1**: 8 repos × 2 cases = 16 hard-gate cases（全绿才通过），详见设计文档。

**Tier 2**: 4-6 exploratory cases（发现 gap，不作为 hard gate）

**验收** (✅ = 已完成):
- [x] Tier 1 16 cases 全绿
- [x] pass/review/block/replan/fail 路径全覆盖
- [x] review_request 在预期 case 正确生成
- [x] metrics event 在预期 case 正确生成
- [x] sanitizer 0 violations

---

### P28b-3 — 150 Repo Validation

**目标**: 验证 P28b-1 修复后的真实覆盖，50 repo 回归集 + 100 新增。

**验收**:
- [ ] 0 unhandled crash
- [ ] 0 sanitizer violations
- [ ] 92% smoke-or-better
- [ ] 80% supported-or-better
- [ ] 25% validated-or-better
- [ ] performance within category-aware budget
- [ ] 未达标时有 blocker report

---

### P28b-4 — 400 Sweep + Closure

**目标**: 信心 sweep，不要求全部 dogfood，生成最终关闭报告。

**验收**:
- [ ] 0 critical crash
- [ ] 0 sanitizer violations
- [ ] 80%+ useful workflow entry
- [ ] 所有 unsupported 有 reason
- [ ] top 20 gaps 稳定
- [ ] p28b_python_mainline_readiness_report.md 生成

---

## 仓库来源策略

```
Source A: GitHub public Python repos (>500 stars, 非 archived, 可 clone, 有 Python source)
Source B: 已有 Pantheon benchmark (Core 3 + Extended 5 = 8 个)
Source C: 类别补齐 (Django/Flask/FastAPI/Click/Airflow/Dagster/ML/monorepo)

硬规则: 每个 repo 必须 git clone --depth 1 在 2 分钟内完成。否则 preflight skip/replace。
```

---

## Python 分类矩阵（目标覆盖）

| 类别 | 数量 | 重点信号 |
|---|---|---|
| Django | 8 | manage.py, settings, migrations, apps |
| FastAPI / Starlette | 7 | routes, schemas, SQLAlchemy, Alembic |
| Flask | 6 | app.py, blueprints, extensions |
| SDK / library | 8 | py.typed, public exports, tests |
| CLI | 6 | entrypoints, commands, Click/Typer |
| Data pipeline | 5 | DAGs, config, schedules |
| ML / scientific | 5 | models, loaders, eval |
| Monorepo | 5 | multiple roots, packages (observed_only) |

---

## 失败条件（直接 block P28b PASS）

```
unhandled crash in common repo type
public artifact path leak
false forbidden in common allowed case
requires_review rendered as failure
agent command surface regression
P28a init/doctor regression
P28-0 metrics/review queue regression
P26.5 GitHub gate regression
framework high confidence from dependency-only
monorepo hallucinated as single root
```

---

## 20 条验收标准（最终）

```
1.  50 repo manifest 完成，来源明确。
2.  repo clone/preflight 规则明确且执行。
3.  Core 3 + Extended 5 性能基线完成。
4.  repoScanner 接口在 P28b-0 后冻结。
5.  50 repo baseline 无 unhandled crash。
6.  50 repo baseline sanitizer violations = 0。
7.  50 repo baseline 每个 repo 有 support_level。
8.  每个 unsupported 有 reason。
9.  top gap taxonomy 生成。
10. Python observation fixes 后 50 repo supported+ 达标或解释原因。
11. framework high confidence 需要 2+ evidence dimensions。
12. dependency-only signal 不超过 medium。
13. pytest 不作为 project_role。
14. monorepo 默认 observed_only / conservative。
15. test mapping 不声称 tests sufficient。
16. Tier 1 repair dogfood 16 cases 全绿。
17. review_request / metrics event 在 dogfood 中正确生成。
18. 150 repo validation 达到目标或给出 blocker report。
19. 400 sweep 生成 confidence report。
20. tsc clean + full Vitest green + npm pack smoke green。
```

---

## P28b 完成后可以说什么

```
Pantheon has first-class alpha support for common Python repositories.
It can observe, classify, plan, check, review, and locally record AI repair governance
across Django, FastAPI, Flask, SDK/library, CLI, pipeline, ML/tooling, and monorepo-style
Python projects.
```

---

## P28b 之后

```
P28c — TypeScript / JavaScript Mainline Readiness
P28d — Java / Spring Readiness
P28e — Cross-language Support Matrix
P28f — Closed Alpha External Trial
```

P28b 的方法论沉淀为 **language readiness playbook**：matrix → baseline → gap taxonomy → adapter expansion → repair dogfood → performance hardening → support matrix → closure report。
