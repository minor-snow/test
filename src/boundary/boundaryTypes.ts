/**
 * P14a: Boundary Graph Types
 *
 * Defines the node/edge/graph types for the boundary mapping graph.
 * All node IDs use namespaced prefixes: blk:, hc:, file:, sym:, test:
 * Every node carries a `critical` flag for gate filtering.
 *
 * ref: P14
 */

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export type ArtifactBlockNode = {
  node_id: string;           // blk:arch:b_sync_001 | blk:iface:b_iface_sync_001 | blk:mod:b_mod_sync_001
  kind: "architecture_block" | "interface_block" | "module_block";
  layer: "architecture" | "interface" | "module";
  block_id: string;
  label: string;
  critical: boolean;
};

export type HandoffNodeKind =
  | "contract_definition"
  | "conflict_policy"
  | "data_model"
  | "state_machine"
  | "implementation_task"
  | "forbidden_assumption"
  | "risk_note";

export type HandoffNode = {
  node_id: string;           // hc:data_model:PendingReportEntity
  kind: HandoffNodeKind;
  layer: "handoff";
  label: string;
  critical: boolean;
  source_architecture_blocks: string[];
  source_interface_blocks: string[];
  source_module_blocks: string[];
};

export type GeneratedFileNode = {
  node_id: string;           // file:Entities.kt
  kind: "generated_file";
  layer: "generated";
  file_path: string;
  critical: boolean;
};

export type GeneratedSymbolNode = {
  node_id: string;           // sym:Entities.kt:PendingReportEntity
  kind: "generated_symbol";
  layer: "generated";
  symbol_kind: "class" | "interface" | "enum" | "object" | "method" | "property" | "test_class" | "test_method";
  file_node_id: string;
  symbol_name: string;
  fq_name: string;
  critical: boolean;
};

export type TestNode = {
  node_id: string;           // test:policy:patient_case_status
  kind: "test_obligation";
  layer: "test";
  label: string;
  file_node_id: string;
  critical: boolean;
};

export type BoundaryNode =
  | ArtifactBlockNode
  | HandoffNode
  | GeneratedFileNode
  | GeneratedSymbolNode
  | TestNode;

export type NodeLayer = BoundaryNode["layer"];

// ---------------------------------------------------------------------------
// Edge types
// ---------------------------------------------------------------------------

export type EdgeType =
  | "architecture_to_interface"
  | "interface_to_module"
  | "module_to_handoff"
  | "source_block_to_handoff"
  | "handoff_to_generated_file"
  | "file_declares_symbol"
  | "symbol_to_test"
  | "test_traces_to_source"
  | "enforces"
  | "implements";

export type BoundaryEdge = {
  edge_id: string;
  from: string;
  to: string;
  edge_type: EdgeType;
  critical: boolean;
};

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export type BoundaryGraph = {
  graph_id: string;
  created_at: string;
  handoff_package_hash: string;

  source_revisions: Array<{
    artifact_id: string;
    artifact_type: string;
    revision_id: string;
  }>;

  nodes: BoundaryNode[];
  edges: BoundaryEdge[];

  indexes: {
    by_kind: Record<string, string[]>;
    by_layer: Record<string, string[]>;
    by_source_block: Record<string, string[]>;
  };

  stats: {
    node_count: number;
    edge_count: number;
    orphan_critical_nodes: string[];
  };
};
