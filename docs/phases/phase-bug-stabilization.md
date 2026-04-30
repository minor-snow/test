# Phase BUG: Trust & Determinism Stabilization

**日期**: 2026-04-30
**状态**: ✅ 已完成并通过重新审计
**定位**: P28-0 与 P28b 之间的全仓库稳定性通道

---

## 1. 目的

`Phase BUG` 是全仓库正确性、确定性、会话完整性、fail-closed 和 Python 假阳性问题的集中修复。不添加新 product surface。

---

## 2. Lockdown 规则

- Phase BUG 期间禁止新 product features
- Critical 和 High 正确性问题不得无书面理由推迟
- Generated state 不是 authoritative
- `latest` 在整个 repair flow 中保持 convenience-only
- 本地 governance 数据保持 local-by-default 并 sanitized

---

## 3. 处置总结

| 指标 | 数值 |
|------|------|
| 审计索引条目总数 | 74 |
| Phase BUG 中修复 | 57 |
| 另一修复已解决的重复项 | 2 |
| 重新审计不可复现 | 3 |
| 有理由的故意例外 | 1 |
| 显式推迟的非阻塞债务 | 11 |
| **Open critical** | **0** |
| **Open high** | **0** |

---

## 4. Wave Map（8 波执行）

| Wave | Focus | 代表性 Issues |
|------|-------|---------------|
| BUG-1 | Security + fail-closed | B2, B15, B18, B20 |
| BUG-2 | Filesystem / locks / session integrity | B1, B5, B6, B14, B17, B31, B40-B43, B49 |
| BUG-3 | Deterministic hash / ID unification | B4, B8-B10, B16, B21-B22, B29, B54 |
| BUG-4 | Repair FSM + governance semantics | B3, B7, B11-B13, B19, B26-B30, B37, B39 |
| BUG-5 | Python correctness cleanup | B23-B25, B32-B36, B45-B47 |
| BUG-6 | Cross-module debt with correctness impact | B38, T1, T7 |
| BUG-7 | Architecture / scripts / test sync | A1, A3-A6, B44, B51-B55, E2-E3 |
| BUG-8 | Final regression + re-audit | tsc, vitest, pack smoke, fresh audit |

---

## 5. 修复详情

### Security and fail-closed
- Shell-string git → argv-safe execution（repair + diff 路径）
- 损坏的 `pantheon.json` 现在 fail-closed 而非静默回退
- Git snapshot 失败现在 surface explicit error state
- 未知 human-audit decisions 被拒绝而非接受

### Session / filesystem integrity
- Lock acquisition 只对 EEXIST 重试
- Session lock ordering 一致，revision monotonicity 强制
- Session FSM transitions 由 transition table 强制
- Atomic writes 清理临时文件，Windows replacement fallback 更安全
- Audit log / human audit writers 确定性创建父目录

### Determinism and hashing
- Repair IDs, scope IDs, Lite contract IDs, feedback IDs, packet IDs, contract IDs 全部使用 stable SHA-256 helpers
- `stableSerialize` / stable hashing 用于 authoritative contract 和 scoped-handoff hashes
- Hash/helper 重复代码合并为 shared deterministic utilities（`src/deterministic.ts`）

### Repair semantics
- Empty suspect surfaces fail-closed
- Reverse-issue findings 不再被 human-review status 遮蔽
- Risk-area dedup 保留合并的 `matched_paths` evidence
- Demo pipeline 对 multi-issue input fail-closed
- Auto-commit pipeline 保存先前遗漏的 human-readable projection

### Python correctness
- Flask 不再复用 FastAPI preset
- Airflow / Prefect 分类为 `workflow_orchestration`
- Python sensitive-path 和 test-mapping 假阳性收窄
- Generic test mapping 覆盖 JS/TSX 变体
- Risk-preset validation 要求更强规则激活

### Architecture and hygiene
- Phase BUG issue index 已编写
- Script families 已分类为 active / internal / deprecated
- Generated-state ignore rules 覆盖本地 governance 目录和 dogfood fixture repos

---

## 6. 重新审计结果

重新审计确认：

- **Open critical findings: 0**
- **Open high findings: 0**
- Full regression: 1,844 / 1,844 tests passing
- Vitest suites: 633 / 633 passing
- `pantheon-alpha doctor`: `Agent-usable repo: yes`

### Fresh Checks Confirmed

- Git 命令执行不再使用 shell-string interpolation
- 损坏的 config 现在 fail-closed
- Session locks 只对 EEXIST 重试
- Session revision monotonicity 强制
- Repair FSM transitions 强制
- Atomic writes 清理 temp files
- 所有 authoritative IDs 使用 stable SHA-256
- Multi-issue pipeline fail-closed

---

## 7. 显式推迟项（11 项）

以下为非阻塞债务，保持可见但不阻塞 P28b：

- A2 (Python 平行架构)
- B50
- T2 (三个并行分类器)
- T3 (两个并行 diff 验证器)
- T4 (ValidationResult 类型碎片化)
- T5 (23 个 Markdown 渲染器)
- T6 (catch 风格混用)
- T8 (agentScopeLiteBuilder SRP 违反)
- T9 (as any 79 处)
- T10 (Non-null 断言 5 处)
- E1 (43% 源文件无测试)

---

## 8. Generated-State Hygiene

以下为 generated state，非 authoritative：
- `.pantheon/governance/`、`.pantheon/reviews/`、`.pantheon/metrics/`
- `.pantheon/repair/runs/`
- dogfood `repo_fixture/` 中的运行时状态

Authoritative repair state 保持：
- Run-scoped `session.json`
- Revisioned `repair_contract.vN.json`
- Append-only repair audit logs

---

## 9. 判词

```
Phase BUG cleared the trust, determinism, session-integrity, and obvious
Python false-positive blockers that would have polluted P28b.

Pantheon is ready to continue with the next Python-readiness stage on a
substantially safer core.

Open critical: 0. Open high: 0. Re-audit: PASS.
```
