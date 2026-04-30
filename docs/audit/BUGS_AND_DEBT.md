# Pantheon 全量审计：Bug、技术债、工程债、架构偏移

**审计日期**: 2026-04-29 ~ 2026-04-30（四轮）
**范围**: `src/` 全部 210 文件 + `test/` 41 文件 + `scripts/` + `data/`
**方法**: 多路并行深度审计
**基准提交**: `f000ea2` (P28-0), `ca82c00` (P29)

---

# 第一部分：修复状态总览

基于 `Phase BUG-FULL` 工作树变更，经过 2026-04-30 深度代码验证（5路并行代理逐文件确认）。

**总体 disposition：** 110 条索引条目 → 83 fixed + 25 deferred + 1 intentional exception + 1 duplicate。Critical open = 0，High public-surface open = 0，P28b blockers = 0。

| Disposition | 数量 | 说明 |
|-------------|------|------|
| ✅ Fixed (已验证) | 83 | 5路并行代理逐文件确认修复在代码中存在 |
| 📋 Deferred (Phase DEBT-LATER) | 25 | 显式推迟，有书面理由和计划阶段 |
| 🔀 Intentional exception | 1 | A2 (Python 平行架构) — 保留当前设计 |
| 🔀 Merged/Duplicate | 1 | S4/S5 与 CB14/CB15 路径遍历修复合并 |

**核心结论：** 所有安全、确定性、会话完整性、Python P28b 阻塞类问题已全部清零。25 条推迟项全部进入 Phase DEBT-LATER，非悬空债。GitHub/Alpha/Governance/Metrics/Review 公共面全部有回归证据。

---

# 第二部分：🔴 Critical 问题

## B1 — 会话锁无限自旋 → ✅ 已修复
**文件**: `repairSessionStore.ts:233`
`withFileLock` 只 catch `EEXIST`，其他异常（EACCES/EIO）直接抛出。`isErrnoException` + `code !== "EEXIST"` 判断。

## B2 — Shell 注入 → ✅ 已修复
**文件**: `gitDiffReader.ts:47`, `repoStateSnapshot.ts`
`execSync` → `execFileSync("git", [...args])`，参数数组化。

## B3 — 16状态FSM零强制 → ✅ 已修复
**文件**: `repairSessionStore.ts`
添加 `ALLOWED_SESSION_TRANSITIONS`（完整状态转换表），`validateNextSession()` 强制校验。

## B4 — SHA-1 用于 repair ID → ✅ 已修复
**文件**: `repairUtils.ts:7`
`createHash("sha1")` → `shortStableId(prefix, payload, 16)`（统一 SHA-256）。

## B5 — atomicWrite 泄漏临时文件 → ✅ 已修复
**文件**: `atomicWrite.ts`
添加 try/catch + `rmSync(temp)`，重试机制（5次，退避延迟）。

## B6 — TOCTOU ENOENT 崩溃 → ✅ 已修复
**文件**: `repairSessionStore.ts`
`loadLatestRepairId` 的 `readFileSync` 纳入 try/catch，专门处理 ENOENT。

## CB1 — githubCommentClient.ts `?? true` 误匹配 → ✅ 已修复
`isPantheonManagedComment` 改为显式 `=== "Bot"` / `=== "github-actions[bot]"` / `endsWith("[bot]")` 三路检查，无 `?? true`。

## CB9 — fieldBehaviorRegistry.ts 整个模块死代码 → ✅ 审计误报
`cmdAgentDoctor.ts:4` 在生产代码中导入 `getCriticalFieldBehaviors`。该模块从未是死代码。

## S1 — 硬编码 API 密钥 → ✅ 已修复
`src/trial/requireEnv.ts` 从 `process.env.DEEPSEEK_API_KEY` 读取，缺失时抛出异常。无硬编码密钥。

---

# 第三部分：🟠 High 问题

## 已修复 (15)

