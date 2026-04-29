/**
 * P17a: Scoped Handoff Exporter
 *
 * Reads blast radius report + boundary graph + handoff package,
 * produces a ScopedImplementationBoundaryPackage.
 *
 * Tightening points applied:
 * 1. enforced_by: heuristic downstream match, labeled with enforcement_source
 * 2. forbidden_files: .pantheon/** .cursor/** hardcoded, project-specific from input
 * 3. handoff reference-only (no subset dump)
 *
 * ref: P17
 */
import { queryDownstream } from "../boundary/boundaryGatesAndQueries.js";
import { getTermDisplay } from "../i18n/termGlossary.js";
import { PROTOCOL_FORBIDDEN_PATTERNS, GENERATOR_VERSION, } from "./types.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createScopeId(label) {
    const base = label
        ? label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase()
        : "scope";
    const ts = Date.now().toString(36);
    return `${base}_${ts}`;
}
function findNode(graph, nodeId) {
    return graph.nodes.find(n => n.node_id === nodeId);
}
function hashString(s) {
    // Simple hash for deterministic IDs. Not cryptographic.
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(16).padStart(8, "0");
}
// ---------------------------------------------------------------------------
// Heuristic enforced_by
// ---------------------------------------------------------------------------
/**
 * Find enforcement references for a constraint node using heuristic downstream analysis.
 * In v1, we use the graph structure to find tests and guard-like files downstream.
 */
