import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lintArtifact } from "../src/linter.js";
import type { Artifact, CanonicalPointer } from "../src/types.js";

const dataDir = join(process.cwd(), "data", "trial");

const canonicalPath = join(dataDir, "canonical", "pantheon_architecture.json");
const raw = readFileSync(canonicalPath, "utf8");
const pointer = JSON.parse(raw) as CanonicalPointer;

const revPath = join(
  dataDir, "revisions", "pantheon_architecture",
  `${pointer.current_revision_id}.json`
);
const artifact = JSON.parse(readFileSync(revPath, "utf8")) as Artifact;

const issues = lintArtifact(artifact);

console.log("=== RESIDUAL BREAKDOWN ===");
console.log(`Total: ${issues.length}`);
console.log();

// By type
const byType: Record<string, number> = {};
for (const i of issues) byType[i.issue_type] = (byType[i.issue_type] || 0) + 1;
console.log("By type:");
for (const [t, c] of Object.entries(byType)) console.log(`  ${t}: ${c}`);
console.log();

// By severity
const bySev: Record<string, number> = {};
for (const i of issues) bySev[i.severity] = (bySev[i.severity] || 0) + 1;
console.log("By severity:");
for (const [s, c] of Object.entries(bySev)) console.log(`  ${s}: ${c}`);
console.log();

// By section
const sectionMap: Record<string, string> = {};
for (const sec of artifact.sections) {
  for (const block of sec.commitments) {
    sectionMap[block.block_id] = `${sec.section_id} (${sec.title})`;
  }
}
const bySec: Record<string, number> = {};
for (const i of issues) {
  const sec = sectionMap[i.target_block_id] || "unknown";
  bySec[sec] = (bySec[sec] || 0) + 1;
}
console.log("By section:");
for (const [s, c] of Object.entries(bySec)) console.log(`  ${s}: ${c}`);
console.log();

// Detail
console.log("=== DETAIL ===");
for (const i of issues) {
  const sec = sectionMap[i.target_block_id] || "?";
  console.log(`[${i.severity}] ${i.issue_type} | ${i.target_block_id} | ${sec}`);
  console.log(`  ${i.message}`);
  console.log();
}