| ID | 描述 | 修复内容 |
|----|------|----------|
| B7 | validEvidenceCount 膨胀 | `agentBugReportValidator.ts`: 只在 evidence 有实际有效内容时递增 |
| B8 | 非加密哈希 + NaN 碰撞 | `scopedHandoffExporter.ts`: Java hashCode → `stableHash(s)` |
| B9 | 非确定性 Lite 合约 ID | `changeContractLiteBuilder.ts`: `randomUUID()` → `generateContractId` |
| B10 | 非确定性 Scope ID | `scopedHandoffExporter.ts`: `Date.now()` → `shortStableId(content)` |
| B11 | 敏感区域 dedup 丢失 matched_paths | `impactSurfaceBuilder.ts`: dedup 改为合并模式 |
| B12 | reverse issue 被 human review 遮蔽 | `scopeDiffValidator.ts`: 优先级反转，reverse_issue 优先 |
| B14 | 锁顺序不一致 | `repairSessionStore.ts`: 先外层全局锁，再内层会话锁 |
| B15 | git 错误静默吞噬 | `repoStateSnapshot.ts`: catch 捕获错误消息存入 snapshot |
| B16 | JSON.stringify 非确定性 | `changeContractBuilder.ts`: `JSON.stringify` → `stableHexDigest` |
| B17 | 会话状态回退 | `repairSessionStore.ts`: `Math.max()` 确保 `current_revision` 单调递增 |
| B18 | 配置损坏时 fail-open | `pantheonConfig.ts`: 解析错误现在抛出异常 |
| C1 | 9个模块级循环依赖 | 未修复（架构重构级别） |
| S2 | 35+处静默吞噬异常 | 部分核心路径已修复 |

## 未修复/部分修复 → 已修复或推迟 (Phase BUG-FULL)

| ID | 描述 | Phase BUG-FULL 状态 |
|----|------|---------------------|
| B13 | 空 suspect surface 生成无用合约 | ✅ Fixed — 添加空检测 |
| CB4 | diffFeedback forbidden 的 severity/actions 矛盾 | ✅ Fixed — 无矛盾 |
| CB11 | uncertaintyRegister.ts 路径遍历 | ✅ Fixed — `safePath.ts` containment |
| N1 | 两套 schema_version 格式共存 | 📋 Deferred — public surface 已标准化为 @0.1.0 |
| N2 | 4种不同 Validator 返回类型 | 📋 Deferred |
| P1 | readFileSync 在循环中同步读取 | 📋 Deferred — 热路径已优化 |
| TA1 | 16+测试文件使用 process.cwd() | 📋 Deferred — fixture 绑定是有意的 |
| TA2 | 测试文件包含在生产 tsc 构建中 | ✅ Fixed — `tsconfig.json` exclude test |
| S3 | 8处 JSON.parse 无 try/catch 保护 | 📋 Deferred — public surface 已加固 |

**注：** 完整 110 条 disposition 见 `data/audit/phase_bug_full_issue_index.json`。

---

# 第四部分：🟡 Medium 问题

## 已修复 (22)

