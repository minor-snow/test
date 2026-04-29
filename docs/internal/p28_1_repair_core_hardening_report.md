# P28.1 Repair Core Hardening Report

## 1. Purpose

P28.1 was a targeted repair core hardening phase. Like P18.5, it did NOT rebuild the repair system. It identified the genuine gaps in the existing repair infrastructure and precisely addressed them.

## 2. Pre-P28.1 Repair Assets Discovered

Research revealed the repair core was significantly more mature than the proposal assumed:

| Asset | Already Existed | Detail |
|---|---|---|
| Glob regex cache | `repairUtils.ts` L36-51 | `globRegexCache` with 2000-entry cap |
| Graph builder caps | `repairRelationGraphBuilder.ts` | 8 per same_package, 50 per suggestion, 200 per suspect |
| `BUG_FINDING_V1_LIMITATION` | `types.ts` L102 | Already wired in `bugFindingBuilder.ts` |
| Builder test files | 7 files | ~40KB total (suspect, graph, impact, scope, checklist, verifier, validator) |
| Task output truncation | `repairTaskRenderer.ts` L46 | `slice(0, 12)` + "N more" summary |

This finding caused P28.1 to be compressed from 6 sub-phases to 3.

## 3. What P28.1 Built

### P28.1-A: Graph Truncation Summary + Limitation Constants

**Modified**: `src/repair/types.ts`, `src/repair/repairRelationGraphBuilder.ts`, `src/repair/repairContractBuilder.ts`, `src/governance/fieldBehaviorRegistry.ts`
**New**: `test/repair/graphTruncation.test.ts`

Key additions:
- `REPAIR_RELATION_GRAPH_V1_LIMITATION` constant — states the graph is a candidate graph, not a dependency graph
- `GraphTruncationEntry` type — records total matches, displayed edges, and omitted count per relation
- `GraphBuildStats` type — records observed files, patterns evaluated, edges before/after dedup, truncation entries, limitation, and duration
- `RepairContract.graph_build_stats` optional field — stores stats alongside edges
- `repairRelationGraphBuilder` refactored to return `{edges, stats}` instead of plain array
- Truncation metadata now recorded for same_package (>8) and risk_preset (>50/200) caps
- Field behavior registry entry for `graph_limitation_constantized`

### P28.1-B: Output Size Control + Sanitizer Wiring

**Modified**: `src/repair/repairTaskRenderer.ts`
**New**: `test/repair/repairOutputSanitizer.test.ts`

Key additions:
- Allowed scope list capped at 25 entries with "N more" summary
- Forbidden scope list capped at 25 entries with "N more" summary
- Graph truncation summary rendered in `repair_task.md` (truncated areas + limitation quote)
- All 4 repair artifact types (task, report, scope, checklist) verified to pass P18.5 artifact sanitizer in public mode

## 4. Regression Anchors

```
Before P28.1:  127 test files / 1,767 tests
After P28.1:   129 test files / 1,780 tests (+2 files, +13 tests)
tsc:           clean (0 errors)
```

## 5. Verification Checklist

| # | Criterion | Status |
|---|---|---|
| 1 | Graph truncation summary with total/displayed/truncated | ✅ |
| 2 | REPAIR_RELATION_GRAPH_V1_LIMITATION wired | ✅ |
| 3 | repair_task.md passes artifact sanitizer | ✅ |
| 4 | repair_report.md passes artifact sanitizer | ✅ |
| 5 | Large scope lists capped with "N more" | ✅ |
| 6 | Graph build timing in stats | ✅ (duration_ms) |
| 7 | fieldBehaviorRegistry has graph limitation entry | ✅ |
| 8 | Existing graph caps (8/50/200) unchanged | ✅ |
| 9 | tsc clean | ✅ |
| 10 | full Vitest green | ✅ 1,780/1,780 |

## 6. What P28.1 Proves

P28.1 proves that the repair core:
- Produces bounded, evidence-based repair artifacts with truncation metadata
- Outputs are compatible with the P18.5 artifact sanitizer
- Graph limitation is constantized to prevent semantic drift
- Existing performance caps (8/50/200) are preserved with transparency (truncation entries)

## 7. What P28.1 Does Not Prove

- Multi-agent concurrency safety (P29)
- GitHub repair mode (P26.5)
- Language adapter coverage (P28b/c/d)
- Real agent compliance (P28.2)
- Large-scale benchmark sweep

---

_P28.1 Repair Core Hardening — completed 2026-04-29._
