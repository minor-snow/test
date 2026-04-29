/**
 * P20a: Bootstrap Report Renderer
 *
 * Generates a human-readable Markdown report from observations + Lite contract.
 */

import type { RepoObservations } from "./types.js";
import type { ChangeContractLite } from "../changeContract/lite/types.js";
import { generateObservationRecommendations } from "./observationQuality.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderBootstrapReport(input: {
  observations: RepoObservations;
  contract: ChangeContractLite;
}): string {
  const { observations: obs, contract } = input;
  const lines: string[] = [];

  lines.push("# Pantheon Repo Bootstrap Report");
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push(`- **Repo state:** ${obs.repo.repo_state}`);
  lines.push(`- **Files scanned:** ${obs.meta.file_count}`);
  lines.push(`- **Unknowns:** ${obs.meta.unknown_count}`);
  lines.push(`- **Excluded:** ${obs.meta.excluded_count}`);
  lines.push(`- **Sensitive areas:** ${obs.observations.sensitive_paths.length}`);
  lines.push(`- **Test mappings:** ${obs.observations.test_mappings.length}`);
  lines.push(`- **Import edges:** ${obs.observations.import_edges.length}`);
  lines.push(`- **Owner hints:** ${obs.observations.owner_hints.length}`);
  lines.push(`- **Partial scan:** ${obs.meta.partial_scan}`);
  lines.push("");

  if (obs.repo.repo_state === "working_tree_only") {
    lines.push("> **Note:** This observation was built in working-tree-only mode because no Git repository was detected.");
    lines.push("");
  }
  if (obs.repo.repo_state === "git_dirty") {
    lines.push(`> **Warning:** Repository has ${obs.repo.uncommitted_file_count} uncommitted change(s).`);
    lines.push("");
  }

  // ChangeContract Lite decision
  lines.push("## ChangeContract Lite");
  lines.push(`- **Verdict:** ${contract.decision.verdict}`);
  if (contract.decision.reasons.length > 0) {
    lines.push("- **Reasons:**");
    for (const r of contract.decision.reasons) {
      lines.push(`  - ${r}`);
    }
  }
  if (contract.decision.required_actions.length > 0) {
    lines.push("- **Required actions:**");
    for (const a of contract.decision.required_actions) {
      lines.push(`  - ${a}`);
    }
  }
  lines.push("");

  // Changed files
  lines.push("## Changed Files");
  if (contract.changed_files.length === 0) {
    lines.push("_No changed files specified._");
  } else {
    lines.push("| Path | Status | Reason |");
    lines.push("|---|---|---|");
    for (const s of contract.observed_scope.changed_file_statuses) {
      lines.push(`| \`${s.path}\` | ${s.status} | ${s.reason} |`);
    }
  }
  lines.push("");

  // Observed repo index
  lines.push("## Observed Repo Index");
  lines.push("");

  // Path buckets
  lines.push("### Path Buckets");
  for (const bucket of obs.observations.path_buckets) {
    lines.push(`- **${bucket.bucket}** (${bucket.count} files)`);
  }
  lines.push("");

  // Import edges summary
  if (obs.observations.import_edges.length > 0) {
    lines.push("### Import Edges");
    lines.push(`Total: ${obs.observations.import_edges.length}`);
    const byKind = new Map<string, number>();
    for (const e of obs.observations.import_edges) {
      byKind.set(e.import_kind, (byKind.get(e.import_kind) ?? 0) + 1);
    }
    for (const [kind, count] of byKind) {
      lines.push(`- ${kind}: ${count}`);
    }
    lines.push("");
  }

  // Test mappings
  if (obs.observations.test_mappings.length > 0) {
    lines.push("### Test Mappings");
    for (const m of obs.observations.test_mappings) {
      lines.push(`- \`${m.source_path}\` → \`${m.test_path}\` (${m.mapping_kind}, ${m.confidence})`);
    }
    lines.push("");
  }

  // Sensitive paths
  if (obs.observations.sensitive_paths.length > 0) {
    lines.push("### Sensitive Paths");
    for (const s of obs.observations.sensitive_paths) {
      lines.push(`- \`${s.path}\` — ${s.reason}`);
    }
    lines.push("");
  }

  // Owner hints
  if (obs.observations.owner_hints.length > 0) {
    lines.push("### Owner Hints");
    for (const o of obs.observations.owner_hints) {
      lines.push(`- \`${o.path_pattern}\` → ${o.owners.join(", ")} (${o.match_status})`);
    }
    lines.push("");
  }

  // Unknowns
  lines.push("### Unknowns");
  const unknownSections = [
    { label: "Skipped large files", items: obs.unknowns.skipped_large_files },
    { label: "Unsupported files", items: obs.unknowns.unsupported_files },
    { label: "Dynamic imports", items: obs.unknowns.dynamic_imports },
    { label: "Unresolved imports", items: obs.unknowns.unresolved_imports },
    { label: "Unmapped sources", items: obs.unknowns.unmapped_sources },
    { label: "Unmapped tests", items: obs.unknowns.unmapped_tests },
    { label: "Ambiguous test mappings", items: obs.unknowns.ambiguous_test_mappings },
    { label: "Owner patterns unresolved", items: obs.unknowns.owner_patterns_unresolved },
  ];
  let hasUnknowns = false;
  for (const { label, items } of unknownSections) {
    if (items.length > 0) {
      hasUnknowns = true;
      lines.push(`- **${label}:** ${items.join(", ")}`);
    }
  }
  if (!hasUnknowns) {
    lines.push("_No unknowns._");
  }
  lines.push("");

  // Observation Quality
  lines.push("### Observation Quality");
  lines.push("");
  const q = obs.quality;
  lines.push(`- **Raw unknown ratio:** ${(q.raw_unknown_ratio * 100).toFixed(1)}%`);
  lines.push(`- **Out-of-scope (unsupported languages):** ${q.out_of_scope_count} (${(q.out_of_scope_ratio * 100).toFixed(1)}%)`);
  lines.push(`- **Actionable (user can fix):** ${q.actionable_count} (${(q.actionable_ratio * 100).toFixed(1)}%)`);
  lines.push(`- **Intrinsic (scanner limitation):** ${q.intrinsic_count} (${(q.intrinsic_ratio * 100).toFixed(1)}%)`);
  lines.push(`- **Unknown bucket files:** ${q.unknown_bucket_file_count}`);
  lines.push(`- **Undeclared packages:** ${q.undeclared_package_count}`);
  lines.push("");

  // Operator Recommendations
  const recs = generateObservationRecommendations({ quality: q });
  if (recs.length > 0) {
    lines.push("### Operator Recommendations");
    lines.push("");
    for (let i = 0; i < recs.length; i++) {
      lines.push(`${i + 1}. ${recs[i]}`);
    }
    lines.push("");
  }

  // Notice
  lines.push("---");
  lines.push("");
  lines.push("> **Notice:** This report is derived from deterministic repo observations.");
  lines.push("> It is not canonical architecture truth.");
  lines.push("> The ChangeContract Lite is based on user-provided changed files.");
  lines.push("");

  return lines.join("\n");
}
