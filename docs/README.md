# 知乎 RPC 数据采集系统 · 架构文档

> VNext Phase 1 · 最后更新: 2026-04-19

## 目录

| 文档 | 说明 |
|---|---|
| [README.md](README.md) | 本文件 — 系统全景概览 |
| [01_system_overview.md](01_system_overview.md) | 系统架构总览、数据流、部署拓扑 |
| [02_rpc_signer.md](02_rpc_signer.md) | RPC 签名工厂 (`rpc_server.js`) |
| [03_spider.md](03_spider.md) | 爬虫主程序 (`spider.py`) — 状态机/调度/Worker |
| [04_scout.md](04_scout.md) | 侦察兵 (`scout.py`) — 题源发现 |
| [05_harvester.md](05_harvester.md) | Cookie 提取器 (`harvester.py`) |
| [06_dashboard.md](06_dashboard.md) | 实时监控仪表盘 (`dashboard.py`) |
| [07_database.md](07_database.md) | 数据库 Schema 完整参考 |
| [08_error_taxonomy.md](08_error_taxonomy.md) | 错误分类与响应策略 |
| [09_operations.md](09_operations.md) | 运维手册 — 启动/排障/迁移 |
