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
import type { BoundaryGraph } from "../../../src/boundary/boundaryTypes.js";
export declare function buildRegressionGraph(): BoundaryGraph;
/**
 * Expected canonical summary for snapshot comparison.
 * If the graph structure changes, update this summary.
 */
export declare const REGRESSION_EXPECTED_SUMMARY: {
    readonly node_count: 8;
    readonly edge_count: 7;
    readonly layers: readonly ["architecture", "interface", "module", "handoff", "generated", "test"];
    readonly critical_node_count: 4;
    readonly arch_to_test_path_exists: true;
};
