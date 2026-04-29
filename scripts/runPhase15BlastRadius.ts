/**
 * P15 — Blast Radius Engine
 *
 * Usage:
 *   npx tsx scripts/runPhase15BlastRadius.ts --nodes blk:arch:b_conflict_001
 *   npx tsx scripts/runPhase15BlastRadius.ts --nodes blk:arch:b_sync_001,blk:arch:b_sync_003
 *   npx tsx scripts/runPhase15BlastRadius.ts --nodes hc:conflict_policy:patient_case_status --desc "Change sync policy"
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { buildBoundaryGraph } from "../src/boundary/boundaryGraph.js";
import { computeBlastRadius } from "../src/boundary/blastRadius.js";
import { generateKotlin } from "../src/codegen/kotlinGenerator.js";
import type { ImplementationHandoffPackage } from "../src/handoff/types.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const BOUNDARY_DIR = join(STORE_ROOT, "boundary");

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P15: Blast Radius Engine                            ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Parse args
  const nodesIdx = process.argv.indexOf("--nodes");
  if (nodesIdx === -1 || !process.argv[nodesIdx + 1]) {
    console.error("  Usage: npx tsx runPhase15BlastRadius.ts --nodes node1,node2 [--desc description]");
    process.exit(1);
  }
  const nodeIds = process.argv[nodesIdx + 1].split(",");
  const descIdx = process.argv.indexOf("--desc");
  const desc = descIdx !== -1 ? process.argv[descIdx + 1] : undefined;

  // Load and build
  console.log("  1. Loading handoff + building graph...");
  const pkgRaw = await fs.readFile(join(STORE_ROOT, "handoff", "handoff_package.json"), "utf8");
  const pkg: ImplementationHandoffPackage = JSON.parse(pkgRaw);
  const gen = generateKotlin(pkg);
  const graph = buildBoundaryGraph(pkg, gen.files, gen.package_hash);
  console.log(`     Graph: ${graph.stats.node_count} nodes, ${graph.stats.edge_count} edges\n`);

  // Compute blast radius
  console.log("  2. Computing blast radius...");
  const report = computeBlastRadius(graph, {
    changed_nodes: nodeIds,
    change_description: desc,
  });

  const s = report.summary;
  console.log(`     Changed: ${s.valid_changed_nodes}/${s.changed_nodes} valid`);
  console.log(`     Direct impact: ${s.direct_impact}`);
  console.log(`     Total downstream: ${s.total_downstream}`);
  console.log(`     Files: ${s.affected_files} | Symbols: ${s.affected_symbols} | Tests: ${s.affected_tests}`);
  console.log(`     Highest risk: ${s.highest_risk_level}`);
  console.log(`     Risk amplifications: ${s.risk_amplification_count}`);

  if (report.warnings.length > 0) {
    console.log(`\n     ⚠️ Warnings:`);
    for (const w of report.warnings) console.log(`       - ${w}`);
  }

  if (report.risk_amplification.filter(a => a.risk_level === "high").length > 0) {
    console.log(`\n     🔴 High-risk amplifications:`);
    for (const a of report.risk_amplification.filter(a => a.risk_level === "high")) {
      console.log(`       - ${a.node_id}: ${a.reason}`);
    }
  }

  if (report.critical_paths.length > 0) {
    console.log(`\n     Critical paths (top ${Math.min(5, report.critical_paths.length)}):`);
    for (const cp of report.critical_paths.slice(0, 5)) {
      const icon = cp.risk_level === "high" ? "🔴" : cp.risk_level === "medium" ? "🟡" : "🟢";
      console.log(`       ${icon} ${cp.nodes.join(" → ")}`);
    }
  }

  // Write outputs
  console.log("\n  3. Writing outputs...");
  await fs.mkdir(BOUNDARY_DIR, { recursive: true });

  const { markdown, ...jsonReport } = report;
  await fs.writeFile(join(BOUNDARY_DIR, "blast_radius_report.json"), JSON.stringify(jsonReport, null, 2), "utf8");
  console.log("     ✅ blast_radius_report.json");

  await fs.writeFile(join(BOUNDARY_DIR, "blast_radius_report.md"), markdown, "utf8");
  console.log("     ✅ blast_radius_report.md");

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P15 BLAST RADIUS: ${s.highest_risk_level === "high" ? "🔴 HIGH" : s.highest_risk_level === "medium" ? "🟡 MEDIUM" : "🟢 LOW"}`);
  console.log(`  Downstream: ${s.total_downstream} | Files: ${s.affected_files} | Tests: ${s.affected_tests}`);
  console.log(`  ══════════════════════════════════════════════════\n`);
}

main().catch(err => { console.error("P15 failed:", err); process.exit(1); });
