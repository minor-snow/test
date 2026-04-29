# Pantheon Phase 2: Hardening & Recovery Policy

ref: HARD-004, 执行宪法 v0.2 §3

## 0. 文档目的

本文档定义 `integrityCheck()` 发现问题后的固定动作。

**核心原则**：`integrityCheck()` 不是"列问题"，而是"定义系统如何停"。
每类 finding 都有一个且仅有一个固定动作。不存在"看情况处理"。

如果需要新增 finding 类型，必须先在本文档定义其 action，再写检测代码。

---

## 1. Severity 定义

| Severity | 含义 | 系统行为 |
|----------|------|----------|
| `corrupt` | 数据完整性已被破坏 | **该资源不可用**。Pipeline 必须拒绝使用该 revision/artifact。 |
| `warning` | 数据完整性未被破坏，但存在异常 | **标记 + 报告**。Pipeline 可继续运行，但报告必须可见。 |

---

## 2. Finding → Action 映射表

### 2.1 corrupt 级别

| check | finding | 固定动作 | 禁止行为 |
|-------|---------|----------|----------|
| `canonical_target_missing` | canonical 指向不存在的 revision | 标记 artifact 为 `corrupt`。拒绝所有对该 artifact 的读写操作。 | 禁止自动回退到上一个 revision。 |
| `canonical_parse` | canonical pointer 文件不可解析 | 标记 artifact 为 `corrupt`。拒绝所有操作。 | 禁止猜测或重建 pointer。 |
| `canonical_shape_invalid` | canonical pointer 文件可解析但不是合法对象（null / array / primitive / 缺 `current_revision_id` / 缺 `artifact_id` / `artifact_id` 与文件名不一致） | 标记 artifact 为 `corrupt`。等同于 canonical_parse——pointer 不可信。 | 禁止从损坏的 pointer 中推断 revision_id。 |
| `revision_parse` | revision JSON 不可解析 | 标记该 revision 为 `corrupt`。如果该 revision 是 canonical，标记 artifact 为 `corrupt`。 | 禁止忽略该 revision 继续处理。 |
| `revision_shape_invalid` | revision 文件可解析但结构无效（null / array / primitive / 缺 `sections` / `commitments` 缺失或非数组） | 标记该 revision 为 `corrupt`。跳过该 revision 的 hash 和 revision_id 校验。扫描继续处理其他 revision。 | 禁止对无效结构强行执行 hash 计算（会导致 scan abort）。 |
| `schema_version_missing` | revision 文件完全没有 `schema_version` 字段 | 标记该 revision 为 `corrupt`。 | 禁止假定默认 schema_version。 |
| `schema_version_unknown` | revision 的 schema_version 未注册 | 标记该 revision 为 `corrupt`。如果该 revision 在 canonical path 上，标记 artifact 为 `corrupt`。 | 禁止 fallback 到最接近的已知 schema。 |
| `block_content_hash_mismatch` | block 内容与 hash 不一致 | 标记该 revision 为 `corrupt`。该 revision 的所有 block 数据不可信。 | 禁止自动重算 hash 并覆盖。 |
| `block_hash_computation_error` | block hash 重算过程中抛出异常 | 标记该 revision 为 `corrupt`。block 结构可能损坏到无法计算 hash。 | 禁止忽略异常继续处理该 revision 的其他 block。 |
| `revision_id_filename_mismatch` | 文件名与文件内 revision_id 不一致 | 标记该 revision 为 `corrupt`。 | 禁止自动 rename 文件。 |
| `revision_id_recomputation_mismatch` | 重算 revision_id 与存储值不一致 | 标记该 revision 为 `corrupt`。内容可能被篡改。 | 禁止自动更新 revision_id。 |
| `revision_id_computation_error` | revision_id 重算过程中抛出异常 | 标记该 revision 为 `corrupt`。revision 结构可能损坏到无法计算 id。 | 禁止忽略异常假定 revision_id 正确。 |
| `parent_chain_broken` | parent_revision_id 指向不存在的 revision | 标记该 revision 为 `corrupt`（链断裂）。 | 禁止自动清除 parent 指针。 |
| `audit_missing_created` | 有 canonical 的 artifact 缺 `artifact_created` 事件 | 标记 artifact 为 `corrupt`。创建历史不可追溯。 | 禁止自动补写 audit entry。 |
| `audit_missing_canonical_event` | canonical revision 没有对应的 canonicalization event（`artifact_created` / `canonical_updated` / `override_applied`）。注意：`patch_applied` 不算 canonicalization event，它只能证明 candidate 被创建，不能证明被提升为 canonical。 | 标记 artifact 为 `corrupt`。可能是 partial write（pointer 更新后 audit 写入前 crash）。 | 禁止将 `patch_applied` 视为 canonicalization 证据。禁止自动补写 audit entry。 |
| `audit_missing` | 有 canonical 但完全没有 audit log | 标记 artifact 为 `corrupt`。 | 禁止自动创建空 audit log。 |
| `audit_line_parse` | audit log 中某行不可解析 | 标记该行为 `corrupt`。不影响其他行的读取。 | 禁止删除该行。 |
| `audit_read_error` | audit log 文件不可读 | 标记 artifact 为 `corrupt`。 | 禁止忽略 audit log 继续操作。 |

