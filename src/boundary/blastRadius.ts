/**
 * P15: Blast Radius Engine
 *
 * Deterministic traversal over P14 boundary graph.
 * Given changed node IDs, computes downstream impact by layer,
 * risk amplification, and critical paths to test obligations.
 *
 * No LLM. No graph mutation. No intent parsing.
 *
 * ref: P15
 */

import type {
  BoundaryGraph, BoundaryNode, BoundaryEdge,
} from "./boundaryTypes.js";
import { queryBlastRadiusSeeds, queryDownstream } from "./boundaryGatesAndQueries.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlastRadiusRequest = {
  changed_nodes: string[];
  change_description?: string;
};

export type RiskAmplification = {
  node_id: string;
  label: string;
  risk_level: "low" | "medium" | "high";
  reason: string;
  source_path: string[];
  affected_tests: string[];
};

export type CriticalPath = {
  path_id: string;
  from: string;
  to: string;
  nodes: string[];
  risk_level: "low" | "medium" | "high";
  reason: string;
};

export type BlastRadiusReport = {
  request: BlastRadiusRequest;
  generated_at: string;
  graph_hash: string;

  warnings: string[];
  invalid_nodes: string[];

  summary: {
    changed_nodes: number;
    valid_changed_nodes: number;
    direct_impact: number;
    total_downstream: number;
    affected_files: number;
    affected_symbols: number;
    affected_tests: number;
    highest_risk_level: "low" | "medium" | "high";
    risk_amplification_count: number;
  };

  by_layer: {
    architecture: string[];
    interface: string[];
    module: string[];
    handoff: string[];
    generated_files: string[];
    generated_symbols: string[];
    tests: string[];
  };

  risk_amplification: RiskAmplification[];

  critical_paths: CriticalPath[];
  paths_truncated: boolean;
  total_critical_paths_found: number;

  markdown: string;
};

// ---------------------------------------------------------------------------
// Risk classification
// ---------------------------------------------------------------------------

function classifyRisk(node: BoundaryNode): "high" | "medium" | "low" | null {
  if (node.kind === "conflict_policy" && node.critical) return "high";
  if (node.kind === "forbidden_assumption") return "high";
  if (node.kind === "state_machine") return "medium";
  if (node.kind === "data_model") return "medium";
  return null;
}