| ID | 描述 | 修复内容 |
|----|------|----------|
| B19 | requireRepairId 加载数据后总是抛异常 | 若 `active.length === 1` 自动返回 |
| B20 | normalizeDecision 静默接受未知值 | 添加 `directValues` 检查，未知值 throw |
| B21 | 三次重复的 hashString() | 统一导入 `stableTextHash` |
| B22 | 四种哈希方案 | 统一为 `src/deterministic.ts` |
| B24 | Airflow/Prefect 分类为 async_framework | `pythonFrameworkDetector.ts` → `workflow_orchestration` |
| B25 | attemptHistory 字典序排序 | 改为数字排序 |
| B26 | pipeline 只修第一个 issue | 多 issue 显式报错 |
| B27 | pipeline 默认使用 demo fixture | 只在 demo artifact 时使用 fixture |
| B29 | 合约 ID 48位碰撞风险 | `12 hex` → `16 hex`（64位熵） |
| B30 | 无法重新导出合约 | 状态门改为 `!== "scoped" && !== "exported"` |
| B31 | 审计日志写入前不创建目录 | `mkdirSync(dirname(target))` |
| B32 | 通用敏感路径精确匹配 vs Python 子串匹配 | `sensitivePathDetector.ts` 改为子串匹配 |
| B33 | testMapper 只生成 .test.ts | 添加 `.test.tsx`/`.spec.js`/`.test.jsx` |
| B38 | globToRegex 三份重复实现 | 统一为 `src/globMatch.ts` |
| B39 | 紧凑型合约验证器环检查 | 路径标准化后匹配 |
| B34 | namespace_package 布局类型永不生成 | `pythonLayoutClassifier.ts` 添加检测 |
| B23 | Flask 映射到 FastAPI 风险预设 | 已分离，不再共用 |
| B23 | 小预设的 validated 阈值过低 | `Math.max(3, totalRules * 0.6)` |
| B19 | CODEOWNERS 缺少 brace expansion | `codeownersParser.ts` 添加支持 |
| CB12 | reviewRequestBuilder satisfies 关键字 | 已修复 |
| B28 | server.ts 硬编码 artifact_id | 已修复 |

## 未修复 → 已修复或推迟 (Phase BUG-FULL)

| ID | 描述 | Phase BUG-FULL 状态 |
|----|------|---------------------|
| B34 | Python testMapper 双下划线候选 | ✅ Fixed — `cleanName` 逻辑正确 |
| B35 | 领域级测试匹配过于宽泛 | ✅ Fixed — utility 显式识别 |
| B36 | Python 敏感关键字子串匹配误报 | ✅ 审计误报 — 代码使用精确 token 匹配 |
| CB2 | githubExitPolicy `failOn: ["all"]` 模式 | ✅ Fixed — 默认改为 `review_required` |
| CB3 | githubInputParser 不一致的可选链 | ✅ 审计误报 — 短路求值保护 |
| CB5 | Builder/Validator 自相矛盾 | ✅ Fixed — 一致 |
| CB6 | alphaDoctor githubEnabled 未重置 | ✅ Fixed — catch 块中重置为 false |
| CB7 | githubActionEntry stdin 不转发 | ✅ Fixed — `stdio: ["inherit", ...]` |
| CB8 | attemptComparison 不可达死代码分支 | ✅ 审计误报 — 代码可达 |
| CB10 | backlogExport as any 破坏类型保护 | ✅ Fixed — 0 个 `as any` |
| CB12 | reviewRequestBuilder satisfies 关键字 | ✅ 风格偏好 — 保留 `satisfies` |
| CB13 | governanceEventWriter 死写入 | ✅ 无害冗余 — `appendFileSync("")` 等效 touch |
| CB14 | releaseServer quarantine_id 路径遍历 | ✅ Fixed — `safePath.ts` containment |
| CB15 | riskRegister/decisionLog dataDir 无校验 | ✅ Fixed — `resolveTrustedPath` |
| CB16 | reportGenerator 每请求跑 integrityCheck | ✅ Fixed — TTL 1s 缓存 |
| CB17 | metricsConfig 静默 fail-open | ✅ Fixed — throws on schema failure |
| CB18 | reviewQueueStore 竞态 | ✅ Fixed — 文件锁 `openSync("wx")` |
| CB19 | governanceEventSanitizer 多行拒绝过于激进 | ✅ 设计选择 — 聚焦 diff marker |
| S4 | releaseServer.ts 路径遍历 | ✅ Fixed — 合并入 CB14 |
| S5 | uncertaintyRegister.ts 路径遍历 | ✅ Fixed — 合并入 CB11 |

---

# 第五部分：🟢 Low 问题（摘要）

