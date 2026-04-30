# Phase 28.1: Repair Core Hardening

**日期**: 2026-04-29
**状态**: ✅ 已完成

---

## 1. 目的

P28.1 是一次有针对性的 repair 核心加固。不重建 repair 系统，而是识别并解决现有 repair 基础设施中的真实缺口。

---

## 2. 前置资产发现

Repair 核心远超 proposal 假设：

| Asset | Detail |
|-------|--------|
| Glob regex cache | `repairUtils.ts` — 2000-entry cap |
| Graph builder caps | 8/same_package, 50/suggestion, 200/suspect |
| `BUG_FINDING_V1_LIMITATION` | 已在 `bugFindingBuilder.ts` 中接入 |
| Builder test files | 7 files, ~40KB total |
| Task output truncation | `slice(0, 12)` + "N more" summary |

此发现将 P28.1 从 6 个子阶段压缩为 3 个。

---

## 3. 产出

### P28.1-A: Graph Truncation Summary + Limitation Constants

**修改**: `src/repair/types.ts`, `src/repair/repairRelationGraphBuilder.ts`, `src/repair/repairContractBuilder.ts`, `src/governance/fieldBehaviorRegistry.ts`
**新增**: `test/repair/graphTruncation.test.ts`

- `REPAIR_RELATION_GRAPH_V1_LIMITATION` 常量——声明 graph 是 candidate graph 不是 dependency graph
- `GraphTruncationEntry` 类型——记录 total matches、displayed edges、omitted count per relation
- `GraphBuildStats` 类型——记录 observed files、patterns evaluated、edges before/after dedup、truncation entries、limitation、duration
- `RepairContract.graph_build_stats` 可选字段
- Truncation metadata 记录 same_package (>8) 和 risk_preset (>50/200) caps
- Field behavior registry entry for `graph_limitation_constantized`

### P28.1-B: Output Size Control + Sanitizer Wiring

**修改**: `src/repair/repairTaskRenderer.ts`
**新增**: `test/repair/repairOutputSanitizer.test.ts`

- Allowed scope list 上限 25 entries（附 "N more" summary）
- Forbidden scope list 上限 25 entries（附 "N more" summary）
- Graph truncation summary 在 `repair_task.md` 中渲染
- 全部 4 种 repair artifact 类型通过 P18.5 artifact sanitizer（public mode）

---

## 4. Regression Anchors

| 指标 | Before | After |
|------|--------|-------|
| Test files | 127 | 129 (+2) |
| Tests | 1,767 | 1,780 (+13) |
| tsc | clean | clean |

---

## 5. Verification Checklist（10/10 ✅）

1. Graph truncation summary with total/displayed/truncated ✅
2. REPAIR_RELATION_GRAPH_V1_LIMITATION wired ✅
3. repair_task.md passes artifact sanitizer ✅
4. repair_report.md passes artifact sanitizer ✅
5. Large scope lists capped with "N more" ✅
6. Graph build timing in stats (duration_ms) ✅
7. fieldBehaviorRegistry has graph limitation entry ✅
8. Existing graph caps (8/50/200) unchanged ✅
9. tsc clean ✅
10. Full Vitest green (1,780/1,780) ✅

---

## 6. P28.1 证明 vs 未证明

**已证明：**
- Repair core 产出有界的、基于证据的 repair artifacts（含 truncation metadata）
- 输出与 P18.5 artifact sanitizer 兼容
- Graph limitation 已常量化以防语义漂移
- 现有 performance caps (8/50/200) 在透明性下得以保留

**未证明：**
- Multi-agent concurrency safety (P29)
- GitHub repair mode (P26.5)
- Language adapter coverage (P28b/c/d)
- Real agent compliance (P28.2)
- Large-scale benchmark sweep
