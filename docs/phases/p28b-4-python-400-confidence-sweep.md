# P28b-4 — Python 400 Repo Confidence Sweep

## 1. 阶段目标与定位

**一句话定义**：用 400 个真实 Python 仓库做置信度探测，证明 Pantheon Python 主战场在大规模真实项目上稳定、保守、无泄漏、无 false forbidden。

这**不是**新功能阶段。它**不是**：
- 继续无限 adapter tuning
- 继续修所有 test_mapping gap
- 给每个 repo 做 repair dogfood
- 做 architecture ingest
- 做 TS/JS

它是：**大规模真实仓库验证 + gap 分布稳定性确认 + 最终 Python readiness 报告**。

要证明：P28b-3 的优秀表现不是因为 144 repo 样本的运气好，Pantheon 在更大、更多样、更脏的 Python 仓库里仍然能稳定工作。最终要得出强有力论断：
> Pantheon has been validated across hundreds of real Python repositories with zero sanitizer leaks and zero critical crashes.

## 2. 阶段边界

### P28b-4 做什么
1. 扩展 Python repo matrix 到 400。
2. 保持 category diversity。
3. 跑 preflight / observation / support assessment。
4. 跑 sanitizer。
5. 跑 performance aggregation。
6. 生成 gap taxonomy。
7. 检查 top gaps 是否稳定。
8. 生成 Python mainline governance final report。

### P28b-4 不做什么
1. 不做每个 repo 的 repair dogfood。
2. 不做 P30 architecture mapping。
3. 不做 TS/JS、Java 等其他语言。
4. 不做大规模业务逻辑修复。
5. 不为凑数据强塞低质量 repo。
6. 不因为普通 P2/P3 gap 改 scanner 核心接口。

### 允许立即修复的 P0/P1
仅允许修复以下导致核心失效的 Bug：
1. unhandled crash
2. sanitizer leak
3. false forbidden
4. monorepo hallucinated single root
5. requires_review 被渲染成 failure
6. support assessor 明显宽判导致危险 allowed
7. artifact path leak
8. runner resume / shard 证据损坏

其他一律沉入 `gap taxonomy`。

## 3. 400 Repo 样本策略与 Quota

采用 `144 validated base (P28b-3) + 256 new repos = 400 target` 策略。
新 256 个 repo 重点填补：结构宽度、生态长尾、高风险复杂项目。

**Category Quota 建议范围**：
- Django / Django-like commerce/admin: 35–45
- FastAPI / Starlette / ASGI service: 35–45
- Flask / WSGI service: 30–40
- Python SDK / library: 60–75
- CLI / developer tooling: 40–55
- Data pipeline / orchestration: 30–45
- ML / scientific tooling: 40–55
- Packaging / build / infra tooling: 25–35
- Monorepo / multi-package: 20–30
- Security / auth / crypto / policy tools: 15–25
- Misc useful Python apps: remaining

*如果某类达不到，不强塞。记录 variance。*

## 4. Candidate Generation 与 Preflight

继续沿用 Hybrid Strategy：`curated-first` -> `API-assisted` -> `Pantheon-observation-final`。

- **Candidate Pool**: 目标准备 500–600 个 candidate（绝对底线 450），因为会存在克隆超时、废弃项目、分类限额满、质量差等情况。
- **GitHub API** 仅用于元数据（stars, pushed_at 等）进行辅助筛选。
- **最终分类（Category）** 必须由 `Pantheon repo observation` 提供。
- **Category Fallback**：必须明确记录 fallback 信息，不可伪装成高置信度结果。记录字段需包含：
  - `observed_category`
  - `category_source`
  - `category_confidence` (e.g., fallback)
  - `fallback_reason`
- **保留原 144 Repo**：必须保留 P28b-3 阶段的 144 个 repo 并在 Manifest 中钉死其 P28b-3 时期的 `pinned_commit`，确保 400 Sweep 可以和之前做稳定的回归对比。
- **拒绝规则**：Archived, pure notebook, pure data, generated-only, vendor dump, no python source, clone > 2 min。

生成的文件：
- `data/dogfood/p28b_python_matrix/p28b_4_seed_repos.json`
- `data/dogfood/p28b_python_matrix/p28b_4_candidates.json`
- `data/dogfood/p28b_python_matrix/preflight_400.json`
- `data/dogfood/p28b_python_matrix/manifest_400.json`