function findHeuristicEnforcement(graph, nodeId) {
    const refs = [];
    const downstream = queryDownstream(graph, nodeId);
    for (const n of downstream) {
        if (n.kind === "test_obligation") {
            const fileNode = findNode(graph, n.file_node_id);
            refs.push({
                kind: "test",
                id: n.node_id,
                file_path: fileNode && "file_path" in fileNode ? fileNode.file_path : undefined,
                enforcement_source: "heuristic_downstream_match",
            });
        }
        else if (n.kind === "generated_file" && "file_path" in n) {
            const path = n.file_path;
            if (path.includes("Guard") || path.includes("Contract")) {
                refs.push({
                    kind: "guard",
                    id: n.node_id,
                    file_path: path,
                    enforcement_source: "heuristic_downstream_match",
                });
            }
        }
    }
    return refs;
}
// ---------------------------------------------------------------------------
// Build allowed_files
// ---------------------------------------------------------------------------
function buildAllowedFiles(report, graph) {
    const files = [];
    for (const fileId of report.by_layer.generated_files) {
        const node = findNode(graph, fileId);
        const filePath = node && "file_path" in node ? node.file_path : fileId.replace("file:", "");
        const isTest = filePath.includes("Test");
        files.push({
            path: filePath,
            origin: "blast_radius_generated",
            reason: "Affected by blast radius traversal from changed node(s).",
            source_nodes: report.request.changed_nodes.filter(n => !report.invalid_nodes.includes(n)),
            allowed_operations: isTest
                ? ["read", "modify", "test"]
                : ["read", "modify", "regenerate", "test"],
        });
    }
    return files;
}
// ---------------------------------------------------------------------------
// Build forbidden_files
// ---------------------------------------------------------------------------
function buildForbiddenFiles(extraPatterns) {
    const patterns = [...PROTOCOL_FORBIDDEN_PATTERNS];
    if (extraPatterns) {
        for (const p of extraPatterns) {
            patterns.push({
                pattern: p,
                reason: "Not in current blast radius scope.",
            });
        }
    }
    return patterns;
}
// ---------------------------------------------------------------------------
// Build required_tests
// ---------------------------------------------------------------------------
function buildRequiredTests(report, graph) {
    const testIds = new Set();
    const tests = [];
    // From by_layer.tests
    for (const testId of report.by_layer.tests) {
        testIds.add(testId);
    }
    // From risk amplification affected_tests
    for (const amp of report.risk_amplification) {
        for (const testId of amp.affected_tests) {
            testIds.add(testId);
        }
    }
    for (const testId of testIds) {
        const node = findNode(graph, testId);
        const fileNodeId = node && "file_node_id" in node ? node.file_node_id : undefined;
        const fileNode = fileNodeId ? findNode(graph, fileNodeId) : undefined;
        const filePath = fileNode && "file_path" in fileNode ? fileNode.file_path : undefined;
        // Find which risk nodes this test is connected to
        const sourceNodes = [];
        for (const amp of report.risk_amplification) {
            if (amp.affected_tests.includes(testId)) {
                sourceNodes.push(amp.node_id);
            }
        }
        const nodeLabel = node && "label" in node ? node.label : undefined;
        tests.push({
            test_id: testId,
            test_name: nodeLabel || testId.replace("test:", ""),
            file_path: filePath,
            requirement: "must_run",
            reason: sourceNodes.length > 0
                ? `Affected by risk amplification from: ${sourceNodes.join(", ")}`
                : "Affected by blast radius traversal.",
            source_nodes: sourceNodes.length > 0 ? sourceNodes : report.request.changed_nodes.filter(n => !report.invalid_nodes.includes(n)),
        });
    }
    return tests;
}
// ---------------------------------------------------------------------------
// Build affected_symbols
// ---------------------------------------------------------------------------
function buildAffectedSymbols(report, graph) {
    return report.by_layer.generated_symbols.map(symId => {
        const node = findNode(graph, symId);
        const fileNodeId = node?.file_node_id;
        const fileNode = fileNodeId ? findNode(graph, fileNodeId) : undefined;
        const filePath = fileNode && "file_path" in fileNode ? fileNode.file_path : "";
        return {
            symbol_id: symId,
            symbol_name: node?.symbol_name || symId.split(":").pop() || symId,
            file_path: filePath,
            reason: "Affected by blast radius traversal.",
            source_nodes: report.request.changed_nodes.filter(n => !report.invalid_nodes.includes(n)),
        };
    });
}
// ---------------------------------------------------------------------------
// Build must_preserve constraints
// ---------------------------------------------------------------------------
function buildMustPreserve(report, graph, locale) {
    const constraints = [];
    // High-risk conflict policies → must preserve their conflict resolution rules
    for (const amp of report.risk_amplification) {
        if (amp.risk_level !== "high")
            continue;
        if (amp.node_id.includes("conflict_policy")) {
            const policyName = amp.node_id.replace("hc:conflict_policy:", "");
            const enforcement = findHeuristicEnforcement(graph, amp.node_id);
            constraints.push({
                constraint_id: `constraint_preserve_${policyName}`,
                statement: locale === "zh-CN"
                    ? `冲突策略 ${policyName} 的解决规则不得被静默更改。`
                    : `Conflict policy ${policyName} resolution rules must not be silently changed.`,
                severity: "high",
                source_nodes: [amp.node_id],
                enforced_by: enforcement,
            });
        }
        if (amp.node_id.includes("forbidden")) {
            const node = findNode(graph, amp.node_id);
            const label = node && "label" in node ? node.label : amp.node_id;
            const enforcement = findHeuristicEnforcement(graph, amp.node_id);
            constraints.push({
                constraint_id: `constraint_${amp.node_id.replace(/[^a-zA-Z0-9]/g, "_")}`,
                statement: locale === "zh-CN"
                    ? `禁止假设：${label}`
                    : `Forbidden assumption: ${label}`,
                severity: "high",
                source_nodes: [amp.node_id],
                enforced_by: enforcement,
            });
        }
    }
    return constraints;
}
// ---------------------------------------------------------------------------
// Build forbidden_assumptions export
// ---------------------------------------------------------------------------
function buildForbiddenAssumptions(report, graph, locale) {
    return report.risk_amplification
        .filter(amp => amp.node_id.includes("forbidden"))
        .map(amp => {
        const node = findNode(graph, amp.node_id);
        const label = node && "label" in node ? node.label : amp.node_id;
        const enforcement = findHeuristicEnforcement(graph, amp.node_id);
        return {
            assumption_id: amp.node_id,
            statement: label,
            reason: locale === "zh-CN"
                ? getTermDisplay("reason_forbidden_assumption", "zh-CN")
                : "Forbidden assumption affected by blast radius",
            source_nodes: [amp.node_id],
            enforced_by: enforcement,
        };
    });
}
// ---------------------------------------------------------------------------
// Build risk_amplification export
// ---------------------------------------------------------------------------
function buildRiskExport(report) {
    return report.risk_amplification.map(amp => ({
        risk_id: amp.node_id,
        label: amp.label,
        risk_level: amp.risk_level,
        reason: amp.reason,
        source_path: amp.source_path,
        affected_tests: amp.affected_tests,
    }));
}
// ---------------------------------------------------------------------------
// Build reverse_issue triggers
// ---------------------------------------------------------------------------
function buildReverseIssueTriggers() {
    const base = "npx tsx scripts/createImplementationIssue.ts";
    return [
        {
            trigger_id: "missing_field",
            condition: "A required field is missing from generated models.",
            required_action: "Create a Pantheon reverse issue instead of editing generated code.",
            example_command: `${base} --artifact "<artifact_id>" --block "<block_id>" --type "missing_field" --description "..." --context "..."`,
        },
        {
            trigger_id: "new_state_transition",
            condition: "A new state transition is required that is not in the generated state machine.",
            required_action: "Create a Pantheon reverse issue to add the transition at architecture level.",
            example_command: `${base} --artifact "<artifact_id>" --block "<block_id>" --type "missing_state" --description "..." --context "..."`,
        },
        {
            trigger_id: "new_conflict_policy",
            condition: "A new conflict policy is required.",
            required_action: "Create a Pantheon reverse issue to define the policy at architecture level.",
            example_command: `${base} --artifact "<artifact_id>" --block "<block_id>" --type "contract_mismatch" --description "..." --context "..."`,
        },
        {
            trigger_id: "modify_forbidden_file",
            condition: "Implementation needs to modify a file outside the allowed list.",
            required_action: "Create a Pantheon reverse issue requesting scope expansion.",
            example_command: `${base} --artifact "<artifact_id>" --block "<block_id>" --type "other" --description "Scope expansion needed: ..." --context "..."`,
        },
        {
            trigger_id: "contract_test_failure",
            condition: "A generated contract test blocks implementation.",
            required_action: "Create a Pantheon reverse issue; do not modify the test.",
            example_command: `${base} --artifact "<artifact_id>" --block "<block_id>" --type "contract_mismatch" --description "..." --context "..."`,
        },
        {
            trigger_id: "need_to_change_generated_code",
            condition: "Downstream agent needs to change generated boundary code directly.",
            required_action: "Create a Pantheon reverse issue; boundary code is regenerated from architecture.",
            example_command: `${base} --artifact "<artifact_id>" --block "<block_id>" --type "other" --description "Generated code gap: ..." --context "..."`,
        },
    ];
}
// ---------------------------------------------------------------------------
// Build implementation context text
// ---------------------------------------------------------------------------
function buildImplementationContext(report, constraints, requiredTests, locale) {
    const riskLabel = locale === "zh-CN"
        ? getTermDisplay(`risk_${report.summary.highest_risk_level}`, "zh-CN")
        : report.summary.highest_risk_level.toUpperCase();
    const title = locale === "zh-CN" ? "实现上下文（Implementation Context）" : "Scoped Implementation Context";
    const filesLabel = locale === "zh-CN" ? "允许修改的文件" : "Allowed Files";
    const testsLabel = locale === "zh-CN" ? "必须运行的测试" : "Required Tests";
    const constraintLabel = locale === "zh-CN" ? "必须遵守的约束" : "Must Preserve Constraints";
    const riskTitleLabel = locale === "zh-CN" ? "风险等级" : "Risk Level";
    const lines = [
        `# ${title}`,
        `# Generated by Pantheon at ${new Date().toISOString()}`,
        "",
        `## ${riskTitleLabel}`,
        `- ${riskLabel}`,
        "",
        `## ${filesLabel}`,
        ...report.by_layer.generated_files.map(f => `- ${f.replace("file:", "")}`),
        "",
        `## ${testsLabel}`,
        ...requiredTests.map(t => `- ${t.test_id} (${t.requirement})`),
        "",
        `## ${constraintLabel}`,
        ...constraints.map(c => `- ${c.statement}`),
    ];
    if (constraints.length === 0) {
        lines.push(locale === "zh-CN" ? "- 范围内无高风险约束" : "- No high-risk constraints in scope");
    }
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Build human readable summary
// ---------------------------------------------------------------------------
function buildHumanSummary(report, locale) {
    const riskLabel = locale === "zh-CN"
        ? getTermDisplay(`risk_${report.summary.highest_risk_level}`, "zh-CN")
        : report.summary.highest_risk_level.toUpperCase();
    if (locale === "zh-CN") {
        return [
            `风险等级：${riskLabel}`,
            `下游影响：${report.summary.total_downstream} 个节点`,
            `受影响文件：${report.summary.affected_files}`,
            `受影响符号：${report.summary.affected_symbols}`,
            `受影响测试：${report.summary.affected_tests}`,
        ].join("\n");
    }
    return [
        `Risk level: ${riskLabel}`,
        `Downstream impact: ${report.summary.total_downstream} nodes`,
        `Affected files: ${report.summary.affected_files}`,
        `Affected symbols: ${report.summary.affected_symbols}`,
        `Affected tests: ${report.summary.affected_tests}`,
    ].join("\n");
}
// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------
export function buildScopedImplementationBoundaryPackage(input) {
    const { boundaryGraph: graph, blastRadiusReport: report, options } = input;
    const locale = options.locale;
    const scopeId = createScopeId(options.scopeLabel);
    const allowedFiles = buildAllowedFiles(report, graph);
    const forbiddenFiles = buildForbiddenFiles(options.extraForbiddenPatterns);
    const requiredTests = buildRequiredTests(report, graph);
    const affectedSymbols = buildAffectedSymbols(report, graph);
    const mustPreserve = buildMustPreserve(report, graph, locale);
    const forbiddenAssumptions = buildForbiddenAssumptions(report, graph, locale);
    const riskExport = buildRiskExport(report);
    const reverseIssueTriggers = buildReverseIssueTriggers();
    const implementationContext = buildImplementationContext(report, mustPreserve, requiredTests, locale);
    const humanSummary = buildHumanSummary(report, locale);
    const mustRequireHumanReview = report.summary.highest_risk_level === "high" ||
        forbiddenAssumptions.length > 0;
    return {
        scope_id: scopeId,
        created_at: new Date().toISOString(),
        source: {
            handoff_package_hash: input.handoffPackageHash,
            boundary_graph_hash: report.graph_hash,
            blast_radius_report_hash: hashString(JSON.stringify(report)),
            locale,
            generator_version: GENERATOR_VERSION,
        },
        request: {
            changed_nodes: report.request.changed_nodes,
            change_description: report.request.change_description,
        },
        summary: {
            risk_level: report.summary.highest_risk_level,
            must_require_human_review: mustRequireHumanReview,
            downstream_nodes: report.summary.total_downstream,
            affected_files: report.summary.affected_files,
            affected_symbols: report.summary.affected_symbols,
            affected_tests: report.summary.affected_tests,
        },
        allowed_files: allowedFiles,
        forbidden_files: forbiddenFiles,
        required_tests: requiredTests,
        affected_symbols: affectedSymbols,
        must_preserve: mustPreserve,
        forbidden_assumptions: forbiddenAssumptions,
        risk_amplification: riskExport,
        reverse_issue_required_if: reverseIssueTriggers,
        implementation_context: implementationContext,
        human_readable_summary: humanSummary,
    };
}
// ---------------------------------------------------------------------------
// Handoff reference builder (reference-only, no subset dump)
// ---------------------------------------------------------------------------
export function buildHandoffReference(handoffPackageHash, handoffPackagePath, report, graph) {
    // Extract relevant source blocks from changed nodes
    const relevantSourceBlocks = [];
    const relevantNodes = [];
    for (const nodeId of report.request.changed_nodes) {
        const node = findNode(graph, nodeId);
        if (!node)
            continue;
        if ("block_id" in node) {
            relevantSourceBlocks.push(node.block_id);
        }
        relevantNodes.push(nodeId);
    }
    // Add handoff-layer nodes from blast radius
    for (const nodeId of report.by_layer.handoff) {
        relevantNodes.push(nodeId);
    }
    return {
        handoff_package_hash: handoffPackageHash,
        handoff_package_path: handoffPackagePath,
        relevant_nodes: [...new Set(relevantNodes)],
        relevant_source_blocks: [...new Set(relevantSourceBlocks)],
        note: "Reference-only. Source of truth remains the handoff package.",
    };
}
//# sourceMappingURL=scopedHandoffExporter.js.map