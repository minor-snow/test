/**
 * Phase 10 — P10-006: Cross-Artifact Consistency Pass
 *
 * Reads all three canonical P10 artifacts and runs:
 *   1. Local lint per artifact
 *   2. Domain quality per artifact
 *   3. Cross-artifact linter
 *   4. Link coverage stats
 *   5. Requirement traceability matrix
 *   6. Integrity check
 *
 * Usage: npx tsx scripts/runPhase10Consistency.ts
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { loadCanonicalRevision } from "../src/artifactStore.js";
import { lintArtifact } from "../src/linter.js";
import { crossLintArtifacts } from "../src/crossArtifactLinter.js";
import { evaluateDraftQuality } from "../src/domainQualityEvaluator.js";
import { loadDomainProfile } from "../src/domainProfile.js";
import { integrityCheck } from "../src/integrityCheck.js";
import type { Artifact, Issue } from "../src/types.js";
import type { StoreConfig } from "../src/artifactStore.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const PROFILES_DIR = join(process.cwd(), "data", "profiles");

// Business requirements to trace
const REQUIREMENTS = [
  { requirement: "offline-first", keywords: ["offline-first", "offline", "local", "without network"] },
  { requirement: "local multi-step decision tree", keywords: ["decision tree", "local decision", "triage rules", "multi-step"] },
  { requirement: "pending report", keywords: ["pending report", "local report", "offline report"] },
  { requirement: "background async sync", keywords: ["sync queue", "background sync", "async sync", "upload queue"] },
  { requirement: "multi-clinic cloud sync", keywords: ["multi-clinic", "clinic backend", "clinic replica", "multiple clinic"] },
  { requirement: "vector clock", keywords: ["vector clock", "version vector", "causal clock"] },
  { requirement: "LWW", keywords: ["last-writer-wins", "lww", "last writer wins", "timestamp resolution"] },
  { requirement: "deterministic conflict resolution", keywords: ["conflict resolution", "conflict resolver", "deterministic", "merge"] },
  { requirement: "no silent overwrite", keywords: ["never silently", "no silent", "explicit", "user-visible conflict", "clinician"] },
  { requirement: "no forced re-entry", keywords: ["re-entry", "re-enter", "survive", "persist", "data loss"] },
];

function findMatchingBlocks(artifact: Artifact, keywords: string[]): string[] {
  const matched: string[] = [];
  for (const sec of artifact.sections) {
    for (const b of sec.commitments) {
      const text = (b.text + " " + (b.rationale || "")).toLowerCase();
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        matched.push(b.block_id);
      }
    }
  }
  return matched;
}

function countIssuesByType(issues: Issue[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const issue of issues) {
    counts[issue.issue_type] = (counts[issue.issue_type] || 0) + 1;
  }
  return counts;
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P10-006: Cross-Artifact Consistency Pass            ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const store: StoreConfig = { dataDir: STORE_ROOT };

  // 1. Load canonical artifacts
  console.log("  [1/6] Loading canonical artifacts...");
  const arch = await loadCanonicalRevision(store, "pet_triage_offline_architecture");
  const iface = await loadCanonicalRevision(store, "pet_triage_offline_interface");
  const mod = await loadCanonicalRevision(store, "pet_triage_offline_module");

  if (!arch || !iface || !mod) {
    console.error("    ❌ Missing canonical artifacts");
    process.exit(1);
  }

  const artifacts = [
    { id: "architecture", artifact: arch, profile: "pet_triage_offline_first.json" },
    { id: "interface", artifact: iface, profile: "pet_triage_offline_first_interface.json" },
    { id: "module", artifact: mod, profile: "pet_triage_offline_first_module.json" },
  ];

  for (const a of artifacts) {
    const blocks = a.artifact.sections.reduce((s, sec) => s + sec.commitments.length, 0);
    console.log(`    ${a.artifact.artifact_id} @ ${a.artifact.revision_id} (${blocks} blocks)`);
  }

  // 2. Local lint
  console.log("\n  [2/6] Local lint...");
  const localIssues: Record<string, { issues: Issue[]; counts: Record<string, number> }> = {};
  for (const a of artifacts) {
    const issues = lintArtifact(a.artifact);
    const counts = countIssuesByType(issues);
    localIssues[a.id] = { issues, counts };
    console.log(`    ${a.id}: ${issues.length} issues ${JSON.stringify(counts)}`);
  }

  // 3. Domain quality
  console.log("\n  [3/6] Domain quality...");
  const qualityReports: Record<string, any> = {};
  for (const a of artifacts) {
    const profile = await loadDomainProfile(join(PROFILES_DIR, a.profile));
    const report = evaluateDraftQuality(a.artifact, profile);
    qualityReports[a.id] = report;
    console.log(`    ${a.id}: score=${report.score}, coverage=${(report.required_concept_coverage*100).toFixed(0)}%, rec=${report.recommendation}`);
  }

  // 4. Cross-artifact lint
  console.log("\n  [4/6] Cross-artifact lint...");
  const crossIssues = crossLintArtifacts([arch, iface, mod]);
  const crossCounts = countIssuesByType(crossIssues);
  console.log(`    Total cross issues: ${crossIssues.length}`);
  for (const [rule, count] of Object.entries(crossCounts)) {
    console.log(`      ${rule}: ${count}`);
  }
  if (crossIssues.length === 0) {
    console.log("      None ✅");
  }

  // 5. Link coverage
  console.log("\n  [5/6] Link coverage...");
  let ifaceToArch = 0, modToArch = 0, modToIface = 0;
  const uniqueArchLinked = new Set<string>();
  const uniqueIfaceLinked = new Set<string>();

  for (const sec of iface.sections) {
    for (const b of sec.commitments) {
      if (b.linked_architecture_blocks) {
        ifaceToArch += b.linked_architecture_blocks.length;
        for (const id of b.linked_architecture_blocks) uniqueArchLinked.add(id);
      }
    }
  }

  for (const sec of mod.sections) {
    for (const b of sec.commitments) {
      if (b.linked_architecture_blocks) {
        modToArch += b.linked_architecture_blocks.length;
        for (const id of b.linked_architecture_blocks) uniqueArchLinked.add(id);
      }
      if (b.linked_interface_blocks) {
        modToIface += b.linked_interface_blocks.length;
        for (const id of b.linked_interface_blocks) uniqueIfaceLinked.add(id);
      }
    }
  }

  console.log(`    InterfaceSpec → Architecture links: ${ifaceToArch}`);
  console.log(`    ModuleSpec → Architecture links: ${modToArch}`);
  console.log(`    ModuleSpec → Interface links: ${modToIface}`);
  console.log(`    Unique architecture blocks linked: ${uniqueArchLinked.size}`);
  console.log(`    Unique interface blocks linked: ${uniqueIfaceLinked.size}`);

  // 6. Requirement traceability
  console.log("\n  [6/6] Requirement traceability...");
  const traceability = REQUIREMENTS.map(req => {
    const archBlocks = findMatchingBlocks(arch, req.keywords);
    const ifaceBlocks = findMatchingBlocks(iface, req.keywords);
    const modBlocks = findMatchingBlocks(mod, req.keywords);

    let status: "covered" | "partial" | "missing" = "missing";
    if (archBlocks.length > 0 && ifaceBlocks.length > 0 && modBlocks.length > 0) {
      status = "covered";
    } else if (archBlocks.length > 0 || ifaceBlocks.length > 0 || modBlocks.length > 0) {
      status = "partial";
    }

    return {
      requirement: req.requirement,
      architecture_blocks: archBlocks,
      interface_blocks: ifaceBlocks,
      module_blocks: modBlocks,
      status,
    };
  });

  for (const t of traceability) {
    const icon = t.status === "covered" ? "✅" : t.status === "partial" ? "⚠️" : "❌";
    console.log(`    ${icon} ${t.requirement}: A=${t.architecture_blocks.length} I=${t.interface_blocks.length} M=${t.module_blocks.length}`);
  }

  const coveredCount = traceability.filter(t => t.status === "covered").length;
  const partialCount = traceability.filter(t => t.status === "partial").length;
  const missingCount = traceability.filter(t => t.status === "missing").length;

  // Build report
  const report = {
    generated_at: new Date().toISOString(),
    artifacts: artifacts.map(a => ({
      artifact_id: a.artifact.artifact_id,
      revision_id: a.artifact.revision_id,
      score: qualityReports[a.id].score,
      recommendation: qualityReports[a.id].recommendation,
      residual_issues: localIssues[a.id].issues.length,
    })),
    local_issues_by_artifact: Object.fromEntries(
      Object.entries(localIssues).map(([k, v]) => [k, v.issues.length])
    ),
    cross_issues: {
      orphan_interface_contract: crossCounts["orphan_interface_contract"] || 0,
      stale_link: crossCounts["stale_link"] || 0,
      orphan_module_contract: crossCounts["orphan_module_contract"] || 0,
      stale_interface_link: crossCounts["stale_interface_link"] || 0,
    },
    link_coverage: {
      interface_to_architecture_links: ifaceToArch,
      module_to_architecture_links: modToArch,
      module_to_interface_links: modToIface,
      unique_architecture_blocks_linked: uniqueArchLinked.size,
      unique_interface_blocks_linked: uniqueIfaceLinked.size,
    },
    requirement_traceability: traceability,
    local_issue_breakdown: Object.fromEntries(
      Object.entries(localIssues).map(([k, v]) => [k, v.counts])
    ),
  };

  // Integrity check
  console.log("\n  [7/7] Integrity check...");
  const integrityReport = await integrityCheck(store);
  const integrityClean = integrityReport.findings.length === 0;
  console.log(`    Findings: ${integrityReport.findings.length} ${integrityClean ? "✅" : "❌"}`);
  if (!integrityClean) {
    for (const f of integrityReport.findings.slice(0, 5)) {
      console.log(`      • ${f.finding_type}: ${f.message}`);
    }
  }
  (report as any).integrity = {
    findings_count: integrityReport.findings.length,
    clean: integrityClean,
  };

  // Decision
  const allScoresOk = artifacts.every(a => qualityReports[a.id].score >= 75);
  const noCrossIssues = crossIssues.length === 0;
  const linksOk = ifaceToArch >= 10 && modToArch >= 10 && modToIface >= 10;
  const traceOk = missingCount === 0 && partialCount <= 1;
  const totalLocalResiduals = Object.values(localIssues).reduce((s, v) => s + v.issues.length, 0);
  const noLocalResiduals = totalLocalResiduals === 0;

  let decision: "pass" | "pass_with_local_residuals" | "pass_with_residuals" | "fail";
  if (allScoresOk && noCrossIssues && linksOk && traceOk && integrityClean && noLocalResiduals) {
    decision = "pass";
  } else if (allScoresOk && noCrossIssues && linksOk && traceOk && integrityClean) {
    decision = "pass_with_local_residuals";
  } else if (allScoresOk && linksOk && integrityClean) {
    decision = "pass_with_residuals";
  } else {
    decision = "fail";
  }

  (report as any).decision = decision;
  (report as any).total_local_residuals = totalLocalResiduals;

  // Save
  const evidenceDir = join(STORE_ROOT, "evidence");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(
    join(evidenceDir, "p10_006_consistency_report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  // Print summary
  console.log("\n  ══════════════════════════════════════════════════");
  console.log("  P10-006 CROSS-ARTIFACT CONSISTENCY REPORT");
  console.log("  ══════════════════════════════════════════════════\n");

  console.log("  ── Pass/Fail ──\n");
  const checks = [
    { name: "All canonical", pass: true, val: "3/3" },
    { name: "All scores >= 75", pass: allScoresOk, val: artifacts.map(a => qualityReports[a.id].score).join("/") },
    { name: "Cross residuals = 0", pass: noCrossIssues, val: crossIssues.length },
    { name: "stale_link = 0", pass: (crossCounts["stale_link"] || 0) === 0, val: crossCounts["stale_link"] || 0 },
    { name: "orphan_interface_contract = 0", pass: (crossCounts["orphan_interface_contract"] || 0) === 0, val: crossCounts["orphan_interface_contract"] || 0 },
    { name: "orphan_module_contract = 0", pass: (crossCounts["orphan_module_contract"] || 0) === 0, val: crossCounts["orphan_module_contract"] || 0 },
    { name: "stale_interface_link = 0", pass: (crossCounts["stale_interface_link"] || 0) === 0, val: crossCounts["stale_interface_link"] || 0 },
    { name: "Iface→Arch links >= 10", pass: ifaceToArch >= 10, val: ifaceToArch },
    { name: "Mod→Arch links >= 10", pass: modToArch >= 10, val: modToArch },
    { name: "Mod→Iface links >= 10", pass: modToIface >= 10, val: modToIface },
    { name: "Traceability: missing = 0", pass: missingCount === 0, val: missingCount },
    { name: "Traceability: partial <= 1", pass: partialCount <= 1, val: partialCount },
    { name: "integrityCheck clean", pass: integrityClean, val: integrityReport.findings.length },
  ];

  for (const c of checks) console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}: ${c.val}`);

  console.log(`\n  ── Decision: ${decision.toUpperCase()} ──`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main().catch(err => { console.error("P10-006 failed:", err); process.exit(1); });
