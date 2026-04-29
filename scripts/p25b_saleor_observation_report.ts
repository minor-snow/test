/**
 * P25b.1: Saleor Observation Report v2
 *
 * Consumes the P25a Python observation sidecar and emits a repo-wide,
 * human-readable Saleor observation report plus a structured summary JSON.
 *
 * Run:
 *   npx tsx scripts/p25b_saleor_observation_report.ts
 *   npx tsx scripts/p25b_saleor_observation_report.ts --input data/dogfood/p25-saleor/p25a_python_observation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildSaleorObservationReportSummary,
  renderSaleorObservationReportMarkdown,
} from "../src/repoObservation/python/saleorObservationReportRenderer.js";
import type { PythonObservationSidecar } from "../src/repoObservation/python/types.js";
import type { P25aObservationSummary } from "../src/repoObservation/python/saleorObservationReportRenderer.js";

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : undefined;
}

const inputDir = resolve(getFlag("input") ?? "data/dogfood/p25-saleor/p25a_python_observation");
const outputDir = resolve(getFlag("output") ?? "data/dogfood/p25-saleor/p25b_observation_report_v2");
const subjectName = getFlag("subject") ?? "Saleor";

const sidecarPath = join(inputDir, "python_observations.json");
const summaryPath = join(inputDir, "observation_summary.json");

if (!existsSync(sidecarPath)) {
  console.error(`Missing required input: ${sidecarPath}`);
  process.exit(1);
}

console.log("P25b.1: Saleor Observation Report v2\n");
console.log(`  Input: ${inputDir}`);
console.log(`  Output: ${outputDir}`);
console.log("");

const sidecar = JSON.parse(readFileSync(sidecarPath, "utf-8")) as PythonObservationSidecar;
const observationSummary = existsSync(summaryPath)
  ? (JSON.parse(readFileSync(summaryPath, "utf-8")) as P25aObservationSummary)
  : undefined;

const reportSummary = buildSaleorObservationReportSummary({
  sidecar,
  observationSummary,
  subjectName,
});
const reportMarkdown = renderSaleorObservationReportMarkdown(reportSummary);

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "saleor_observation_summary.json"), JSON.stringify(reportSummary, null, 2));
writeFileSync(join(outputDir, "saleor_observation_report.md"), reportMarkdown);

console.log(`  Repo label: ${reportSummary.repo_label}`);
console.log(`  Python files: ${reportSummary.repo_scale.python_files}`);
console.log(`  High-risk domains: ${reportSummary.high_risk_domains.filter(d => d.matched_file_count > 0).length}`);
console.log(`  Explicit-scope readiness: ${reportSummary.boundary_readiness.explicit_scope}`);
console.log("");
console.log(`  -> Wrote ${join(outputDir, "saleor_observation_summary.json")}`);
console.log(`  -> Wrote ${join(outputDir, "saleor_observation_report.md")}`);