function overallRisk(amplifications: RiskAmplification[]): "low" | "medium" | "high" {
  if (amplifications.some(a => a.risk_level === "high")) return "high";
  if (amplifications.some(a => a.risk_level === "medium")) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Shortest path (BFS)
// ---------------------------------------------------------------------------

function findShortestPath(graph: BoundaryGraph, from: string, to: string): string[] | null {
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue = [from];
  visited.add(from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) {
      const path: string[] = [];
      let node = to;
      while (node !== from) {
        path.unshift(node);
        node = parent.get(node)!;
      }
      path.unshift(from);
      return path;
    }
    for (const e of graph.edges) {
      if (e.from === current && !visited.has(e.to)) {
        visited.add(e.to);
        parent.set(e.to, current);
        queue.push(e.to);
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

const MAX_CRITICAL_PATHS = 20;

export function computeBlastRadius(
  graph: BoundaryGraph,
  request: BlastRadiusRequest,
): BlastRadiusReport {
  const warnings: string[] = [];
  const invalidNodes: string[] = [];

  // Validate nodes
  const nodeIdSet = new Set(graph.nodes.map(n => n.node_id));
  const validNodes: string[] = [];
  for (const id of request.changed_nodes) {
    if (nodeIdSet.has(id)) {
      validNodes.push(id);
    } else {
      invalidNodes.push(id);
      warnings.push(`Node "${id}" not found in boundary graph`);
    }
  }

  if (validNodes.length === 0) {
    return emptyReport(request, graph.handoff_package_hash, warnings, invalidNodes);
  }

  // Compute blast radius
  const seeds = queryBlastRadiusSeeds(graph, validNodes);

  // Group by layer
  const byLayer = {
    architecture: [] as string[],
    interface: [] as string[],
    module: [] as string[],
    handoff: [] as string[],
    generated_files: [] as string[],
    generated_symbols: [] as string[],
    tests: [] as string[],
  };

  for (const n of seeds.downstream) {
    switch (n.layer) {
      case "architecture": byLayer.architecture.push(n.node_id); break;
      case "interface": byLayer.interface.push(n.node_id); break;
      case "module": byLayer.module.push(n.node_id); break;
      case "handoff": byLayer.handoff.push(n.node_id); break;
      case "generated":
        if (n.kind === "generated_file") byLayer.generated_files.push(n.node_id);
        else if (n.kind === "generated_symbol") byLayer.generated_symbols.push(n.node_id);
        break;
      case "test": byLayer.tests.push(n.node_id); break;
    }
  }

  // Risk amplification
  const amplifications: RiskAmplification[] = [];
  for (const n of seeds.downstream) {
    const risk = classifyRisk(n);
    if (!risk) continue;

    // Find which changed node reaches this risk node
    const sourcePath: string[] = [];
    for (const changed of validNodes) {
      const path = findShortestPath(graph, changed, n.node_id);
      if (path) {
        sourcePath.push(...path);
        break;
      }
    }

    // Find tests downstream of this risk node
    const riskDown = queryDownstream(graph, n.node_id);
    const affectedTests = riskDown.filter(d => d.kind === "test_obligation").map(d => d.node_id);

    amplifications.push({
      node_id: n.node_id,
      label: n.node_id,
      risk_level: risk,
      reason: n.kind === "conflict_policy" ? "High-risk conflict policy affected"
        : n.kind === "forbidden_assumption" ? "Forbidden assumption affected"
        : n.kind === "state_machine" ? "State machine affected"
        : "Data model affected",
      source_path: sourcePath,
      affected_tests: affectedTests,
    });
  }

  // Sort: high first
  amplifications.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.risk_level] - order[b.risk_level];
  });

  // Critical paths: shortest path from each changed node to each affected test
  const allPaths: CriticalPath[] = [];
  const testNodes = seeds.tests;
  for (const changed of validNodes) {
    for (const test of testNodes) {
      const path = findShortestPath(graph, changed, test.node_id);
      if (path) {
        // Determine path risk
        let pathRisk: "low" | "medium" | "high" = "low";
        for (const nodeId of path) {
          const node = graph.nodes.find(n => n.node_id === nodeId);
          if (node) {
            const r = classifyRisk(node);
            if (r === "high") { pathRisk = "high" as const; break; }
            if (r === "medium") pathRisk = "medium" as const;
          }
        }

        allPaths.push({
          path_id: `path_${allPaths.length + 1}`,
          from: changed,
          to: test.node_id,
          nodes: path,
          risk_level: pathRisk,
          reason: `${changed} → ${test.node_id}`,
        });
      }
    }
  }

  // Sort by risk, truncate
  allPaths.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.risk_level] - order[b.risk_level];
  });

  const truncated = allPaths.length > MAX_CRITICAL_PATHS;
  const criticalPaths = allPaths.slice(0, MAX_CRITICAL_PATHS);

  const report: BlastRadiusReport = {
    request,
    generated_at: new Date().toISOString(),
    graph_hash: graph.handoff_package_hash,
    warnings,
    invalid_nodes: invalidNodes,
    summary: {
      changed_nodes: request.changed_nodes.length,
      valid_changed_nodes: validNodes.length,
      direct_impact: seeds.direct.length,
      total_downstream: seeds.downstream.length,
      affected_files: seeds.generated_files.length,
      affected_symbols: seeds.generated_symbols.length,
      affected_tests: seeds.tests.length,
      highest_risk_level: amplifications.length > 0 ? overallRisk(amplifications) : "low",
      risk_amplification_count: amplifications.filter(a => a.risk_level === "high").length,
    },
    by_layer: byLayer,
    risk_amplification: amplifications,
    critical_paths: criticalPaths,
    paths_truncated: truncated,
    total_critical_paths_found: allPaths.length,
    markdown: "",
  };

  report.markdown = generateMarkdown(report);
  return report;
}

