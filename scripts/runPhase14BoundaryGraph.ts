/**
 * P14 — Boundary Mapping Graph (v2)
 *
 * Materializes handoff provenance into queryable boundary graph.
 * Runs 6 consistency gates. Outputs graph + report.
 *
 * Usage: npx tsx scripts/runPhase14BoundaryGraph.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { buildBoundaryGraph } from "../src/boundary/boundaryGraph.js";
import { runAllGates, queryDownstream, queryUpstream, queryBlastRadiusSeeds } from "../src/boundary/boundaryGatesAndQueries.js";
import type { ImplementationHandoffPackage } from "../src/handoff/types.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const HANDOFF_DIR = join(STORE_ROOT, "handoff");
const GEN_DIR = join(STORE_ROOT, "implementation", "generated");
const BOUNDARY_DIR = join(STORE_ROOT, "boundary");
const EVIDENCE_DIR = join(STORE_ROOT, "evidence");

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P14: Boundary Mapping Graph (v2)                    ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Step 1: Load handoff package
  console.log("  1. Loading handoff_package.json...");
  const pkgRaw = await fs.readFile(join(HANDOFF_DIR, "handoff_package.json"), "utf8");
  const pkg: ImplementationHandoffPackage = JSON.parse(pkgRaw);
  const pkgHash = createHash("sha256").update(pkgRaw).digest("hex").slice(0, 16);

  // Step 2: Scan generated files
  console.log("  2. Scanning generated files...");
  const genFiles: Array<{ fileName: string }> = [];
  for (const f of await fs.readdir(GEN_DIR)) {
    if (f.endsWith(".kt")) genFiles.push({ fileName: f });
  }
  try {
    for (const f of await fs.readdir(join(GEN_DIR, "contracts"))) {
      if (f.endsWith(".kt")) genFiles.push({ fileName: `contracts/${f}` });
    }
  } catch { /* no contracts dir */ }
  console.log(`     ${genFiles.length} generated files found\n`);

  // Step 3: Build graph
  console.log("  3. Building boundary graph...");
  const graph = buildBoundaryGraph(pkg, genFiles, pkgHash);

  const layerCounts: Record<string, number> = {};
  for (const n of graph.nodes) {
    layerCounts[n.layer] = (layerCounts[n.layer] || 0) + 1;
  }
  console.log(`     Nodes: ${graph.stats.node_count}`);
  console.log(`     Edges: ${graph.stats.edge_count}`);
  for (const [layer, count] of Object.entries(layerCounts).sort()) {
    console.log(`       ${layer}: ${count}`);
  }
  console.log(`     Critical orphans: ${graph.stats.orphan_critical_nodes.length}\n`);

  // Step 4: Run 6 consistency gates
  console.log("  4. Running 6 consistency gates...");
  const gates = runAllGates(graph);
  let criticalFails = 0;
  let warningFails = 0;
  for (const g of gates) {
    const icon = g.status === "pass" ? "✅" : g.severity === "critical" ? "❌" : "⚠️";
    console.log(`     ${icon} ${g.gate_name}: ${g.covered}/${g.total} (${g.status})`);
    if (g.status === "fail" && g.severity === "critical") criticalFails++;
    else if (g.status !== "pass") warningFails++;
    for (const f of g.critical_failures.slice(0, 3)) {
      console.log(`        ❌ ${f.node_id}: ${f.message}`);
    }
    for (const w of g.warnings.slice(0, 3)) {
      console.log(`        ⚠️ ${w.node_id}: ${w.message}`);
    }
  }
  console.log();

  // Step 5: Sample queries
  console.log("  5. Sample queries...");
  const down = queryDownstream(graph, "blk:arch:b_conflict_001");
  console.log(`     queryDownstream("blk:arch:b_conflict_001"): ${down.length} nodes`);
  const genDown = down.filter(n => n.kind === "generated_file");
  if (genDown.length > 0) console.log(`       Generated files: ${genDown.map(n => n.node_id).join(", ")}`);

  const up = queryUpstream(graph, "file:contracts/Guards.kt");
  console.log(`     queryUpstream("file:contracts/Guards.kt"): ${up.length} nodes`);
  console.log(`       Architecture sources: ${up.filter(n => n.layer === "architecture").length}`);

  const blast = queryBlastRadiusSeeds(graph, ["blk:arch:b_sync_001"]);
  console.log(`     queryBlastRadiusSeeds(["blk:arch:b_sync_001"]):`);
  console.log(`       Direct: ${blast.direct.length} | Downstream: ${blast.downstream.length}`);
  console.log(`       Files: ${blast.generated_files.length} | Symbols: ${blast.generated_symbols.length} | Tests: ${blast.tests.length}`);
  console.log();

  // Step 6: Write outputs
  console.log("  6. Writing outputs...");
  await fs.mkdir(BOUNDARY_DIR, { recursive: true });
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });

  await fs.writeFile(join(BOUNDARY_DIR, "boundary_graph.json"), JSON.stringify(graph, null, 2), "utf8");
  console.log("     ✅ boundary_graph.json");

  const gateReport = {
    phase: "P14",
    package_hash: pkgHash,
    generated_at: new Date().toISOString(),
    nodes: graph.stats.node_count,
    edges: graph.stats.edge_count,
    layers: layerCounts,
    orphan_critical: graph.stats.orphan_critical_nodes.length,
    gates: gates.map(g => ({
      gate_id: g.gate_id,
      status: g.status,
      severity: g.severity,
      coverage: `${g.covered}/${g.total}`,
      critical_fails: g.critical_failures.length,
      warnings: g.warnings.length,
    })),
  };
  await fs.writeFile(join(BOUNDARY_DIR, "boundary_gates_report.json"), JSON.stringify(gateReport, null, 2), "utf8");
  console.log("     ✅ boundary_gates_report.json");

  await fs.writeFile(join(EVIDENCE_DIR, "p14_boundary_graph.json"), JSON.stringify(gateReport, null, 2), "utf8");
  console.log("     ✅ p14_boundary_graph.json (evidence)");

  // Final
  const allPass = criticalFails === 0 && warningFails === 0;
  const passWarn = criticalFails === 0 && warningFails > 0;
  const icon = allPass ? "✅ PASS" : passWarn ? "⚠️ PASS WITH WARNINGS" : "❌ FAIL";

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P14 BOUNDARY MAPPING GRAPH: ${icon}`);
  console.log(`  Nodes: ${graph.stats.node_count} | Edges: ${graph.stats.edge_count}`);
  console.log(`  Gates: ${gates.filter(g => g.status === "pass").length}/${gates.length} pass`);
  console.log(`  Critical orphans: ${graph.stats.orphan_critical_nodes.length}`);
  console.log(`  ══════════════════════════════════════════════════\n`);
}

main().catch(err => { console.error("P14 failed:", err); process.exit(1); });
