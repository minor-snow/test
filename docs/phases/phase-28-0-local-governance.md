# Phase 28.0: Local Governance & Human Attention

**日期**: 2026-04-29
**状态**: ✅ 已完成

---

## 1. 目的

弥合 agent-installable alpha harness 与 agent 和人类日常可用的 repo 之间的差距。添加三样东西：

1. `pantheon-alpha` 命令面一致性
2. 本地追加式 governance ledger
3. 人类 attention layer（review requests、review queue、daily metrics）

---

## 2. 产出

### Agent 命令面一致性

`pantheon-alpha` 现在暴露统一的 repair 命令面：
- `npx pantheon-alpha repair intake`
- `npx pantheon-alpha repair plan`
- `npx pantheon-alpha repair check`
- `npx pantheon-alpha review list`
- `npx pantheon-alpha review show --repair-id <repair_id>`
- `npx pantheon-alpha metrics daily`
- `npx pantheon-alpha metrics status`

### 本地 Governance Ledger

`./.pantheon/governance/events.jsonl`（追加式，不存储源代码/diff/patch/debug trace）

### Human Attention Layer

Materializes non-pass repair outcomes：
- `./.pantheon/reviews/review_requests/review_<repair_id>.json`
- `./.pantheon/reviews/review_requests/review_<repair_id>.md`
- `./.pantheon/reviews/review_queue.json`

`requires_review`、`requires_scope_expansion`、`requires_replan`、`fail` 成为显式的人类工作项。

### 每日本地 Metrics

`./.pantheon/metrics/daily/YYYY-MM-DD.{json,md}`

报告内容：repair checks、verdict counts、intercept reasons、open review requests、common review areas。支持路径匿名化。

### GitHub Attention 集成

Repair-mode PR comments 包含显式 attention blocks：Human review required / Blocked / Agent next steps。

---

## 3. 隐私保证

- Metrics 和 review 面默认本地
- Governance events 和每日报告写入前已 sanitized
- 不包含代码内容或 diff hunks
- Path anonymization 通过 `pantheon.alpha.json` 配置

---

## 4. P28.0 证明 vs 未证明

**已证明：**
1. Agent-facing CLI commands 和 docs 通过测试保持同步
2. Governance outcomes 可本地记录，无需云服务
3. `requires_review` 是可见的 human attention 状态
4. Blocking repair outcomes 携带显式后续动作
5. GitHub repair comments 可在 verdict 后同时引导人类和 agent

**未证明：**
1. Slack/email/IDE 实时通知流
2. Cloud dashboards
3. 跨仓库组织分析
4. Enterprise permissioning
5. Patch 语义正确性