// ---------------------------------------------------------------------------
// Empty report
// ---------------------------------------------------------------------------

function emptyReport(
  request: BlastRadiusRequest,
  graphHash: string,
  warnings: string[],
  invalidNodes: string[],
): BlastRadiusReport {
  return {
    request,
    generated_at: new Date().toISOString(),
    graph_hash: graphHash,
    warnings,
    invalid_nodes: invalidNodes,
    summary: {
      changed_nodes: request.changed_nodes.length,
      valid_changed_nodes: 0,
      direct_impact: 0,
      total_downstream: 0,
      affected_files: 0,
      affected_symbols: 0,
      affected_tests: 0,
      highest_risk_level: "low",
      risk_amplification_count: 0,
    },
    by_layer: {
      architecture: [], interface: [], module: [],
      handoff: [], generated_files: [], generated_symbols: [], tests: [],
    },
    risk_amplification: [],
    critical_paths: [],
    paths_truncated: false,
    total_critical_paths_found: 0,
    markdown: "# Blast Radius Report\n\nNo valid changed nodes provided.\n",
  };
}

// ---------------------------------------------------------------------------
// Markdown generator
// ---------------------------------------------------------------------------

function generateMarkdown(report: BlastRadiusReport): string {
  const lines: string[] = [];
  const s = report.summary;

  lines.push("# Blast Radius Report\n");
  if (report.request.change_description) {
    lines.push(`> ${report.request.change_description}\n`);
  }

  lines.push("## Changed Nodes\n");
  for (const n of report.request.changed_nodes) {
    const invalid = report.invalid_nodes.includes(n);
    lines.push(`- \`${n}\`${invalid ? " ⚠️ (not found)" : ""}`);
  }
  lines.push("");

  lines.push("## Summary\n");
  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Changed nodes | ${s.changed_nodes} (${s.valid_changed_nodes} valid) |`);
  lines.push(`| Direct impact | ${s.direct_impact} |`);
  lines.push(`| Total downstream | ${s.total_downstream} |`);
  lines.push(`| Affected files | ${s.affected_files} |`);
  lines.push(`| Affected symbols | ${s.affected_symbols} |`);
  lines.push(`| Affected tests | ${s.affected_tests} |`);
  lines.push(`| Highest risk | **${s.highest_risk_level}** |`);
  lines.push(`| Risk amplifications | ${s.risk_amplification_count} |`);
  lines.push("");

  if (report.by_layer.generated_files.length > 0) {
    lines.push("## Affected Generated Files\n");
    for (const f of report.by_layer.generated_files) lines.push(`- \`${f}\``);
    lines.push("");
  }

  if (report.by_layer.tests.length > 0) {
    lines.push("## Affected Tests\n");
    for (const t of report.by_layer.tests) lines.push(`- \`${t}\``);
    lines.push("");
  }

  if (report.risk_amplification.length > 0) {
    lines.push("## Risk Amplification\n");
    for (const ra of report.risk_amplification.filter(a => a.risk_level === "high")) {
      lines.push(`### ${ra.node_id} — **${ra.risk_level}**\n`);
      lines.push(`- Reason: ${ra.reason}`);
      if (ra.affected_tests.length > 0) {
        lines.push(`- Tests: ${ra.affected_tests.map(t => `\`${t}\``).join(", ")}`);
      }
      if (ra.source_path.length > 0) {
        lines.push(`- Path: ${ra.source_path.map(n => `\`${n}\``).join(" → ")}`);
      }
      lines.push("");
    }
  }

  if (report.critical_paths.length > 0) {
    lines.push("## Critical Paths\n");
    for (const cp of report.critical_paths.slice(0, 10)) {
      const risk = cp.risk_level === "high" ? "🔴" : cp.risk_level === "medium" ? "🟡" : "🟢";
      lines.push(`${risk} ${cp.nodes.map(n => `\`${n}\``).join(" → ")}\n`);
    }
    if (report.paths_truncated) {
      lines.push(`\n*${report.total_critical_paths_found - report.critical_paths.length} more paths truncated*\n`);
    }
  }

  return lines.join("\n");
}