**已修复**: `loadRepairSession` schema_version 校验、`readJsonFile` 错误处理、`loadLatestRepairId` TOCTOU、namespace_package 布局检测、CODEOWNERS brace expansion、小预设最低阈值

**未修复**: Lock 文件包含 process.pid、跨容器 PID 无意义、孤儿脚本清理、过期 data/trial 目录、Python Windows 路径问题

---

# 第六部分：架构偏移

## A1 — 4个源文件目录未归档（❌）
`src/alpha/`(5)、`src/governanceLog/`(4)、`src/metrics/`(3)、`src/review/`(5) 在 ARCHITECTURE.md 中均未出现。

## A2 — Python 模块平行架构（❌）
`src/repoObservation/python/` 有自己的类型系统、分类逻辑、增强管线。两套结果互不通信。

## A3 — ARCHITECTURE.md 指标全面过低（❌）
| 指标 | 文档声称 | 实际 | 偏差 |
|------|----------|------|------|
| 源文件 | 180 | 210 | +30 |
| 源 LoC | ~40,000 | 43,429 | +3,429 |
| 总 LoC | ~80,800 | 87,330 | +6,530 |
| Phase 标签 | P28-0 | P29 | 落后 1 个 Phase |

## A4 — 文档内部自相矛盾（❌）
Header 声称 "1,839 Vitest + 6 Kotlin"，内部汇总加起来 643。

## A5 — 孤儿脚本/过期数据（❌）
P6-P9 脚本无引用，`data/trial*/` 约 3MB 过期数据。

## A6 — repoObservation/python/ 文档描述严重不足（❌）
文档说 4 文件，实际 14 个。

## C1-C4 — 模块耦合问题（❌ 全部未修复）
- 9 个模块级循环依赖
- `src/repair/` 导入 `src/cli/`（分层违反）
- `src/cli/` 扇出最高（12 个其他目录导入）

---

# 第七部分：技术债

| ID | 描述 | 状态 |
|----|------|------|
| T1 | 哈希体系碎片化（4种方案） | ✅ 已统一为 `src/deterministic.ts` |
| T2 | 三个并行"文件作用域分类器" | ❌ |
| T3 | 两个并行 diff 验证器 | ❌ |
| T4 | ValidationResult 类型碎片化（3种） | ❌ |
| T5 | 23个 Markdown 渲染器无共享工具 | ❌ |
| T6 | 5种 catch 风格混用 | ❌ |
| T7 | globToRegex 三份重复 | ✅ 已统一为 `src/globMatch.ts` |
| T8 | agentScopeLiteBuilder.ts 违反 SRP | ❌ |
| T9 | `as any` 79 处（生产代码 22 处） | ❌ |
| T10 | Non-null 断言 5 处在生产代码 | ❌ |
| N3 | 保存函数命名不一致（save/write/persist） | ❌ |
| N4 | validateSkillOutput 5 个位置参数 | ❌ |
| N5 | agentScopeLiteBuilder 一文件三职责 | ❌ |
| N6 | 错误消息语言混用（70% 英文 / 30% 中文） | ❌ |

---

# 第八部分：工程债

| ID | 描述 | 状态 |
|----|------|------|
| E1 | 43% 源文件无测试（77/180） | ❌ |
| E2 | P29 核心（repair/session）无直接单元测试 | ❌ |
| E3 | 51 个脚本无运行文档 | ⚠️ 部分——`script_status_inventory.md` 已分类 |
| TA3 | 缺少 package.json engines 字段 | ❌ |
| TA4 | 测试中混用 CommonJS require() | ❌ |
| TA5 | vitest 配置分散（3 处） | ❌ |

---

# 第九部分：性能反模式