## 5. 执行阶段与调度

### P28b-4A — Candidate + Preflight
目标：生成 `manifest_400.json`。若最终入选数在 `[380, 400)` 区间且通过 Hard Gates，允许记录 Variance 后继续，绝不为凑数而放宽标准。

### P28b-4B — 40 Repo Pilot (Stratified)
分层试跑覆盖全部 10 个类别，排除基础设施失控风险。

### P28b-4C — Full 400 Sweep
执行 `--full --resume --concurrency 4`。
要求：输出隔离至 `p28b_4_runs`，不可修改外部状态。

### P28b-4D — Gap Taxonomy & Stability
生成 `p28b_4_gap_taxonomy.md` 和 `.json`。
**Gap 必须区分为 Blocking 与 Deferred**。不允许 P0/P1 隐身在 Gap 列表中。
分析：Top gaps 是否和 P28b-3 类似？是否有新的 P0/P1？Support assessor 是否保持严谨？Fallback category 是否被诚实标注？

### P28b-4E — Final Report
输出终极对外报告：`docs/internal/p28b_python_mainline_governance_report.md`。
报告中必须包含一个 **Public Summary** 块，用于对外发布和宣传（例如 GitHub README 或 Launch 内容）。
报告中必须包含一个 **P28b-3 vs P28b-4 Stability** 对比章节。

## 6. 支持等级目标 (Hard Gates)

P28b-4 因为样本更为复杂与真实，支持率需保持保守且务实：

- **0 uncontrolled timeout** (区分 `timeouts_classified` 与 `timeouts_unhandled`，允许有明确原因的分类级超时，但绝不允许失控超时)
- **0 critical crash**
- **0 sanitizer violation**
- **0 false forbidden**
- **95% smoke-or-better**
- **80% supported-or-better**
- **35% validated-or-better**
- 100% unsupported 均有显式解释（reason）
- p95 standard repo observation < 30s
- large/monorepo p95 < 180s

**绝不强求极高支持率（例如 90% validated），避免诱导框架做不负责任的宽判。**

## 7. No-Tuning Rule 与 Sanitizer Policy

### 严禁调参 (No-Tuning Rule)
**在第一次完整的 P28b-4 运行中，严禁修改 adapter 行为（除非导致了 P0/P1 安全问题）。**
- **允许修复**：crash, leak, false forbidden, monorepo hallucination, dangerous support overclaim, runner evidence corruption。
- **严禁修复**：test mapping weak, niche framework missing, low confidence manifest, category mismatch, dynamic import uncertainty, risk preset missing。
P28b-4 是置信度测试，不是无限 Python 调参阶段。

### Resume 机制
Orchestrator 必须延续强校验 Resume，检查的 Hash 应当包含 `runner_version`、`manifest_entry_hash`、`pinned_commit`、`schema_version`、`sanitizer_report_exists`、`support_assessment_exists`，以避免证据污染。

### Isolation & Sanitizer Policy
- Canonical clone **绝对不允许**写入运行时文件。
- 所有临时文件严格隔离到 `.pantheon/tmp` 或 `p28b_4_runs`。
- repo root 不允许存在遗留的 `agent_bug_report.json`。
- Sanitizer hard gate: 必须为 `0` 泄漏。

## 8. 自动验证 (Verification Plan)
除了最终报告，流程必须涵盖五项自动验证（可在 orchestrator 中结合脚本实现）：
1. **Manifest Integrity Test**: 检查入选数（>= 380），Pinned commit，Reject reason，和无禁搜项。
2. **Resume Invalidation Test**: manifest hash 变化必须触发 rerun。
3. **Sanitizer Aggregation Test**: 任何 violation 必须阻断 summary 成功状态。
4. **Timeout Classification Test**: 极短超时模拟必须产出 classified timeout，而不是 crash。
5. **Gap Severity Audit**: 验证 P0/P1 的 gap 不能被静默归类为 non-blocking（除非有显式 override）。

## 9. 验收与对外陈述

完成上述目标后，可对外宣称：
> **Pantheon Python support was validated across 400 real repositories with zero sanitizer leaks, zero critical crashes, and conservative support classification.**

这为上线与融资提供最高信任级别的硬证据。
