# Phase 18.5: Governance Core Hardening

**日期**: 2026-04-29
**状态**: ✅ 已完成

---

## 1. 目的

P18.5 是一次有针对性的 governance 核心加固。不重建 P1-P17 治理系统，而是识别并解决现有治理基础设施中的 3 个真实缺口。

---

## 2. 前置资产发现

治理基础远超初步估计：

| Asset | 状态 | 规模 |
|-------|------|------|
| Gate Completeness Registry (`gateRegistry.ts`) | 已存在 | 649 lines, 14 gates |
| Gate Registry Tests | 已存在 | 186 lines |
| Canonical/Revision Integrity (`integrityCheck.ts`) | 已存在 | 21KB |
| Corruption Tests | 已存在 | 15KB |
| BoundaryGraph Tests | 已存在 | 8.4KB |
| BlastRadius Tests | 已存在 | 5.9KB |
| E2E Tests | 已存在 | 3 files |

此发现将 P18.5 从 7 个子阶段压缩为 4 个。

---

## 3. 产出

### P18.5-A: Field Behavior Registry
**新文件**: `src/governance/fieldBehaviorRegistry.ts`, `test/governance/fieldBehaviorCoverage.test.ts`

注册了 15 个 field behavior 条目，覆盖 7 个 schema。关键负向测试：
- `audit_weight` 不影响 repair verdict
- `agent_hypothesis` 不进入 `confirmed_facts`
- `BugFinding.limitation` 始终设为 v1 常量
- Forbidden scope entries 始终产生 `verdict=fail`

### P18.5-B: Artifact Sanitizer
**新文件**: `src/artifacts/artifactSanitizer.ts`, `src/artifacts/publicArtifactPolicy.ts`, `test/artifacts/artifactSanitizer.test.ts`

检测 8 种违规类型：
- Windows 绝对路径 (critical)
- Unix 用户路径 (critical)
- Secret-like 密钥 (critical)
- Stack traces (high)
- .env 引用 (high)
- Workspace temp 路径 (high)
- Debug payload markers (medium)
- Internal observation dumps (medium)

### P18.5-C: BoundaryGraph / BlastRadius Regression Fixtures
**新文件**: `test/fixtures/governance/boundaryGraphRegressionFixture.ts`, `test/boundary/boundaryGraph.regression.test.ts`, `test/boundary/blastRadius.regression.test.ts`

自包含 fixture：8 nodes, 7 edges, 覆盖所有 graph layers。不依赖真实 handoff packages 或文件系统状态。

### P18.5-D: E2E and Documentation
**新文件**: `test/e2e/repairToAudit.e2e.test.ts`, `docs/governance_invariants.md`

E2E 链: AgentBugReport → BugFinding → RepairContract → HumanAuditDecision → revised contract → diff verification → public artifact sanitization

---

## 4. Regression Anchors

| 指标 | Before | After |
|------|--------|-------|
| Test files | 111 | 127 (+16) |
| Tests | 1,641 | 1,767 (+126) |
| tsc | clean | clean |
| Benchmark | — | 8/8 green |

---

## 5. Verification Checklist（12/12 ✅）

1. fieldBehaviorRegistry exists ✅
2. Critical fields have behavior entries ✅ (10 critical entries)
3. forbidden_behavior has negative tests ✅
4. artifactSanitizer exists ✅
5. Public artifact with local path fails ✅
6. Public artifact with debug payload fails ✅
7. BoundaryGraph regression fixture stable ✅ (14 tests)
8. BlastRadius regression fixture stable ✅ (6 tests)
9. Repair → Audit E2E passes ✅ (10 tests)
10. Public artifact export E2E passes ✅ (3 tests)
11. Gate registry has no uncovered critical gate ✅
12. tsc clean + full Vitest green ✅ (1,767/1,767)

---

## 6. P18.5 证明 vs 未证明

**已证明：**
- Field-level semantic invariants 有机械回归覆盖
- Public artifact 安全（无本地路径、debug payload、secrets）
- Boundary graph 结构稳定性（自包含 fixture）
- Full repair governance chain (bug report → finding → contract → audit → verification)

**未证明：**
- Language adapter 完备性
- Repair 语义正确性
- 多 Agent 并发安全性
- 生产部署安全性
- 所有可能 field behavior 的覆盖
