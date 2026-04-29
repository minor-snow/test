/**
 * P14a: Boundary Graph Builder
 *
 * Builds a BoundaryGraph from handoff_package.json and generated file list.
 * All provenance is derived — no new truth created.
 *
 * ref: P14a
 */
// ---------------------------------------------------------------------------
// Critical classification
// ---------------------------------------------------------------------------
const CRITICAL_ARCH_TERMS = [
    "offline", "sync", "conflict", "pending", "vector_clock", "lww", "audit",
    "clinic_replica", "retry", "multiclinic", "uvc",
];
function isArchBlockCritical(blockId) {
    return CRITICAL_ARCH_TERMS.some(t => blockId.includes(t));
}
const CRITICAL_HANDOFF_KINDS = new Set([
    "data_model", "state_machine", "conflict_policy", "forbidden_assumption",
]);
function isHandoffCritical(kind, label, hasEnumValues = false) {
    if (CRITICAL_HANDOFF_KINDS.has(kind))
        return true;
    if (kind === "contract_definition") {
        // Only critical if it produces generated code (has enum_values)
        return hasEnumValues;
    }
    if (kind === "implementation_task") {
        return ["conflict", "sync", "pending_report"].some(t => label.toLowerCase().includes(t));
    }
    return false;
}
const CRITICAL_FILES = new Set([
    "Entities.kt", "Dtos.kt", "Enums.kt", "StateMachines.kt",
    "ConflictPolicy.kt", "ConflictPolicyTests.kt",
    "contracts/Guards.kt", "contracts/Interfaces.kt", "contracts/ContractTests.kt",
]);
// ---------------------------------------------------------------------------
// Handoff → Generated file mapping rules
// ---------------------------------------------------------------------------
const HANDOFF_TO_FILE = {
    data_model_room_entity: ["Entities.kt"],
    data_model_network_dto: ["Dtos.kt"],
    contract_definition_enum: ["Enums.kt"],
    contract_definition_state: ["Enums.kt", "StateMachines.kt"],
    state_machine: ["Enums.kt", "StateMachines.kt"],
    conflict_policy: ["ConflictPolicy.kt", "ConflictPolicyTests.kt"],
    forbidden_assumption: ["contracts/Guards.kt", "contracts/ContractTests.kt"],
    risk_note: ["contracts/Guards.kt"],
    implementation_task: ["contracts/Interfaces.kt", "contracts/TodoStubs.kt"],
};
const TASK_IDS_WITH_INTERFACES = new Set([
    "TASK-002", "TASK-003", "TASK-004", "TASK-005", "TASK-006", "TASK-007", "TASK-010",
]);
// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------
export function buildBoundaryGraph(pkg, generatedFiles, packageHash) {
    const nodes = [];
    const edges = [];
    const nodeSet = new Set();
    let edgeCounter = 0;
    function addNode(n) {
        if (!nodeSet.has(n.node_id)) {
            nodeSet.add(n.node_id);
            nodes.push(n);
        }
    }
    function addEdge(from, to, edgeType, critical = false) {
        edges.push({
            edge_id: `e_${++edgeCounter}`,
            from, to, edge_type: edgeType, critical,
        });
    }
    // -- Collect all unique source block IDs --
    const allArchBlocks = new Set();
    const allIfaceBlocks = new Set();
    const allModBlocks = new Set();
    function collectBlocks(entity) {
        for (const b of entity.source_architecture_blocks || [])
            allArchBlocks.add(b);
        for (const b of entity.source_interface_blocks || [])
            allIfaceBlocks.add(b);
        for (const b of entity.source_module_blocks || [])
            allModBlocks.add(b);
        for (const b of entity.source_blocks || []) {
            if (b.startsWith("b_iface_"))
                allIfaceBlocks.add(b);
            else if (b.startsWith("b_mod_"))
                allModBlocks.add(b);
            else
                allArchBlocks.add(b);
        }
    }
    for (const cd of pkg.contract_definitions)
        collectBlocks(cd);
    for (const dm of pkg.data_models)
        collectBlocks(dm);
    for (const sm of pkg.state_machines)
        collectBlocks(sm);
    for (const cp of pkg.conflict_policy_matrix)
        collectBlocks(cp);
    for (const fa of pkg.forbidden_assumptions)
        collectBlocks(fa);
    for (const rn of pkg.risk_notes)
        collectBlocks(rn);
    for (const t of pkg.implementation_tasks)
        collectBlocks(t);
    // -- Layer 1-3: Artifact block nodes --
    for (const b of allArchBlocks) {
        addNode({
            node_id: `blk:arch:${b}`, kind: "architecture_block",
            layer: "architecture", block_id: b, label: b,
            critical: isArchBlockCritical(b),
        });
    }
    for (const b of allIfaceBlocks) {
        addNode({
            node_id: `blk:iface:${b}`, kind: "interface_block",
            layer: "interface", block_id: b, label: b,
            critical: true, // all interface blocks in handoff are implementation-relevant
        });
    }
    for (const b of allModBlocks) {
        addNode({
            node_id: `blk:mod:${b}`, kind: "module_block",
            layer: "module", block_id: b, label: b,
            critical: true,
        });
    }
    // -- Layer 4: Handoff nodes --
    for (const cd of pkg.contract_definitions) {
        const id = `hc:definition:${cd.term}`;
        const hasEnums = !!(cd.enum_values && cd.enum_values.length > 0);
        const crit = isHandoffCritical("contract_definition", cd.term, hasEnums);
        addNode({ node_id: id, kind: "contract_definition", layer: "handoff", label: cd.term, critical: crit, source_architecture_blocks: cd.source_architecture_blocks, source_interface_blocks: cd.source_interface_blocks, source_module_blocks: cd.source_module_blocks });
        for (const b of cd.source_architecture_blocks)
            addEdge(`blk:arch:${b}`, id, "source_block_to_handoff", crit);
        for (const b of cd.source_interface_blocks)
            addEdge(`blk:iface:${b}`, id, "source_block_to_handoff", crit);
        for (const b of cd.source_module_blocks)
            addEdge(`blk:mod:${b}`, id, "source_block_to_handoff", crit);
        // Generate edges
        if (cd.enum_values && cd.enum_values.length > 0) {
            addEdge(id, "file:Enums.kt", "handoff_to_generated_file", crit);
        }
    }
    for (const dm of pkg.data_models) {
        const id = `hc:data_model:${dm.name}`;
        addNode({ node_id: id, kind: "data_model", layer: "handoff", label: dm.name, critical: true, source_architecture_blocks: dm.source_architecture_blocks, source_interface_blocks: dm.source_interface_blocks, source_module_blocks: dm.source_module_blocks });
        for (const b of dm.source_architecture_blocks)
            addEdge(`blk:arch:${b}`, id, "source_block_to_handoff", true);
        for (const b of dm.source_interface_blocks)
            addEdge(`blk:iface:${b}`, id, "source_block_to_handoff", true);
        for (const b of dm.source_module_blocks)
            addEdge(`blk:mod:${b}`, id, "source_block_to_handoff", true);
        const target = dm.kind === "room_entity" ? "file:Entities.kt" : dm.kind === "network_dto" ? "file:Dtos.kt" : null;
        if (target)
            addEdge(id, target, "handoff_to_generated_file", true);
    }
    for (const sm of pkg.state_machines) {
        const id = `hc:state_machine:${sm.name}`;
        addNode({ node_id: id, kind: "state_machine", layer: "handoff", label: sm.name, critical: true, source_architecture_blocks: sm.source_architecture_blocks, source_interface_blocks: sm.source_interface_blocks, source_module_blocks: sm.source_module_blocks });
        for (const b of sm.source_architecture_blocks)
            addEdge(`blk:arch:${b}`, id, "source_block_to_handoff", true);
        for (const b of sm.source_interface_blocks)
            addEdge(`blk:iface:${b}`, id, "source_block_to_handoff", true);
        for (const b of sm.source_module_blocks)
            addEdge(`blk:mod:${b}`, id, "source_block_to_handoff", true);
        addEdge(id, "file:Enums.kt", "handoff_to_generated_file", true);
        addEdge(id, "file:StateMachines.kt", "handoff_to_generated_file", true);
    }
    for (const cp of pkg.conflict_policy_matrix) {
        const id = `hc:conflict_policy:${cp.field_group}`;
        addNode({ node_id: id, kind: "conflict_policy", layer: "handoff", label: cp.field_group, critical: true, source_architecture_blocks: cp.source_architecture_blocks, source_interface_blocks: cp.source_interface_blocks, source_module_blocks: cp.source_module_blocks });
        for (const b of cp.source_architecture_blocks)
            addEdge(`blk:arch:${b}`, id, "source_block_to_handoff", true);
        for (const b of cp.source_interface_blocks)
            addEdge(`blk:iface:${b}`, id, "source_block_to_handoff", true);
        for (const b of cp.source_module_blocks)
            addEdge(`blk:mod:${b}`, id, "source_block_to_handoff", true);
        addEdge(id, "file:ConflictPolicy.kt", "handoff_to_generated_file", true);
        if (cp.risk_level === "high" || cp.audit_required) {
            addEdge(id, "file:ConflictPolicyTests.kt", "handoff_to_generated_file", true);
        }
    }
    for (const fa of pkg.forbidden_assumptions) {
        const id = `hc:forbidden:${fa.assumption_id}`;
        const srcArch = fa.source_blocks.filter(b => !b.startsWith("b_iface_") && !b.startsWith("b_mod_"));
        const srcIface = fa.source_blocks.filter(b => b.startsWith("b_iface_"));
        const srcMod = fa.source_blocks.filter(b => b.startsWith("b_mod_"));
        addNode({ node_id: id, kind: "forbidden_assumption", layer: "handoff", label: fa.assumption_id, critical: true, source_architecture_blocks: srcArch, source_interface_blocks: srcIface, source_module_blocks: srcMod });
        for (const b of fa.source_blocks) {
            const prefix = b.startsWith("b_iface_") ? "blk:iface:" : b.startsWith("b_mod_") ? "blk:mod:" : "blk:arch:";
            addEdge(`${prefix}${b}`, id, "source_block_to_handoff", true);
        }
        addEdge(id, "file:contracts/Guards.kt", "enforces", true);
        addEdge(id, "file:contracts/ContractTests.kt", "enforces", true);
    }
    for (const rn of pkg.risk_notes) {
        const id = `hc:risk:${rn.risk_id}`;
        const srcArch = rn.source_blocks.filter(b => !b.startsWith("b_iface_") && !b.startsWith("b_mod_"));
        const srcIface = rn.source_blocks.filter(b => b.startsWith("b_iface_"));
        const srcMod = rn.source_blocks.filter(b => b.startsWith("b_mod_"));
        addNode({ node_id: id, kind: "risk_note", layer: "handoff", label: rn.risk_id, critical: rn.severity === "high", source_architecture_blocks: srcArch, source_interface_blocks: srcIface, source_module_blocks: srcMod });
        for (const b of rn.source_blocks) {
            const prefix = b.startsWith("b_iface_") ? "blk:iface:" : b.startsWith("b_mod_") ? "blk:mod:" : "blk:arch:";
            addEdge(`${prefix}${b}`, id, "source_block_to_handoff", rn.severity === "high");
        }
        if (rn.severity === "high") {
            addEdge(id, "file:contracts/Guards.kt", "enforces", true);
        }
    }
    for (const t of pkg.implementation_tasks) {
        const id = `hc:task:${t.task_id}`;
        const crit = isHandoffCritical("implementation_task", t.title);
        const srcArch = t.source_blocks.filter(b => !b.startsWith("b_iface_") && !b.startsWith("b_mod_"));
        const srcIface = t.source_blocks.filter(b => b.startsWith("b_iface_"));
        const srcMod = t.source_blocks.filter(b => b.startsWith("b_mod_"));
        addNode({ node_id: id, kind: "implementation_task", layer: "handoff", label: `${t.task_id}: ${t.title}`, critical: crit, source_architecture_blocks: srcArch, source_interface_blocks: srcIface, source_module_blocks: srcMod });
        for (const b of t.source_blocks) {
            const prefix = b.startsWith("b_iface_") ? "blk:iface:" : b.startsWith("b_mod_") ? "blk:mod:" : "blk:arch:";
            addEdge(`${prefix}${b}`, id, "source_block_to_handoff", crit);
        }
        if (TASK_IDS_WITH_INTERFACES.has(t.task_id)) {
            addEdge(id, "file:contracts/Interfaces.kt", "implements", crit);
            addEdge(id, "file:contracts/TodoStubs.kt", "implements", crit);
        }
    }
    // -- Layer 5: Generated file nodes --
    for (const f of generatedFiles) {
        addNode({
            node_id: `file:${f.fileName}`, kind: "generated_file",
            layer: "generated", file_path: f.fileName,
            critical: CRITICAL_FILES.has(f.fileName),
        });
    }
    // -- Layer 5b: Generated symbol nodes (from metadata, not AST) --
    for (const dm of pkg.data_models.filter(d => d.kind === "room_entity")) {
        const fileId = "file:Entities.kt";
        const symId = `sym:Entities.kt:${dm.name}`;
        addNode({ node_id: symId, kind: "generated_symbol", layer: "generated", symbol_kind: "class", file_node_id: fileId, symbol_name: dm.name, fq_name: `generated.${dm.name}`, critical: true });
        addEdge(fileId, symId, "file_declares_symbol", true);
    }
    for (const dm of pkg.data_models.filter(d => d.kind === "network_dto")) {
        const fileId = "file:Dtos.kt";
        const symId = `sym:Dtos.kt:${dm.name}`;
        addNode({ node_id: symId, kind: "generated_symbol", layer: "generated", symbol_kind: "class", file_node_id: fileId, symbol_name: dm.name, fq_name: `generated.${dm.name}`, critical: true });
        addEdge(fileId, symId, "file_declares_symbol", true);
    }
    for (const sm of pkg.state_machines) {
        const enumId = `sym:Enums.kt:${sm.name}`;
        addNode({ node_id: enumId, kind: "generated_symbol", layer: "generated", symbol_kind: "enum", file_node_id: "file:Enums.kt", symbol_name: sm.name, fq_name: `generated.${sm.name}`, critical: true });
        addEdge("file:Enums.kt", enumId, "file_declares_symbol", true);
        const valId = `sym:StateMachines.kt:${sm.name}Machine`;
        addNode({ node_id: valId, kind: "generated_symbol", layer: "generated", symbol_kind: "object", file_node_id: "file:StateMachines.kt", symbol_name: `${sm.name}Machine`, fq_name: `generated.${sm.name}Machine`, critical: true });
        addEdge("file:StateMachines.kt", valId, "file_declares_symbol", true);
    }
    // Guards symbol
    const guardsSymId = "sym:contracts/Guards.kt:PantheonGuards";
    addNode({ node_id: guardsSymId, kind: "generated_symbol", layer: "generated", symbol_kind: "object", file_node_id: "file:contracts/Guards.kt", symbol_name: "PantheonGuards", fq_name: "generated.contracts.PantheonGuards", critical: true });
    addEdge("file:contracts/Guards.kt", guardsSymId, "file_declares_symbol", true);
    // -- Layer 6: Test obligations --
    for (const cp of pkg.conflict_policy_matrix.filter(c => c.risk_level === "high")) {
        const testId = `test:policy:${cp.field_group}`;
        addNode({ node_id: testId, kind: "test_obligation", layer: "test", label: `test:${cp.field_group}`, file_node_id: "file:ConflictPolicyTests.kt", critical: true });
        addEdge(`hc:conflict_policy:${cp.field_group}`, testId, "symbol_to_test", true);
        addEdge(testId, "file:ConflictPolicyTests.kt", "test_traces_to_source", true);
    }
    for (const fa of pkg.forbidden_assumptions) {
        const testId = `test:forbidden:${fa.assumption_id}`;
        addNode({ node_id: testId, kind: "test_obligation", layer: "test", label: `test:${fa.assumption_id}`, file_node_id: "file:contracts/Guards.kt", critical: true });
        addEdge(`hc:forbidden:${fa.assumption_id}`, testId, "enforces", true);
        addEdge(testId, "file:contracts/Guards.kt", "test_traces_to_source", true);
    }
    // -- Build indexes --
    const byKind = {};
    const byLayer = {};
    const bySourceBlock = {};
    for (const n of nodes) {
        (byKind[n.kind] ??= []).push(n.node_id);
        (byLayer[n.layer] ??= []).push(n.node_id);
    }
    // Index: source block → handoff node IDs it feeds
    for (const e of edges) {
        if (e.edge_type === "source_block_to_handoff") {
            (bySourceBlock[e.from] ??= []).push(e.to);
        }
    }
    // -- Find orphan critical nodes (only structurally generative kinds) --
    const GENERATIVE_KINDS = new Set(["data_model", "state_machine", "conflict_policy", "forbidden_assumption"]);
    const orphanCritical = [];
    const criticalHandoff = nodes.filter(n => n.layer === "handoff" && n.critical && GENERATIVE_KINDS.has(n.kind));
    for (const n of criticalHandoff) {
        const hasDownstream = edges.some(e => e.from === n.node_id && (e.edge_type === "handoff_to_generated_file" ||
            e.edge_type === "enforces" ||
            e.edge_type === "implements" ||
            e.edge_type === "symbol_to_test"));
        if (!hasDownstream)
            orphanCritical.push(n.node_id);
    }
    return {
        graph_id: `boundary_${packageHash}`,
        created_at: new Date().toISOString(),
        handoff_package_hash: packageHash,
        source_revisions: pkg.source_artifacts.map(sa => ({
            artifact_id: sa.artifact_id,
            artifact_type: sa.artifact_type,
            revision_id: sa.revision_id,
        })),
        nodes,
        edges,
        indexes: { by_kind: byKind, by_layer: byLayer, by_source_block: bySourceBlock },
        stats: {
            node_count: nodes.length,
            edge_count: edges.length,
            orphan_critical_nodes: orphanCritical,
        },
    };
}
//# sourceMappingURL=boundaryGraph.js.map