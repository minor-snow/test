/**
 * P18.5-C: BoundaryGraph Regression Fixture
 *
 * A self-contained, minimal boundary graph for regression testing.
 * Does not depend on real handoff packages or file system.
 *
 * Graph structure:
 *   arch_A → iface_I → mod_M1 → handoff_H → file_F → sym_S → test_T
 *                       mod_M2 ──────────────────────────────┘
 *
 * ref: P18.5-C
 */
const NODES = [
    {
        node_id: "blk:arch:reg_arch_a",
        kind: "architecture_block",
        layer: "architecture",
        block_id: "reg_arch_a",
        label: "Architecture Block A",
        critical: true,
    },
    {
        node_id: "blk:iface:reg_iface_i",
        kind: "interface_block",
        layer: "interface",
        block_id: "reg_iface_i",
        label: "Interface Block I",
        critical: true,
    },
    {
        node_id: "blk:mod:reg_mod_m1",
        kind: "module_block",
        layer: "module",
        block_id: "reg_mod_m1",
        label: "Module Block M1",
        critical: false,
    },
    {
        node_id: "blk:mod:reg_mod_m2",
        kind: "module_block",
        layer: "module",
        block_id: "reg_mod_m2",
        label: "Module Block M2",
        critical: false,
    },
    {
        node_id: "hc:contract_definition:reg_handoff_h",
        kind: "contract_definition",
        layer: "handoff",
        label: "Handoff Contract H",
        critical: true,
        source_architecture_blocks: ["reg_arch_a"],
        source_interface_blocks: ["reg_iface_i"],
        source_module_blocks: ["reg_mod_m1"],
    },
    {
        node_id: "file:RegGenerated.kt",
        kind: "generated_file",
        layer: "generated",
        file_path: "src/main/kotlin/RegGenerated.kt",
        critical: false,
    },
    {
        node_id: "sym:RegGenerated.kt:RegClass",
        kind: "generated_symbol",
        layer: "generated",
        symbol_kind: "class",
        file_node_id: "file:RegGenerated.kt",
        symbol_name: "RegClass",
        fq_name: "com.example.RegClass",
        critical: false,
    },
    {
        node_id: "test:policy:reg_test_t",
        kind: "test_obligation",
        layer: "test",
        label: "Regression Test T",
        file_node_id: "file:RegGenerated.kt",
        critical: true,
    },
];
const EDGES = [
    {
        edge_id: "e:arch_a→iface_i",
        from: "blk:arch:reg_arch_a",
        to: "blk:iface:reg_iface_i",
        edge_type: "architecture_to_interface",
        critical: true,
    },
    {
        edge_id: "e:iface_i→mod_m1",
        from: "blk:iface:reg_iface_i",
        to: "blk:mod:reg_mod_m1",
        edge_type: "interface_to_module",
        critical: false,
    },
    {
        edge_id: "e:mod_m1→handoff_h",
        from: "blk:mod:reg_mod_m1",
        to: "hc:contract_definition:reg_handoff_h",
        edge_type: "module_to_handoff",
        critical: true,
    },
    {
        edge_id: "e:handoff_h→file_f",
        from: "hc:contract_definition:reg_handoff_h",
        to: "file:RegGenerated.kt",
        edge_type: "handoff_to_generated_file",
        critical: false,
    },
    {
        edge_id: "e:file_f→sym_s",
        from: "file:RegGenerated.kt",
        to: "sym:RegGenerated.kt:RegClass",
        edge_type: "file_declares_symbol",
        critical: false,
    },
    {
        edge_id: "e:sym_s→test_t",
        from: "sym:RegGenerated.kt:RegClass",
        to: "test:policy:reg_test_t",
        edge_type: "symbol_to_test",
        critical: true,
    },
    {
        edge_id: "e:mod_m2→mod_m1",
        from: "blk:mod:reg_mod_m2",
        to: "blk:mod:reg_mod_m1",
        edge_type: "implements",
        critical: false,
    },
];
export function buildRegressionGraph() {
    const byKind = {};
    const byLayer = {};
    const bySourceBlock = {};
    for (const node of NODES) {
        if (!byKind[node.kind])
            byKind[node.kind] = [];
        byKind[node.kind].push(node.node_id);
        if (!byLayer[node.layer])
            byLayer[node.layer] = [];
        byLayer[node.layer].push(node.node_id);
    }
    return {
        graph_id: "regression_fixture_v1",
        created_at: "2026-04-29T04:00:00Z",
        handoff_package_hash: "regression_fixture_hash",
        source_revisions: [],
        nodes: NODES,
        edges: EDGES,
        indexes: {
            by_kind: byKind,
            by_layer: byLayer,
            by_source_block: bySourceBlock,
        },
        stats: {
            node_count: NODES.length,
            edge_count: EDGES.length,
            orphan_critical_nodes: [],
        },
    };
}
/**
 * Expected canonical summary for snapshot comparison.
 * If the graph structure changes, update this summary.
 */
export const REGRESSION_EXPECTED_SUMMARY = {
    node_count: 8,
    edge_count: 7,
    layers: ["architecture", "interface", "module", "handoff", "generated", "test"],
    critical_node_count: 4,
    arch_to_test_path_exists: true,
};
//# sourceMappingURL=boundaryGraphRegressionFixture.js.map