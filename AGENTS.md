# AGENTS.md — 知乎 RPC 采集系统 AI 代码治理规则

本文件规范所有 AI Agent 在本项目中的行为边界。任何 AI 辅助编码工具必须遵守以下规则。

## Hard Rules（硬规则，不可违反）

1. **凭证隔离**：绝不将 `d_c0`、`z_c0`、手机号、密码以明文形式输出到日志、终端或代码注释中。日志中必须使用 `masked` 格式（如 `abc***xyz`）。
2. **签名引擎不可触碰**：`rpc_server.js` 中的 `__g._encrypt` hook 逻辑、MD5 实现、路由拦截规则属于逆向工程成果，AI 不得自动重写或"优化"这些代码。
3. **状态机完整性**：`spider.py` 中的任务状态转换（READY→LEASED→DONE/BACKOFF/GAP/DEAD）修改必须同步更新 `tests/test_spider_logic.py` 中的对应测试。
4. **配置驱动**：所有可调参数必须从 `config.yaml` 通过 `config_loader.conf()` 读取，不得在代码中硬编码数值。
5. **数据库迁移路径**：Schema 变更必须通过 `_check_and_migrate_schema()` 或 `init_assets.py` 的迁移逻辑实现，不得直接 DROP/ALTER 生产表。
6. **反检测纪律**：不得引入任何模拟人类点击、DOM 操作、Selenium/Puppeteer 自动化到采集流程。系统采用"人类驾驶浏览器 + AI 监听网络包"策略。
7. **本地绑定**：所有服务（RPC Signer、Dashboard）必须绑定 `127.0.0.1`，不得使用 `0.0.0.0`。

## Protected Files（禁止 AI 自动修改）

以下文件的修改需要人工明确授权：

- `accounts.txt` — 包含手机号和凭证
- `config.local.yaml` — 本地覆盖配置（可能含敏感值）
- `bot_database.db` — 生产数据库
- `AGENTS.md` — 本文件
- `pantheon.json` — 治理配置
- `pantheon.agent.json` — Agent 入口配置
- `rpc_server.js` 中的签名核心逻辑（`initSandbox`、`page.route`、`page.evaluate` 部分）

## Review Required（需人工审查后合并）

以下文件的修改可由 AI 提出，但合并前需要人工审查：

- `config.yaml` — 退避参数、并发数直接影响封号风险
- `spider.py` 中的 `worker_cycle` 函数 — 核心采集逻辑
- `spider.py` 中的 `AccountManager.report_damage` — 账号惩罚策略
- `rpc_server.js` 中的 Express 路由和队列管理

## Risk Classification（风险分级）

| 风险等级 | 文件 | 说明 |
|---------|------|------|
| 🔴 HIGH | `rpc_server.js` | 签名引擎，错误修改导致全线瘫痪 |
| 🔴 HIGH | `spider.py` | 采集核心，错误修改导致封号 |
| 🔴 HIGH | `harvester.py` | 凭证提取，涉及账号安全 |
| 🟡 MEDIUM | `scout.py` | 目标发现，影响采集范围 |
| 🟡 MEDIUM | `config.yaml` | 全局配置，影响系统行为 |
| 🟡 MEDIUM | `dashboard.py` | 监控面板，影响可观测性 |
| 🟢 LOW | `tests/**` | 测试代码，可自由修改 |
| 🟢 LOW | `docs/**` | 文档，可自由修改 |
| 🟢 LOW | `requirements.txt` | 依赖声明 |

## Coding Standards

- Python：遵循 PEP 8，使用 loguru 日志（不用 print），配置通过 `conf()` 读取
- JavaScript：CommonJS（Node signer），Express 路由
- 测试：pytest，每个核心函数必须有对应测试
- 凭证：日志中使用 `dc0[:6] + "****" + dc0[-4:]` 格式脱敏

## Architecture Invariants（架构不变量）

```
┌─────────────┐     HTTP POST      ┌──────────────┐
│ RPC Signer  │◄────────────────────│   Spider     │
│ (Node:3000) │     /get_sign       │  (Python)    │
└─────────────┘                     └──────┬───────┘
       │                                   │
       │ Chromium Sandbox                   │ SQLite WAL
       │ __g._encrypt                       │
       ▼                                   ▼
┌─────────────┐                     ┌──────────────┐
│  知乎 JS    │                     │ bot_database │
│  签名算法   │                     │    .db       │
└─────────────┘                     └──────────────┘
```

- 签名计算**必须**在 Node Chromium 沙盒中完成
- Python 端**只负责**调度、存储、错误处理
- 数据库使用 WAL 模式 + busy_timeout 处理并发
- 所有网络请求必须设置 `proxies={"http": None, "https": None}` 避免系统代理干扰 RPC 通信