### 2.2 warning 级别

| check | finding | 固定动作 | 禁止行为 |
|-------|---------|----------|----------|
| `orphan_revision` | revision 不在 canonical 的 parent chain 上 | **保留文件，报告 warning**。不删除、不隐藏。 | 禁止自动删除 orphan。禁止静默忽略。 |
| `tmp_leftover` | `.tmp` 文件残留 | **标记 warning，禁止静默覆盖**。报告文件路径。 | 禁止自动删除（可能是正在进行的原子写入）。禁止将 `.tmp` 视为有效数据。 |

---

## 3. Pipeline 集成规则

### 3.1 Pipeline 启动前检查

```
规则 P-IC-01:
Pipeline 启动前 MAY 运行 integrityCheck()。
如果运行且 summary.corruptions > 0，Pipeline MUST 拒绝启动。
如果运行且 summary.warnings > 0，Pipeline MAY 继续但 MUST 在 cockpit 展示 warnings。
```

### 3.2 Pipeline 运行中不检查

```
规则 P-IC-02:
Pipeline 运行过程中 MUST NOT 调用 integrityCheck()。
原因：避免与 atomicWriteJson 的 .tmp → rename 窗口冲突。
integrityCheck() 只在 pipeline idle 状态调用。
```

### 3.3 .tmp 文件的 race condition

```
规则 P-IC-03:
.tmp 检测应仅在 pipeline 确认 idle 时执行。
如果需要更精确判断，可添加 age 阈值（如 >30s），
但 MVP 不实现自动判断——全部报告为 warning，由人类决定。
```

---

## 4. 人类修复流程

当 `integrityCheck()` 报告 `corrupt` finding 时：

```
步骤 1: 人类查看 IntegrityReport
步骤 2: 人类决定修复方案：
  a) 从已知 good revision 重建 canonical pointer
  b) 从备份恢复 revision 文件
  c) 标记该 artifact 为废弃，从头创建
步骤 3: 人类执行修复
步骤 4: 重新运行 integrityCheck() 验证
步骤 5: 如果 summary.corruptions === 0，Pipeline 可恢复
```

**禁止**：

- 禁止自动修复任何 `corrupt` finding
- 禁止在未通过 integrityCheck 的状态下运行 pipeline
- 禁止把修复操作藏在不产生 audit entry 的路径里

---

## 5. 未来扩展（不在 Phase 2 范围内）

- `integrityCheck()` 的定期调度（cron / 每次 deploy 后）
- corrupt artifact 的自动隔离（移到 `/quarantine/artifacts/`）
- IntegrityReport 的持久化（存到 `/audit/integrity/` 目录）
- `.tmp` 文件的 age-based 自动清理（需要先实现写锁）

这些扩展必须先回到本文档更新 policy，再写代码。
