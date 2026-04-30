// P28b aggregate rebuilder
import * as fs from "fs";
import * as path from "path";

const BASE = "data/dogfood/p28b_python_matrix/baseline_raw";
const SUPPORT_ORDER = ["unsupported", "observed_only", "smoke", "supported", "validated"];
const rank = (l: string) => SUPPORT_ORDER.indexOf(l);

const dirs = fs.readdirSync(BASE).filter(d => fs.statSync(path.join(BASE, d)).isDirectory());
const results: any[] = [];
const allGaps: Record<string, string[]> = {};
let crashes = 0, timeouts = 0, sanViol = 0;

for (const d of dirs) {
  const f = path.join(BASE, d, "raw_baseline.json");
  if (!fs.existsSync(f)) continue;
  const r = JSON.parse(fs.readFileSync(f, "utf-8"));
  results.push({
    repo_id: r.repo_id, category: r.category,
    support_level: r.support_assessment?.support_level ?? "unsupported",
    meets_expected: r.support_assessment?.meets_expected ?? false,
    expected_min_support: r.expected_min_support,
    gaps: r.support_assessment?.gaps ?? [],
    timeout: r.timeout, crash: r.support_assessment?.signals?.crash ?? false,
    sanitizer_clean: r.sanitizer?.clean ?? true,
    scan_ms: r.scan_ms, python_file_count: r.support_assessment?.signals?.python_file_count ?? 0,
    notes: r.notes,
  });
  for (const g of (r.support_assessment?.gaps ?? [])) {
    allGaps[g] = allGaps[g] ?? [];
    allGaps[g].push(r.repo_id);
  }
  if (r.support_assessment?.signals?.crash) crashes++;
  if (r.timeout) timeouts++;
  if (!r.sanitizer?.clean) sanViol++;
}

const smoke = results.filter(r => rank(r.support_level) >= rank("smoke")).length;
const sup = results.filter(r => rank(r.support_level) >= rank("supported")).length;
const byLvl: Record<string, number> = {};
SUPPORT_ORDER.forEach(l => { byLvl[l] = results.filter(r => r.support_level === l).length; });
const top_gaps = Object.entries(allGaps)
  .sort((a, b) => b[1].length - a[1].length).slice(0, 10)
  .map(([kind, repos]) => ({ kind, frequency: repos.length, repos }));

const agg = {
  schema_version: "p28b_raw_baseline@0.1.0",
  generated_at: new Date().toISOString(),
  repo_count: results.length, crash_count: crashes,
  timeout_count: timeouts, sanitizer_violation_repos: sanViol,
  support_levels: byLvl,
  rates: {
    smoke_or_better: Math.round(smoke / results.length * 100),
    supported_or_better: Math.round(sup / results.length * 100),
    meets_expected: Math.round(results.filter(r => r.meets_expected).length / results.length * 100),
  },
  top_gaps, repos: results,
};

fs.writeFileSync(path.join(BASE, "aggregate.json"), JSON.stringify(agg, null, 2));
console.log(`Repos: ${results.length} | Smoke+: ${agg.rates.smoke_or_better}% | Supported+: ${agg.rates.supported_or_better}% | Crashes: ${crashes} | Sanitizer: ${sanViol}`);
console.log("Top gaps:", top_gaps.map(g => `${g.kind}:${g.frequency}`).join(", "));
