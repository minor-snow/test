# Phase 2: Hardening & Recovery Policy

**日期**: 2026-04-25
**状态**: ✅ 已完成
**参考**: HARD-004, 执行宪法 v0.2 §3

---

## 1. 目的

定义 `integrityCheck()` 发现问题后的固定动作。核心原则：`integrityCheck()` 不是"列问题"，而是"定义系统如何停"。每类 finding 都有一个且仅有一个固定动作，不存在"看情况处理"。

---

## 2. 产出

### Severity 体系

| Severity | 含义 | 系统行为 |
|----------|------|----------|
| `corrupt` | 数据完整性已被破坏 | 该资源不可用，Pipeline 必须拒绝 |
| `warning` | 数据完整性未被破坏，但存在异常 | 标记 + 报告，Pipeline 可继续 |

### Finding → Action 映射（corrupt 级别，17 条规则）

覆盖：`canonical_target_missing`、`canonical_parse`、`canonical_shape_invalid`、`revision_parse`、`revision_shape_invalid`、`schema_version_missing`、`schema_version_unknown`、`block_content_hash_mismatch`、`block_hash_computation_error`、`revision_id_filename_mismatch`、`revision_id_recomputation_mismatch`、`revision_id_computation_error`、`parent_chain_broken`、`audit_missing_created`、`audit_missing_canonical_event`、`audit_missing`、`audit_line_parse`、`audit_read_error`

### Finding → Action 映射（warning 级别，2 条规则）

`orphan_revision`、`tmp_leftover`

### Pipeline 集成规则

- **P-IC-01**: Pipeline 启动前 MAY 运行 integrityCheck()，如果 corruptions > 0 则 MUST 拒绝启动
- **P-IC-02**: Pipeline 运行中 MUST NOT 调用 integrityCheck()
- **P-IC-03**: .tmp 检测仅在 pipeline idle 时执行

---

## 3. 验证状态

| 检查 | 状态 |
|------|------|
| integrityCheck 覆盖所有 corrupt 场景 | ✅ |
| Pipeline 启动前检查集成 | ✅ |
| 人类修复流程文档化 | ✅ |

---

## 4. 已知限制

- .tmp 文件无 age-based 自动清理（需先实现写锁）
- IntegrityReport 未持久化
- 无定期调度机制
- corrupt artifact 无自动隔离

---

## 5. 关键决策

```
Phase 2 proved: the system won't silently rot.
Integrity clean = corruptions === 0（自动化门禁）
```