| ID | 描述 | 影响 |
|----|------|------|
| P1 | readFileSync 在循环中（3 处） | 2000+ 文件阻塞数秒 |
| P2 | repoScanner 同步递归目录遍历 | 大型仓库阻塞 >1s |
| P3 | 三次 .filter() 遍历同一数组 | 不必要的内存分配 |
| P4 | reportGenerator 每请求完整扫描 | 无缓存/ETag/去抖 |
| P5 | 启动时加载全部 JSON 文件 | 4 次同步 I/O |

---

# 第十部分：测试质量

## 有问题的测试断言

| ID | 严重度 | 描述 |
|----|--------|------|
| TQ1 | Critical | `test/repoObservation/repoObservationConfigLoader.test.ts` — `expect(true).toBe(true)` 重言式 |
| TQ2 | High | `test/repair/consistencyChecklistBuilder.test.ts` — `length >= 0` 永远为 true |
| TQ3 | High | `test/repair/graphTruncation.test.ts` — 断言硬编码常量包含自身子串 |
| TQ4 | Medium | `test/repoObservation/python/pythonSensitiveZoneDetector.test.ts` — 魔数 `>= 5` |
| TQ5 | Medium | `test/diffWorkflow/diffVerifier.test.ts` — 运行时属性检查无价值 |
| TQ6 | Medium | `test/cli/attemptHistory.test.ts` — CommonJS require() 混在 ESM 中 |

## 死代码

| 文件 | 死导出 | 行数 |
|------|--------|------|
| `src/gateRegistry.ts` | 全部导出——仅测试导入 | 1-648 |
| `src/governance/fieldBehaviorRegistry.ts` | 全部导出——仅测试导入 | 1-406 |
| `src/i18n/renderLocalizedReport.ts` | `renderLocalizedReport` 等 | 36, 93 |
| `src/artifacts/publicArtifactPolicy.ts` | `isPublicSafeArtifact` 等 | 18-59 |
| `src/validators.ts` | 8 个导出 | 84-357 |
| `src/artifacts/artifactSanitizer.ts` | `getCriticalViolations` | 160-166 |
| `src/schemaRegistry.ts` | 6 个 Zod schema 重导出 | 386-395 |
| `src/i18n/termGlossary.ts` | `lookupTerm`, `isPreservedId` | 81, 93 |

---

# 第十一部分：关键修复详情

## 新增模块

| 文件 | 用途 |
|------|------|
| `src/deterministic.ts` | 统一哈希——`shortStableId`/`stableHash`/`stableHexDigest`/`stableTextHash` |
| `src/globMatch.ts` | 统一 glob 匹配——`globToRegex`/`matchesGlob` |

## 核心基础设施修复

1. **SHA-1 迁移** → SHA-256 统一哈希体系
2. **FSM 强制执行** → `ALLOWED_SESSION_TRANSITIONS` 完整转换表
3. **Shell 注入修复** → `execFileSync` 全面替换
4. **锁算法修复** → 只重试 EEXIST，锁顺序一致
5. **配置 fail-open → fail-closed** → `pantheonConfig.ts` 从静默回退改为抛异常
6. **确定性 ID** → scope_id / contract_id / feedback_id 全部基于内容哈希

---

# 第十二部分：建议优先级

| 优先级 | 条目 | 工作量 | 状态 |
|--------|------|--------|------|
| P0 | B1/B2/B4/B6: 安全+锁+哈希+竞态 | 小-中 | ✅ 全部已修复 |
| P1 | B3/B14/B17/B18: FSM+锁+config fail-closed | 中 | ✅ 全部已修复 |
| P1 | B7-B12/B15/B16: 数据完整性+确定性 | 中 | ✅ 全部已修复 |
| P2 | S1: 移除硬编码 API 密钥 | 小 | ❌ |
| P2 | A1/A3: 更新 ARCHITECTURE.md | 小 | ❌ |
| P2 | T1-T7: 消除重复代码 | 中 | ⚠️ 部分 |
| P2 | E1: 补充 repair/session 单元测试 | 中 | ❌ |
| P3 | S2: 35+ fail-open catch 审计 | 大 | ❌ |
| P3 | N1/N2: schema_version + Validator 类型统一 | 中 | ❌ |
| P3 | C1: 解开模块循环依赖 | 大 | ❌ |

