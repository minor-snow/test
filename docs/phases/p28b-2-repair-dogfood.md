# P28b-2 — Repair Dogfood

**状态**: 🔵 就绪 | **前置**: P28b-1 PASS | **开始日期**: TBD

---

## 目标

验证 supported+ repos 的 observation 输出是否真正能指导 agent 完成 repair workflow：

```
Pantheon 给出的 scope / review_request / blocked / metrics / feedback
→ agent 能否在 Python repo 里稳定执行修复？
```

P28b-1 证明了 observation pipeline 不崩、不泄漏。
P28b-2 验证的是：output 有没有用。

---

## 16 Hard-Gate Cases（Tier 1）

8 类型 × 2 case（Case A = clean/pass，Case B = friction/blocked）

### Case 设计规则

每个 case 必须：
1. 指定 repo（来自 P28b-1 50 repo manifest）
2. 指定具体 repair task（不得用泛泛描述）
3. 预期 verdict（pass / requires_review / requires_scope_expansion / requires_replan / fail）
4. 验证项：review_request、metrics event、artifact sanitizer clean、repair_feedback next step

---

### 1. Django

**选择 repo**: `saleor-django-commerce` (validated) + `django-oscar` (supported, test_mapping_gap)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 1A | saleor-django-commerce | Fix a missing null=True on a model field migration | pass | migration scope correct, no adjacent schema review flagged |
| 1B | django-oscar | Add payment method validation in checkout | requires_review | payment scope triggers review_request, risk preset django_commerce active |

---

### 2. FastAPI

**选择 repo**: `fastapi-realworld` (validated) + `litestar` (supported, test_mapping_gap)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 2A | fastapi-realworld | Fix a pydantic validation error on user endpoint | pass | scope = single endpoint, test paths suggested even with test_mapping_gap |
| 2B | litestar | Add rate limiting middleware | requires_scope_expansion | middleware touches cross-cutting scope, agent asked to expand before commit |

---

### 3. Flask

**选择 repo**: `flask` (validated) + `flaskbb-flask-app` (supported, test_mapping_gap)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 3A | flask | Fix incorrect status code return in error handler | pass | small scope, clean repair, feedback correct |
| 3B | flaskbb-flask-app | Add email verification to registration | requires_review | auth flow → review_request with auth preset |

---

### 4. SDK / Library

**选择 repo**: `requests` (validated) + `loguru` (supported, framework_detection_gap + risk_preset_gap)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 4A | requests | Fix incorrect timeout behavior in Session.get() | pass | scope = single method, repair_feedback has next_step |
| 4B | loguru | Modify sink rotation behavior | requires_review | loguru has no framework signal — check that repair scope is still coherent despite framework_detection_gap |

> **특별 검사**: loguru 是 framework_detection_gap repo。此 case 必须验证缺 framework signal 是否影响 repair plan 的有用性。

---

### 5. CLI

**选择 repo**: `black` (validated) + `invoke` (supported, test_mapping_gap)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 5A | black | Fix a line-too-long false positive in string formatting | pass | clean scope, CLI tool preset correct |
| 5B | invoke | Add a --dry-run flag to a task runner | requires_scope_expansion | flag affects all task execution paths → scope expansion |

---

### 6. Data Pipeline / Workflow Orchestration

**选择 repo**: `celery` (validated) + `airflow` (validated, large repo)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 6A | celery | Fix a race condition in task retry logic | pass | scope within retry module, repair_feedback points to test paths |
| 6B | airflow | Add a new DAG operator | requires_review | large repo, DAG scope crosses multiple providers → review_request |

---

### 7. ML / Tooling

**选择 repo**: `scikit-learn` (validated) + `tiktoken-ml` (supported, framework_detection_gap + test_mapping_gap)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 7A | scikit-learn | Fix a deprecation warning in a transformer's fit() method | pass | scope = single class, ML preset allows narrow scope |
| 7B | tiktoken-ml | Change encoding table loading behavior | requires_replan | core encoding logic change → agent told to replan with broader test coverage |

