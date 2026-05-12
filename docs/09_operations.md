# 09 · 运维手册

## 9.1 环境要求

| 依赖 | 版本要求 | 安装方式 |
|---|---|---|
| Python | 3.10+ | — |
| Node.js | 20+ | — |
| Playwright (Node) | 1.59+ | `npm install` |
| Playwright (Python) | 1.x | `pip install playwright && playwright install chromium` |
| playwright-stealth | 任意 | `pip install playwright-stealth` |
| pyotp | 任意 | `pip install pyotp` |
| Flask | 3.x | `pip install flask` |
| requests | 任意 | `pip install requests` |
| Express | 5.x | `npm install` |

---

## 9.2 首次部署

```bash
# 1. 安装 Node 依赖
cd H:\Analysis\zhihu
npm install

# 2. 安装 Python 依赖
pip install flask requests playwright playwright-stealth pyotp

# 3. 安装 Playwright Chromium
playwright install chromium   # Python 端
npx playwright install chromium  # Node 端

# 4. 初始化数据库
python init_assets.py

# 5. (可选) 填充测试数据
python init_assets.py --seed
```

---

## 9.3 启动顺序

> ⚠️ 必须按顺序启动，否则签名/数据将不可用。

```
步骤 1: node rpc_server.js        # 签名工厂 (port 3000)
        ↓ 等待 "Canary passed" 输出

步骤 2: python dashboard.py       # 监控面板 (port 5000)
        ↓ 可选但推荐

步骤 3: python spider.py          # 爬虫主程序
        ↓ 开始采集

步骤 4: python scout.py           # 侦察兵 (按需)
        ↓ 填充新任务

步骤 5: python harvester.py       # Cookie 提取 (需人工介入)
```

---

## 9.4 常见排障

### Signer 启动后立即退出

**症状**: `node rpc_server.js` 报 `Canary failed`

**排查**:
1. 检查 Chromium 是否安装: `npx playwright install chromium`
2. 检查是否有代理干扰: 关闭 VPN/代理
3. 查看 `node_signer.log` 最后 20 行
4. 尝试手动访问 `https://www.zhihu.com` 确认网络通

---

### Spider 无法签名

**症状**: 审计表大量 `SIGNER_ERROR`

**排查**:
```bash
# 检查 Signer 是否在线
curl http://127.0.0.1:3000/health

# 手动执行 Canary
curl http://127.0.0.1:3000/canary

# 检查签名是否正常
curl -X POST http://127.0.0.1:3000/get_sign \
  -H "Content-Type: application/json" \
  -d '{"url":"/api/v4/questions/123/answers","dc0":"test"}'
```

---

### 大量 401 / 账号全部 DEAD

**症状**: Dashboard 显示所有账号 DEAD

**排查**:
1. Cookie 已过期 → 重新运行 `python harvester.py`
2. 检查 `task_attempts` 表确认是 401 而非其他错误:
```sql
SELECT * FROM task_attempts WHERE error_class = 'HTTP_401' ORDER BY attempt_id DESC LIMIT 10;
```
3. 手工重置账号状态:
```sql
UPDATE accounts SET status = 'ACTIVE', ban_score = 0, cooldown_until = 0 WHERE dc0 = '...';
```

---

### 任务卡在 QUARANTINED

**排查**:
```sql
-- 查看被隔离的任务和最后错误
SELECT question_id, last_error_class, last_error_detail FROM question_tasks WHERE state = 'QUARANTINED';

-- 确认后释放
UPDATE question_tasks SET state = 'READY', retry_count = 0 WHERE question_id = '...';

-- 或永久放弃
UPDATE question_tasks SET state = 'DEAD' WHERE question_id = '...';
```

---

### Dashboard 显示旧数据 / 500 错误

1. 杀死所有 5000 端口进程:
```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}
```
2. 清除 Python 缓存: `Remove-Item -Recurse __pycache__`
3. 重启: `python dashboard.py`

---

## 9.5 数据库维护

### 手动迁移（从旧版升级）

```bash
python init_assets.py
# 自动检测旧 tasks/missing_gaps 表并迁移
# 旧数据备份到 *_v15_backup 表
```

### 查看任务进度

```sql
-- 按状态统计
SELECT state, COUNT(*) FROM question_tasks GROUP BY state;

-- 查看重试次数分布
SELECT retry_count, COUNT(*) FROM question_tasks
WHERE state NOT IN ('DONE','DEAD')
GROUP BY retry_count;

-- 近 1 小时错误分布
SELECT error_class, COUNT(*) FROM task_attempts
WHERE created_at > strftime('%s','now') - 3600 AND error_class IS NOT NULL
GROUP BY error_class;
```

### 数据库备份

```powershell
# SQLite WAL 模式下需要 checkpoint 后再备份
sqlite3 bot_database.db "PRAGMA wal_checkpoint(TRUNCATE);"
Copy-Item bot_database.db bot_database_backup_$(Get-Date -Format yyyyMMdd).db
```

---

## 9.6 port 一览

| 端口 | 服务 | 进程 |
|---|---|---|
| `3000` | RPC Signer | `node rpc_server.js` |
| `5000` | Dashboard | `python dashboard.py` |
