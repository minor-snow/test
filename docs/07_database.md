# 07 · 数据库 Schema 参考

## 7.1 概览

数据库: `bot_database.db` (SQLite 3, WAL 模式)

| 表名 | 用途 | 主键 |
|---|---|---|
| `question_tasks` | 任务状态机 | `question_id` |
| `task_attempts` | 请求审计日志 | `attempt_id` (自增) |
| `replay_gaps` | 缺口回补队列 | `gap_id` (自增) |
| `accounts` | 账号资源池 | `dc0` |
| `raw_answers` | 原始回答数据 | `answer_id` |

备份表（迁移产生，不参与业务）：
- `tasks_v15_backup` — 旧版任务表
- `missing_gaps_v15_backup` — 旧版缺口表

---

## 7.2 `question_tasks` — 任务状态机

```sql
CREATE TABLE question_tasks (
    question_id     TEXT PRIMARY KEY,    -- 知乎问题 ID
    current_offset  INTEGER DEFAULT 0,   -- 当前采集到的 offset
    state           TEXT DEFAULT 'READY', -- 状态机状态
    priority        INTEGER DEFAULT 0,   -- 优先级（越大越先调度）
    attempt_count   INTEGER DEFAULT 0,   -- 总尝试次数（只增不减）
    retry_count     INTEGER DEFAULT 0,   -- 当前连续失败次数（成功清零）
    lease_owner     TEXT,                -- 持有租约的 worker ID
    lease_until     INTEGER DEFAULT 0,   -- 租约到期时间戳
    next_run_at     INTEGER DEFAULT 0,   -- BACKOFF 下次可调度时间
    last_error_class TEXT,               -- 最后一次错误分类
    last_error_detail TEXT,              -- 最后一次错误详情（截断 200 字）
    source_type     TEXT DEFAULT 'manual', -- 来源: manual / scout / expand
    created_at      INTEGER,
    updated_at      INTEGER
);
```

**`state` 取值**:

| 值 | 说明 | 可被调度 |
|---|---|---|
| `READY` | 待采集 | ✅ |
| `LEASED` | 已被 Worker 租出 | ❌ |
| `BACKOFF` | 退避等待中 | ✅ (next_run_at 到期后) |
| `GAP` | 缺口，需回补 | ✅ (低优先级) |
| `DONE` | 完成 | ❌ |
| `QUARANTINED` | 隔离，需人工审查 | ❌ |
| `DEAD` | 永久放弃 | ❌ |

---

## 7.3 `task_attempts` — 请求审计日志

```sql
CREATE TABLE task_attempts (
    attempt_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     TEXT NOT NULL,       -- 关联 question_tasks
    offset          INTEGER NOT NULL,    -- 本次请求的 offset
    account_dc0     TEXT,                -- 使用的账号
    signer_version  TEXT,                -- 签名驱动版本
    http_status     INTEGER,             -- HTTP 状态码 (NULL=网络失败)
    error_class     TEXT,                -- 错误分类 (NULL=成功)
    error_detail    TEXT,                -- 错误详情（截断 200 字）
    latency_ms      INTEGER,             -- 请求耗时(ms)
    created_at      INTEGER NOT NULL     -- Unix 时间戳
);

CREATE INDEX idx_attempts_qid ON task_attempts(question_id);
CREATE INDEX idx_attempts_error ON task_attempts(error_class);
```

**典型查询**:
```sql
-- 某个问题的所有 attempt
SELECT * FROM task_attempts WHERE question_id = '430412906' ORDER BY attempt_id;

-- 近 1 小时错误分布
SELECT error_class, COUNT(*) FROM task_attempts
WHERE error_class IS NOT NULL AND created_at > ?
GROUP BY error_class;
```

---

## 7.4 `replay_gaps` — 缺口回补队列

```sql
CREATE TABLE replay_gaps (
    gap_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     TEXT NOT NULL,
    offset          INTEGER NOT NULL,
    reason_class    TEXT NOT NULL,        -- FALSE_EMPTY / SIGNER_ERROR / FORMAT_ERROR / LEGACY
    source_attempt_id INTEGER,           -- 关联产生此 gap 的 attempt
    status          TEXT DEFAULT 'PENDING', -- PENDING / REPLAYING / RESOLVED / ABANDONED
    replay_count    INTEGER DEFAULT 0,
    first_seen_at   INTEGER NOT NULL,
    last_replayed_at INTEGER,
    UNIQUE(question_id, offset)
);
```

---

## 7.5 `accounts` — 账号资源池

```sql
CREATE TABLE accounts (
    dc0             TEXT PRIMARY KEY,    -- d_c0 Cookie 值 (或完整 Cookie)
    status          TEXT DEFAULT 'ACTIVE', -- ACTIVE / COOLDOWN / DEAD
    cooldown_until  INTEGER DEFAULT 0,   -- 冷却到期时间戳
    trust_score     INTEGER DEFAULT 100, -- 信任分 (0=DEAD)
    is_in_use       INTEGER DEFAULT 0,   -- 是否被 Worker 锁定
    last_leased_at  INTEGER DEFAULT 0,   -- 上次被租出时间
    last_error_class TEXT,               -- 最近一次错误分类
    ban_score       INTEGER DEFAULT 0,   -- 累计处罚分
    last_used_at    INTEGER DEFAULT 0    -- 最近使用时间
);
```

**`status` 取值**:

| 值 | 说明 | 可被选取 |
|---|---|---|
| `ACTIVE` | 正常 | ✅ (且 is_in_use=0, cooldown_until < now) |
| `COOLDOWN` | 冷却中 | ❌ (cooldown_until 到期后自动恢复) |
| `DEAD` | 永久死亡 | ❌ |

---

## 7.6 `raw_answers` — 原始回答数据

```sql
CREATE TABLE raw_answers (
    answer_id   TEXT PRIMARY KEY,     -- 知乎回答 ID
    question_id TEXT,                 -- 所属问题 ID
    content     TEXT,                 -- 原始 HTML 内容
    plain_text  TEXT,                 -- 清洗后纯文本
    raw_json    TEXT                  -- 完整 API 响应 JSON
);
```

---

## 7.7 PRAGMA 配置

```sql
PRAGMA journal_mode = WAL;       -- Write-Ahead Logging
PRAGMA busy_timeout = 5000;      -- 多线程等锁 5 秒
PRAGMA synchronous = NORMAL;     -- 平衡性能与安全
```