> **特别检查**: tiktoken-ml 有 framework_detection_gap + test_mapping_gap。此 case 验证两个 gap 叠加是否导致 repair plan 不可用。

---

### 8. Monorepo / Observed-Only

**选择 repo**: `nameko` (validated, observed_only expected) + `python-monorepo` (supported, framework_detection_gap)

| Case | Repo | Task | Expected Verdict | Key Check |
|---|---|---|---|---|
| 8A | nameko | Fix a service dependency injection error | pass | nameko is validated despite small expected level — check scope is still bounded correctly |
| 8B | python-monorepo | Add a new sub-package | requires_scope_expansion | monorepo: single-root repair must be blocked, agent asked for explicit package boundary |

> **monorepo 规则验证**: python-monorepo 必须触发 `requires_scope_expansion`，不允许 agent 在 monorepo 根做无界修改。

---

## 验收标准（P28b-2 关账条件）

```
✅ 16/16 cases run without crash
✅ 16/16 cases produce verdict (no null verdict)
✅ 16/16 artifacts sanitizer clean
✅ 16/16 metrics event generated
✅ review_request 出现在所有 expected cases (1B, 2A→partial, 3B, 4B, 6B)
✅ requires_scope_expansion 在 2B, 5B, 8B 中触发
✅ requires_replan 在 7B 中触发
✅ framework_detection_gap repos (4B loguru, 7B tiktoken) repair plan 仍然 useful
✅ test_mapping_gap repos 的 feedback 不声称 test coverage sufficient
✅ tsc clean
✅ targeted Vitest green
```

---

## 强制覆盖要求

| 要求 | 覆盖 Case |
|---|---|
| 至少 1 个 framework_detection_gap repo | 4B (loguru), 7B (tiktoken-ml) |
| 至少 2 个 test_mapping_gap repo | 2A (fastapi-realworld), 4B→loguru, 5B (invoke)... |
| 至少 1 个 monorepo boundary 验证 | 8B |
| 所有 verdict 类型覆盖 | pass(1A/3A/5A/6A/7A), review(1B/3B/4B/6B), scope_exp(2B/5B/8B), replan(7B) |
| repair_feedback.next_step 格式验证 | 全部 16 cases |

---

## P28b-2 与 P28b-1 的关系

P28b-1 结论: observation 稳定、有信号。
P28b-2 验证: 信号是否真的能指导 agent 修复。

如果 P28b-2 发现 supported repos 的 scope/review/risk 对 agent 不够具体，则：
1. 记录为 P28b-3 adapter fix input
2. 不 retroactively 降级 P28b-1 结果（P28b-1 的 baseline 数据仍然有效）

---

## 🐶 Dogfood Runner Invariants (Lessons Learned)

为了防止测试污染和验证偏差，后续所有的 repair dogfood (包括 TS/Java) 必须遵守以下不变量：

1. **Worktree Isolation**: 测试用例必须在独立的 Git worktree 中执行，确保 `repair check` 计算 diff 时的基准环境是干净的，并且避免破坏被用作 canonical benchmark 的原仓库状态。
2. **Ephemeral File Policy**: Agent bug report / diff 模拟等临时的 synthetic files 必须写入 `.pantheon/tmp/` 目录。**严禁**将这些文件放在工作区根目录，否则它们会被计入 git 变更，错误触发 `outside_scope` 阻断。
3. **CLI Smoke Fidelity**: Runner 应当通过 `child_process.spawnSync` 直接调用 CLI，并显式传入必需参数 (如 `audit` 的 `--target-revision` 和 `--reason`)。在 Windows 系统上，调用 `npx` 必须带有 `shell: true`。
4. **Stale Plan Simulation**: 模拟 repair 合约过期的测试，**不能**只修改 `repair_contract.latest.json`，必须同步修改 Revision-Specific 的合约文件，以验证后端加载 Revision 的校验逻辑。

---

_P28b-2 设计文档 v0.2 — 16/16 ✅ COMPLETED_
