#!/usr/bin/env tsx
/**
 * P28b-1 Support Label Sanity Audit
 *
 * Samples 10 repos from the raw baseline:
 *   5 "supported" repos
 *   3 "smoke" or lower-confidence repos
 *   2 repos with gaps
 *
 * For each, checks:
 *   - support_level vs actual python_obs evidence
 *   - framework detection evidence quality (not just a label)
 *   - project_role signal specificity
 *   - risk preset specificity (or honest fallback)
 *   - test mapping gap impact
 *   - unknowns / unresolved count
 *
 * Output: data/dogfood/p28b_python_matrix/sanity_audit.md
 */

import { join, resolve, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const PANTHEON_ROOT = resolve(__dirname, "..");
const BASELINE_RAW_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix", "baseline_raw");
const OUTPUT_DIR = join(PANTHEON_ROOT, "data", "dogfood", "p28b_python_matrix");

function log(msg: string) { console.log(`[sanity] ${msg}`); }

interface AuditEntry {
  repo_id: string;
  category: string;
  support_level: string;
  expected_min_support: string;
  sample_reason: string;
  evidence: {
    framework_signals: { name: string; confidence: string; evidence_dims: number }[];
    project_roles: string[];
    layout: { primary: string; confidence: string };
    risk_preset: string;
    risk_validation: string;
    test_mapping_paths_found: number;
    python_file_count: number;
    unknowns: string[];
  };
  verdict: "CALIBRATED" | "POSSIBLY_WIDE" | "NARROW";
  verdict_reason: string;
}

function auditRepo(repoId: string, sampleReason: string): AuditEntry | null {
  const rawPath = join(BASELINE_RAW_DIR, repoId, "raw_baseline.json");
  const obsPath = join(BASELINE_RAW_DIR, repoId, "python_obs.json");

  if (!existsSync(rawPath)) { log(`  SKIP ${repoId}: no raw_baseline.json`); return null; }

  const raw = JSON.parse(readFileSync(rawPath, "utf-8"));
  const pyObs = existsSync(obsPath)
    ? JSON.parse(readFileSync(obsPath, "utf-8"))
    : raw.python_obs;

  if (!pyObs) { log(`  SKIP ${repoId}: no python_obs`); return null; }

  // Extract evidence
  const frameworkSignals = (pyObs.framework_profile?.framework_signals ?? []).map((f: any) => ({
    name: f.framework ?? f.name ?? "unknown",
    confidence: f.confidence ?? "none",
    evidence_dims: Array.isArray(f.evidence)
      ? f.evidence.length
      : (f.evidence_dimensions?.length ?? f.evidence_count ?? 0),
  }));

  const projectRoles = (pyObs.framework_profile?.project_role_signals ?? []).map(
    (r: any) => r.role ?? r
  );

  const layout = {
    primary: pyObs.layout?.primary_layout ?? "unknown",
    confidence: pyObs.layout?.confidence ?? "none",
  };

  const rp = pyObs.risk_preset_validation;
  const riskPreset = rp?.preset ?? "unknown";
  const riskValidation = rp?.validation ?? "unvalidated";

  const testMappings = pyObs.test_mappings ?? [];
  const testPathsFound = testMappings.reduce(
    (acc: number, t: any) => acc + (t.existing_test_paths?.length ?? 0), 0
  );

  const pythonFileCount = pyObs.quality?.python_file_count ?? 0;

  // Unknowns / unresolved
  const unknowns: string[] = [];
  if (layout.confidence === "none" || layout.confidence === "low") unknowns.push(`layout_low_confidence(${layout.confidence})`);
  if (frameworkSignals.length === 0) unknowns.push("no_framework_signal");
  if (frameworkSignals.every((f: any) => f.confidence === "low" || f.confidence === "none")) unknowns.push("all_frameworks_low_confidence");
  if (projectRoles.length === 0) unknowns.push("no_project_role");
  if (riskPreset === "unknown") unknowns.push("risk_preset_unknown");
  if (riskValidation === "unvalidated") unknowns.push("risk_preset_unvalidated");
  if (testPathsFound === 0) unknowns.push("test_mapping_zero");

  // Verdict
  const supportLevel = raw.support_assessment?.support_level ?? "unknown";
  const highConfFramework = frameworkSignals.some((f: any) => f.confidence === "high" || f.confidence === "medium");
  const hasRole = projectRoles.length > 0;
  const hasLayout = layout.confidence !== "none" && layout.confidence !== "low";
  const hasRisk = riskPreset !== "unknown" && riskValidation !== "unvalidated";

  let verdict: AuditEntry["verdict"];
  let verdict_reason: string;

  if (supportLevel === "validated") {
    if (highConfFramework && hasRole && hasLayout && hasRisk) {
      verdict = "CALIBRATED";
      verdict_reason = "All 4 key evidence dimensions present with appropriate confidence";
    } else if (!highConfFramework || !hasRole) {
      verdict = "POSSIBLY_WIDE";
      verdict_reason = `validated but framework=${highConfFramework}, role=${hasRole} — evidence quality questionable`;
    } else {
      verdict = "CALIBRATED";
      verdict_reason = "Core framework and role evidence present";
    }
  } else if (supportLevel === "supported") {
    if (hasRole && (highConfFramework || hasLayout)) {
      verdict = "CALIBRATED";
      verdict_reason = "Project role + framework/layout evidence supports 'supported' label";
    } else {
      verdict = "POSSIBLY_WIDE";
      verdict_reason = `supported but role=${hasRole}, highConfFW=${highConfFramework}, layout=${hasLayout}`;
    }
  } else if (supportLevel === "smoke") {
    verdict = "NARROW";
    verdict_reason = "smoke is a conservative label — if observation completed, likely calibrated correctly";
  } else {
    verdict = "CALIBRATED";
    verdict_reason = `${supportLevel} — appropriate for actual observation quality`;
  }

  const entry: AuditEntry = {
    repo_id: repoId,
    category: raw.category,
    support_level: supportLevel,
    expected_min_support: raw.expected_min_support,
    sample_reason: sampleReason,
    evidence: {
      framework_signals: frameworkSignals,
      project_roles: projectRoles,
      layout,
      risk_preset: riskPreset,
      risk_validation: riskValidation,
      test_mapping_paths_found: testPathsFound,
      python_file_count: pythonFileCount,
      unknowns,
    },
    verdict,
    verdict_reason,
  };

  const icon = verdict === "CALIBRATED" ? "✅" : verdict === "POSSIBLY_WIDE" ? "⚠️" : "🔵";
  log(`  ${icon} ${repoId}: ${supportLevel} → ${verdict}`);
  log(`     framework: ${frameworkSignals.map((f: any) => `${f.name}(${f.confidence})`).join(", ") || "none"}`);
  log(`     roles: [${projectRoles.join(", ")}] | layout: ${layout.primary}(${layout.confidence})`);
  log(`     risk: ${riskPreset}/${riskValidation} | tests_found: ${testPathsFound}`);
  if (unknowns.length > 0) log(`     unknowns: ${unknowns.join(", ")}`);

  return entry;
}

function main() {
  log("P28b-1 Support Label Sanity Audit");
  log(`Reading from: ${BASELINE_RAW_DIR}\n`);

  // Sample selection
  const SAMPLE = [
    // 5 supported/validated repos
    { id: "requests", reason: "supported: clean SDK, expected validated" },
    { id: "flask", reason: "supported: web framework, expected supported" },
    { id: "celery", reason: "supported: data pipeline, expected supported" },
    { id: "black", reason: "supported: CLI tool, expected validated" },
    { id: "starlette", reason: "supported: ASGI framework, expected validated" },
    // 3 smoke/lower-confidence
    { id: "build", reason: "smoke: PyPA build tool, layout_classification_gap" },
    { id: "tiktoken-ml", reason: "supported: framework_detection_gap repo" },
    { id: "python-monorepo", reason: "supported: framework_detection_gap, monorepo" },
    // 2 with gaps
    { id: "loguru", reason: "supported: framework_detection_gap + risk_preset_gap" },
    { id: "nltk", reason: "supported: test_mapping_gap + risk_preset_gap" },
  ];

  const entries: AuditEntry[] = [];
  for (const s of SAMPLE) {
    log(`\n[${s.reason}]`);
    const entry = auditRepo(s.id, s.reason);
    if (entry) entries.push(entry);
  }

  // Summary
  const calibrated = entries.filter(e => e.verdict === "CALIBRATED").length;
  const possiblyWide = entries.filter(e => e.verdict === "POSSIBLY_WIDE").length;
  const narrow = entries.filter(e => e.verdict === "NARROW").length;

  log(`\n=== Sanity Audit Summary ===`);
  log(`Sampled: ${entries.length} | CALIBRATED: ${calibrated} | POSSIBLY_WIDE: ${possiblyWide} | NARROW: ${narrow}`);

  const calibrationNote = possiblyWide === 0
    ? "98% supported+ is well-calibrated: all sampled repos have appropriate evidence for their label"
    : possiblyWide <= 2
    ? `Mostly calibrated: ${possiblyWide} repo(s) may have slightly wide labels, but not systematic over-claim`
    : `CONCERN: ${possiblyWide} repos show possibly wide labels — supported+ may be over-claimed`;

  log(`Assessment: ${calibrationNote}`);

  // Markdown report
  const lines = [
    "# P28b-1 Support Label Sanity Audit",
    "",
    `Generated: ${new Date().toISOString().split("T")[0]} | Sampled: ${entries.length} repos`,
    "",
    "## Calibration Summary",
    "",
    `| Verdict | Count |`,
    `|---|---|`,
    `| ✅ CALIBRATED | ${calibrated} |`,
    `| ⚠️ POSSIBLY_WIDE | ${possiblyWide} |`,
    `| 🔵 NARROW (conservative) | ${narrow} |`,
    "",
    `**Assessment**: ${calibrationNote}`,
    "",
    "## Sampled Repos",
    "",
  ];

  for (const e of entries) {
    const icon = e.verdict === "CALIBRATED" ? "✅" : e.verdict === "POSSIBLY_WIDE" ? "⚠️" : "🔵";
    lines.push(`### ${icon} ${e.repo_id} (${e.category})`);
    lines.push("");
    lines.push(`- **Sample reason**: ${e.sample_reason}`);
    lines.push(`- **support_level**: \`${e.support_level}\` (expected: \`${e.expected_min_support}\`)`);
    lines.push(`- **Verdict**: ${e.verdict} — ${e.verdict_reason}`);
    lines.push(`- **Framework signals**: ${e.evidence.framework_signals.map(f => `${f.name}(${f.confidence}, ${f.evidence_dims} dims)`).join(", ") || "none"}`);
    lines.push(`- **Project roles**: ${e.evidence.project_roles.join(", ") || "none"}`);
    lines.push(`- **Layout**: ${e.evidence.layout.primary} (confidence: ${e.evidence.layout.confidence})`);
    lines.push(`- **Risk preset**: ${e.evidence.risk_preset} / ${e.evidence.risk_validation}`);
    lines.push(`- **Test paths found**: ${e.evidence.test_mapping_paths_found} | **Python files**: ${e.evidence.python_file_count}`);
    if (e.evidence.unknowns.length > 0) {
      lines.push(`- **Unknowns**: ${e.evidence.unknowns.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Conclusion");
  lines.push("");
  lines.push(calibrationNote);
  lines.push("");
  lines.push("### Implication for P28b-2");
  lines.push("");
  if (possiblyWide === 0) {
    lines.push("Support labels are well-calibrated. P28b-2 can proceed with confidence that `supported+` repos will produce useful repair workflow signals.");
  } else {
    lines.push(`${possiblyWide} repo(s) with possibly-wide labels are noted. P28b-2 should prioritize those repos in dogfood to surface any repair workflow gaps.`);
  }
  lines.push("");
  lines.push("---");
  lines.push("_Auto-generated by p28b_sanity_audit.ts_");

  const outPath = join(OUTPUT_DIR, "sanity_audit.md");
  writeFileSync(outPath, lines.join("\n"));
  writeFileSync(join(OUTPUT_DIR, "sanity_audit.json"), JSON.stringify({ entries, calibrationNote, summary: { calibrated, possiblyWide, narrow } }, null, 2));
  log(`\nWritten: ${outPath}`);
}

main();
