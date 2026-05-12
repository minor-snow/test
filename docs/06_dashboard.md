# 06 · 实时监控仪表盘 (`dashboard.py`)

## 6.1 模块概述

Dashboard 是基于 Flask 的单文件实时监控面板，提供任务队列、账号池、审计日志、缺口记录的可视化，以及 RPC Signer 健康状态和实时日志流。

**源文件**: `dashboard.py` (664 行)  
**运行端口**: `5000`  
**依赖**: Flask  
**前端**: 原生 HTML + CSS + JS (内联在 Python 文件中)

---

## 6.2 REST API 参考

### `GET /api/stats`

系统全局统计，Dashboard 每 3 秒轮询。

**响应**:
```json
{
  "tasks": {
    "total": 47,
    "states": { "READY": 42, "DONE": 3, "BACKOFF": 2 }
  },
  "accounts": {
    "total": 5, "ready": 3, "busy": 1, "dead": 1, "cooling": 0
  },
  "answers": 1234,
  "gaps": { "total": 2, "pending": 1 },
  "rpc": {
    "ok": true,
    "detail": {
      "availableWorkers": 2,
      "queueDepth": 0,
      "totalResolved": 42,
      "signer_version": "browser_hook_v16",
      "last_canary_ok": 1776497292
    }
  },
  "retry_distribution": { "0": 40, "1": 5, "2": 2 },
  "error_distribution": { "HTTP_403_429": 3, "SIGNER_ERROR": 1 },
  "recent_requests": { "total": 100, "ok": 92 },
  "ts": 1776497292
}
```

---

### `GET /api/tasks`

任务队列（最多 100 条），按状态优先级排序。

**响应**: `Array<TaskRow>`

```json
[
  {
    "question_id": "430412906",
    "current_offset": 0,
    "state": "READY",
    "retry_count": 0,
    "attempt_count": 0,
    "last_error_class": null,
    "source_type": "scout",
    "priority": 0
  }
]
```

---

### `GET /api/accounts`

账号池状态。

**响应**: `Array<AccountRow>`

```json
[
  {
    "dc0": "原始值",
    "dc0_masked": "mock_d****22=\"",
    "status": "ACTIVE",
    "trust_score": 90,
    "cooldown_until": 0,
    "is_in_use": 0,
    "cooling_remaining": 0,
    "last_error_class": null
  }
]
```

---

### `GET /api/attempts`

最近 50 条审计记录。

**响应**: `Array<AttemptRow>`

```json
[
  {
    "attempt_id": 42,
    "question_id": "430412906",
    "offset": 0,
    "account_dc0": "mock_d****",
    "signer_version": "browser_hook_v16",
    "http_status": 200,
    "error_class": null,
    "error_detail": "成功 20 条",
    "latency_ms": 328,
    "created_at": 1776497292
  }
]
```

---

### `GET /api/gaps`

缺口记录（最近 50 条）。

**响应**: `Array<GapRow>`

```json
[
  {
    "gap_id": 1,
    "question_id": "123456",
    "offset": 40,
    "reason_class": "FALSE_EMPTY",
    "status": "PENDING",
    "replay_count": 0,
    "first_seen_at": 1776497292
  }
]
```

---

### `GET /api/logs`

最近 80 行 Node Signer 日志。

**响应**: `Array<string>`

---

### `GET /api/log-stream`

SSE (Server-Sent Events) 实时日志推送。

**协议**: `text/event-stream`  
**格式**: `data: [日志行]\n\n`

---

### `GET /`

Dashboard 前端页面。

---

## 6.3 前端 UI 布局

```
┌─ Header ──────────────────────────────────────────────────────────┐
│  ⚡ VNext 采集监控台                          RPC Signer 🟢 HH:MM │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 任务总览 │ │ 已采回答 │ │ 弹药库   │ │ RPC 签名 │ │ 缺口   │ │
│  │ 47 READY │ │ 1234     │ │ 5 账号   │ │ 🟢 在线  │ │ 2      │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ 错误分布     │ │ 重试分布     │ │ 成功率       │             │
│  │ (近1h)       │ │ (柱状图)     │ │ 92.0%        │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
├───────────────────────────────────────────────────────────────────┤
│  实时日志流                                                      │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ [Hook] __g 暴露注入成功 (main.app.0ed760...)           │     │
│  │ [Canary] 验活成功 (128ms, sig=2.0_ePTh...)             │     │
│  └─────────────────────────────────────────────────────────┘     │
├───────────────────────────────────────────────────────────────────┤
│  [任务队列] [审计日志] [账号池] [缺口记录]  ← Tab 切换           │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ QID      Offset  状态   重试  尝试  最后错误  来源     │     │
│  │ 4304...  0       待采   0     0     —        scout    │     │
│  └─────────────────────────────────────────────────────────┘     │
├───────────────────────────────────────────────────────────────────┤
│  知乎 RPC 采集系统 VNext Phase 1 · Dashboard                     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 6.4 刷新频率

| 数据 | 刷新间隔 | 方式 |
|---|---|---|
| 统计卡片 (stats) | 3 秒 | 轮询 |
| 表格 (tasks/attempts/accounts/gaps) | 5 秒 | 轮询 |
| 日志流 | 实时 | SSE |
| 时钟 | 1 秒 | JS setInterval |
