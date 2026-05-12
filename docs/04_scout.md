# 04 · 侦察兵 (`scout.py`)

## 4.1 模块概述

Scout 是题源发现模块。它通过知乎搜索 API 按 **专业名称 × 情绪关键词** 组合检索，经过三重过滤后将高价值问题坐标写入 `question_tasks` 表。

**源文件**: `scout.py` (159 行)  
**运行方式**: `python scout.py`（一次性执行）  
**依赖**: RPC Signer 必须在线

---

## 4.2 搜索策略

```
搜索矩阵 = TARGET_MAJORS × EMOTION_KEYWORDS

TARGET_MAJORS = ["计算机科学与技术", "土木工程", "环境工程", "临床医学", "法学"]
EMOTION_KEYWORDS = ["劝退", "后悔", "坑", "转行", "就业惨"]

→ 产生 5 × 5 = 25 次搜索请求
```

每次搜索调用知乎搜索 API：
```
GET /api/v4/search_v3?t=general&q={编码后的查询}&correction=1&offset=0&limit=20
```

---

## 4.3 三重过滤机制

| 层级 | 过滤条件 | 丢弃原因 |
|---|---|---|
| **类型过滤** | `type == 'search_result'` && `object.type == 'answer'` | 排除专栏文章和视频 |
| **热度门槛** | `answer_count >= 50` | 样本量太小的题目无统计价值 |
| **相关性鉴权** | 标题包含专业名称前 2 字（如 "计算"、"土木"） | 排除知乎搜索的噪音结果 |

---

## 4.4 反检测措施

| 措施 | 实现 |
|---|---|
| 访客身份伪造 | `generate_fake_dc0()` 生成 22 位随机字符串 + "visitor=" |
| 签名合规 | 通过 RPC Signer 计算合法 `x-zse-96` |
| 请求抖动 | 每次搜索间隔 `random.uniform(2.0, 4.0)` 秒 |
| 身份切换 | 遭遇 401/403 自动切换新 dc0 |
| 代理绕过 | `session.trust_env = False` 绕过系统透明代理 |

---

## 4.5 核心函数

| 函数 | 签名 | 说明 |
|---|---|---|
| `generate_fake_dc0()` | `→ str` | 生成随机访客 Cookie |
| `get_search_signature(session, api_path, dc0)` | `→ str \| None` | 请求 RPC 计算搜索签名 |
| `run_sniper()` | `→ None` | 主函数：遍历搜索矩阵 → 过滤 → 入库 |

---

## 4.6 数据输出

符合条件的问题写入 `question_tasks` 表：

```sql
INSERT OR IGNORE INTO question_tasks
    (question_id, current_offset, state, source_type, created_at, updated_at)
VALUES (?, 0, 'READY', 'scout', ?, ?)
```

## 4.7 配置项

| 常量 | 默认值 | 说明 |
|---|---|---|
| `TARGET_MAJORS` | 5 个专业 | 搜索的目标专业列表 |
| `EMOTION_KEYWORDS` | 5 个关键词 | 搜索的情绪触发词 |
| `MIN_ANSWER_COUNT` | `50` | 最低回答数门槛 |