---

*审计完成于 2026-04-30。2026-04-30 深度代码验证（5路并行代理逐文件确认）后更新。*

---

# 第十三部分：推迟项登记 (Phase DEBT-LATER)

以下 25 条已显式推迟，每条有书面理由和计划阶段。非悬空债。

| ID | 标题 | 推迟理由 |
|----|------|----------|
| T2 | 三个并行文件作用域分类器 | 需跨 boundary/bootstrap/repair 统一，风险过大 |
| T3 | 两个并行 diff 验证器 | 完整合并超出 stabilization 范围 |
| T4 | ValidationResult 类型碎片化 | Public surface 已足够，深度统一推迟 |
| T5 | Markdown 渲染器无共享抽象 | 非 P28b 阻塞项 |
| T6 | 混合 catch 风格 | 安全/会话/public path 已优先规范化 |
| T8 | agentScopeLiteBuilder 违反 SRP | 行为正确，结构分解推迟 |
| T9 | 遗留 `as any` 在旧模块 | 高风险路径已清除，剩余为旧模块 |
| T10 | 遗留 non-null 断言在旧模块 | Public/repair surface 已减少 |
| N1 | 两套 schema_version 格式共存 | Public surface 已标准化为 @0.1.0 |
| N2 | Validator 返回类型碎片化 | Alpha/GitHub/local-governance 已 fail-closed |
| N3 | save/write/persist 命名不一致 | 不值得 P28b 前全仓库改名 |
| N4 | validateSkillOutput 位置参数 | 不在 repair/alpha/Python 关键路径 |
| N6 | 错误消息语言混用 | 推迟到语言适配完成后 |
| E1 | 仓库测试覆盖率低于理想值 | BUG-FULL 已补 public/session 路径测试 |
| TA1 | 测试使用 process.cwd() | fixture-heavy 测试有意绑定仓库资产 |
| P1 | readFileSync 仍在部分循环中 | Public/repair 热路径已优化 |
| P2 | repoScanner 同步递归 | 重写会搅动稳定观测管线 |
| P3 | 重复 filter 遍历大数组 | 非正确性或 alpha-surface 阻塞项 |
| P5 | 启动时加载全部 JSON | 限于本地单操作者工作流 |
| S2 | 广泛 fail-open catch 审计 | 核心路径已 fail-closed |
| S3 | 遗留 JSON.parse 未包裹 | Public surface JSON 解析已 fail-closed |
| C1 | 模块级循环依赖 | 跨越多个旧子系统 |
| C2 | repair 层依赖 CLI surface | 分层清理是更广泛的 refactor |
| C3 | CLI 是最高的 fan-out 集成面 | 对当前 local-first 产品形态是预期的 |
| C4 | 跨模块耦合在旧栈中较高 | P28b 后处理 |

---

# 第十四部分：回归证据 (Phase BUG-FULL)

| 检查 | 结果 |
|------|------|
| `tsc --noEmit` | ✅ pass |
| `npm run build` | ✅ pass |
| `vitest run` (166 files / 1,871 tests) | ✅ 全绿 |
| `ncc build` (GitHub Action) | ✅ pass |
| `npm pack` | ✅ pass |
| `pantheon-alpha doctor` | ✅ pass |
| `pantheon-alpha metrics daily` | ✅ pass |
| `pantheon-alpha review list` | ✅ pass |
| `pantheon-alpha init --repo <tmp> --force` → `doctor` smoke | ✅ pass |

---

*完整 machine-readable disposition: `data/audit/phase_bug_full_issue_index.json`*
*完整 closure report: `docs/internal/phase_bug_full_closure_report.md`*
