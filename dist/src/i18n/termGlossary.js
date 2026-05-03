/**
 * P15.2 — Term Glossary
 *
 * Canonical bilingual glossary for Pantheon system terms.
 * Used by cockpit i18n and CLI report rendering.
 *
 * Rule: Chinese display always preserves the English term in parentheses.
 * Technical IDs (node_id, block_id, file_path, symbol_name) are NEVER translated.
 */
export const TERM_GLOSSARY = [
    // --- System concepts ---
    { id: "blast_radius", en: "Blast Radius", zhCN: "影响范围（Blast Radius）" },
    { id: "boundary_graph", en: "Boundary Graph", zhCN: "边界图（Boundary Graph）" },
    { id: "handoff_package", en: "Handoff Package", zhCN: "交付包（Handoff Package）" },
    { id: "implementation_context", en: "Implementation Context", zhCN: "实现上下文（Implementation Context）" },
    // --- Node kinds ---
    { id: "conflict_policy", en: "Conflict Policy", zhCN: "冲突策略（Conflict Policy）", preserveId: true },
    { id: "forbidden_assumption", en: "Forbidden Assumption", zhCN: "禁止假设（Forbidden Assumption）", preserveId: true },
    { id: "state_machine", en: "State Machine", zhCN: "状态机（State Machine）", preserveId: true },
    { id: "data_model", en: "Data Model", zhCN: "数据模型（Data Model）", preserveId: true },
    { id: "contract_definition", en: "Contract Definition", zhCN: "契约定义（Contract Definition）", preserveId: true },
    { id: "task", en: "Task", zhCN: "任务（Task）", preserveId: true },
    { id: "risk_note", en: "Risk Note", zhCN: "风险备注（Risk Note）", preserveId: true },
    { id: "generated_file", en: "Generated File", zhCN: "生成文件（Generated File）" },
    { id: "generated_symbol", en: "Generated Symbol", zhCN: "生成符号（Generated Symbol）" },
    { id: "test_obligation", en: "Test Obligation", zhCN: "测试义务（Test Obligation）" },
    // --- Layers ---
    { id: "architecture", en: "Architecture", zhCN: "架构（Architecture）" },
    { id: "interface", en: "Interface", zhCN: "接口（Interface）" },
    { id: "module", en: "Module", zhCN: "模块（Module）" },
    { id: "handoff", en: "Handoff", zhCN: "交付（Handoff）" },
    { id: "generated", en: "Generated", zhCN: "生成（Generated）" },
    { id: "test", en: "Test", zhCN: "测试（Test）" },
    // --- Risk levels ---
    { id: "risk_high", en: "HIGH", zhCN: "高（HIGH）" },
    { id: "risk_medium", en: "MEDIUM", zhCN: "中（MEDIUM）" },
    { id: "risk_low", en: "LOW", zhCN: "低（LOW）" },
    // --- Risk reasons ---
    { id: "reason_conflict_policy", en: "High-risk conflict policy affected", zhCN: "触达高风险冲突策略（Conflict Policy）" },
    { id: "reason_forbidden_assumption", en: "Forbidden assumption affected", zhCN: "触达禁止假设（Forbidden Assumption）" },
    { id: "reason_state_machine", en: "State machine affected", zhCN: "触达状态机（State Machine）" },
    { id: "reason_data_model", en: "Data model affected", zhCN: "触达数据模型（Data Model）" },
    // --- Report labels ---
    { id: "report_title", en: "Blast Radius Report", zhCN: "影响范围报告（Blast Radius Report）" },
    { id: "report_summary", en: "Summary", zhCN: "摘要" },
    { id: "report_changed_nodes", en: "Changed Nodes", zhCN: "变更节点" },
    { id: "report_direct_impact", en: "Direct impact", zhCN: "直接影响" },
    { id: "report_total_downstream", en: "Total downstream", zhCN: "总下游影响" },
    { id: "report_affected_files", en: "Affected files", zhCN: "受影响文件" },
    { id: "report_affected_symbols", en: "Affected symbols", zhCN: "受影响符号" },
    { id: "report_affected_tests", en: "Affected tests", zhCN: "受影响测试" },
    { id: "report_highest_risk", en: "Highest risk", zhCN: "最高风险" },
    { id: "report_risk_amplification", en: "Risk Amplification", zhCN: "风险放大（Risk Amplification）" },
    { id: "report_critical_paths", en: "Critical Paths", zhCN: "关键路径（Critical Paths）" },
    // --- Context labels ---
    { id: "context_title", en: "Scoped Implementation Context", zhCN: "实现上下文（Implementation Context）" },
    { id: "context_affected_files", en: "Affected Files", zhCN: "允许修改的文件" },
    { id: "context_affected_tests", en: "Affected Tests", zhCN: "受影响测试" },
    { id: "context_constraints", en: "Constraints", zhCN: "必须遵守的约束" },
];
/** Lookup a term by id. Returns the term or undefined. */
export function lookupTerm(id) {
    return TERM_GLOSSARY.find(t => t.id === id);
}
/** Get display string for a term in the given locale. Falls back to English. */
export function getTermDisplay(id, locale) {
    const term = lookupTerm(id);
    if (!term)
        return id;
    return locale === "zh-CN" ? term.zhCN : term.en;
}
/** Check if a term's id should be preserved (never translated when appearing in technical context). */
export function isPreservedId(id) {
    const term = lookupTerm(id);
    return term?.preserveId ?? false;
}
//# sourceMappingURL=termGlossary.js.map