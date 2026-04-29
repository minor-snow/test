/**
 * P25b.1: Saleor Observation Report Renderer
 *
 * Repo-wide reporting on top of the Python observation sidecar.
 * This is distinct from the scope-aware pythonGovernanceRenderer:
 * it answers whether Saleor is governance-ready at repo scale.
 */

import type {
  PythonObservationSidecar,
  PythonObservedFile,
  PythonObservationUnknown,
  PythonSensitiveZone,
  PythonTestMapping,
} from "./types.js";

export type P25aObservationSummary = {
  readonly repo_label?: string;
  readonly observed_files?: number;
  readonly python_files?: number;
  readonly scan_ms?: number;
  readonly enhance_ms?: number;
};

export type SaleorObservationDomainSignal = {
  readonly domain: string;
  readonly path_pattern: string;
  readonly risk: string;
  readonly severity: "medium" | "high" | "critical";
  readonly governance_recommendation:
    | "protected"
    | "review_required"
    | "explicit_scope_candidate";
  readonly matched_file_count: number;
  readonly source_file_count: number;
  readonly test_file_count: number;
  readonly project_import_count: number;
};

export type SaleorObservationReportSummary = {
  readonly schema_version: "saleor_observation_report.v2";
  readonly subject_name: string;
  readonly repo_label: string;
  readonly generated_at: string;
  readonly repo_scale: {
    readonly observed_files: number;
    readonly python_files: number;
    readonly scan_ms: number | null;
    readonly enhance_ms: number | null;
    readonly bucket_distribution: ReadonlyArray<{
      readonly bucket: string;
      readonly count: number;
    }>;
  };
  readonly historical_baseline: {
    readonly generic_smoke_scan: {
      readonly observed_files: number;
      readonly scan_ms: number;
      readonly unknown_bucket_files: number;
      readonly import_edges: number;
      readonly test_mappings: number;
      readonly sensitive_paths: number;
    };
    readonly note: string;
  };
  readonly python_observation_summary: {
    readonly import_observation_count: number;
    readonly project_import_count: number;
    readonly declared_package_count: number;
    readonly undeclared_package_count: number;
    readonly dynamic_import_count: number;
    readonly manifest_count: number;
    readonly low_confidence_manifest_count: number;
  };
  readonly sensitive_zone_map: ReadonlyArray<{
    readonly category: string;
    readonly severity: string;
    readonly matched_file_count: number;
    readonly source: string;
    readonly path_pattern: string;
  }>;
  readonly high_risk_domains: ReadonlyArray<SaleorObservationDomainSignal>;
  readonly test_mapping_summary: {
    readonly total: number;
    readonly high_confidence: number;
    readonly medium_confidence: number;
    readonly low_confidence: number;
    readonly unknown: number;
    readonly mapped_source_ratio: number;
  };
  readonly unknown_taxonomy: {
    readonly total_unknowns: number;
    readonly classification_counts: ReadonlyArray<{
      readonly classification: string;
      readonly count: number;
    }>;
    readonly categories: ReadonlyArray<{
      readonly category: string;
      readonly classification: string;
      readonly count: number;
      readonly note: string;
    }>;
  };
  readonly suggested_protected_zones: readonly string[];
  readonly suggested_review_required_zones: readonly string[];
  readonly boundary_readiness: {
    readonly explicit_scope:
      | "ready_for_explicit_scope"
      | "requires_manual_scope"
      | "not_ready_for_auto_scope";
    readonly auto_scope: "not_ready_for_auto_scope";
    readonly reasons: readonly string[];
  };
  readonly recommended_trial_scenario: {
    readonly intent: string;
    readonly allowed: readonly string[];
    readonly review_required: readonly string[];
    readonly forbidden: readonly string[];
    readonly rationale: string;
  };
  readonly limitations: readonly string[];
};

type DomainSpec = {
  readonly domain: string;
  readonly path_pattern: string;
  readonly prefix: string;
  readonly risk: string;
  readonly severity: "medium" | "high" | "critical";
  readonly governance_recommendation:
    | "protected"
    | "review_required"
    | "explicit_scope_candidate";
};

const DOMAIN_SPECS: readonly DomainSpec[] = [
  {
    domain: "checkout",
    path_pattern: "saleor/checkout/**",
    prefix: "saleor/checkout/",
    risk: "purchase flow / pricing behavior",
    severity: "high",
    governance_recommendation: "explicit_scope_candidate",
  },
  {
    domain: "payment",
    path_pattern: "saleor/payment/**",
    prefix: "saleor/payment/",
    risk: "financial transactions",
    severity: "critical",
    governance_recommendation: "protected",
  },
  {
    domain: "order",
    path_pattern: "saleor/order/**",
    prefix: "saleor/order/",
    risk: "order lifecycle",
    severity: "high",
    governance_recommendation: "review_required",
  },
  {
    domain: "account",
    path_pattern: "saleor/account/**",
    prefix: "saleor/account/",
    risk: "identity / user state",
    severity: "high",
    governance_recommendation: "protected",
  },
  {
    domain: "discount",
    path_pattern: "saleor/discount/**",
    prefix: "saleor/discount/",
    risk: "pricing adjustment",
    severity: "medium",
    governance_recommendation: "review_required",
  },
  {
    domain: "tax",
    path_pattern: "saleor/tax/**",
    prefix: "saleor/tax/",
    risk: "regulatory / financial calculation",
    severity: "medium",
    governance_recommendation: "review_required",
  },
  {
    domain: "plugins",
    path_pattern: "saleor/plugins/**",
    prefix: "saleor/plugins/",
    risk: "runtime extension behavior",
    severity: "medium",
    governance_recommendation: "protected",
  },
  {
    domain: "graphql",
    path_pattern: "saleor/graphql/**",
    prefix: "saleor/graphql/",
    risk: "public API surface",
    severity: "high",
    governance_recommendation: "review_required",
  },
  {
    domain: "core",
    path_pattern: "saleor/core/**",
    prefix: "saleor/core/",
    risk: "shared infrastructure",
    severity: "high",
    governance_recommendation: "review_required",
  },
];

const HISTORICAL_BASELINE = {
  observed_files: 4573,
  scan_ms: 317,
  unknown_bucket_files: 4457,
  import_edges: 0,
  test_mappings: 0,
  sensitive_paths: 0,
} as const;

const RECOMMENDED_TRIAL_SCENARIO = {
  intent: "Add an eco-packaging fee during checkout for selected product types.",
  allowed: [
    "saleor/checkout/**",
    "saleor/graphql/checkout/**",
  ],
  review_required: [
    "saleor/order/**",
    "saleor/tax/**",
    "tests/integration/**",
  ],
  forbidden: [
    "saleor/payment/**",
    "saleor/account/**",
    "saleor/discount/**",
    "saleor/plugins/**",
    "migrations/**",
    "saleor/core/settings.py",
    ".pantheon/**",
    ".cursor/**",
    ".git/**",
  ],
  rationale:
    "This trial exercises checkout logic while keeping financial, identity, plugin, and migration surfaces protected.",
} as const;

export function buildSaleorObservationReportSummary(input: {
  sidecar: PythonObservationSidecar;
  observationSummary?: P25aObservationSummary;
  subjectName?: string;
  generatedAt?: string;
}): SaleorObservationReportSummary {
  const subjectName = input.subjectName ?? "Saleor";
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const bucketDistribution = countBuckets(input.sidecar.files);
  const domainSignals = buildDomainSignals(input.sidecar);
  const protectedZones = collectSuggestedProtectedZones(input.sidecar.files);
  const reviewRequiredZones = collectSuggestedReviewRequiredZones(input.sidecar.files);
  const mappedSourceRatio = computeMappedSourceRatio(input.sidecar.files, input.sidecar.test_mappings);
  const unknownTaxonomy = summarizeUnknownTaxonomy(input.sidecar.unknowns);
  const boundaryReadiness = computeBoundaryReadiness(input.sidecar, domainSignals);

  return {
    schema_version: "saleor_observation_report.v2",
    subject_name: subjectName,
    repo_label: input.observationSummary?.repo_label ?? input.sidecar.repo.root_label,
    generated_at: generatedAt,
    repo_scale: {
      observed_files: input.observationSummary?.observed_files ?? input.sidecar.repo.observed_file_count,
      python_files: input.observationSummary?.python_files ?? input.sidecar.repo.python_file_count,
      scan_ms: input.observationSummary?.scan_ms ?? null,
      enhance_ms: input.observationSummary?.enhance_ms ?? null,
      bucket_distribution: bucketDistribution,
    },
    historical_baseline: {
      generic_smoke_scan: HISTORICAL_BASELINE,
      note:
        "Baseline numbers are from the first generic Saleor smoke scan before the Python sidecar existed.",
    },
    python_observation_summary: {
      import_observation_count: input.sidecar.quality.import_observation_count,
      project_import_count: input.sidecar.quality.project_import_count,
      declared_package_count: input.sidecar.quality.declared_package_count,
      undeclared_package_count: input.sidecar.quality.undeclared_package_count,
      dynamic_import_count: input.sidecar.quality.dynamic_import_count,
      manifest_count: input.sidecar.quality.manifest_count,
      low_confidence_manifest_count: input.sidecar.quality.low_confidence_manifest_count,
    },
    sensitive_zone_map: input.sidecar.sensitive_zones
      .map(zone => ({
        category: zone.category,
        severity: zone.severity,
        matched_file_count: zone.matched_paths.length,
        source: zone.source,
        path_pattern: zone.path_pattern,
      }))
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.matched_file_count - a.matched_file_count),
    high_risk_domains: domainSignals,
    test_mapping_summary: {
      total: input.sidecar.test_mappings.length,
      high_confidence: input.sidecar.test_mappings.filter(m => m.confidence === "high").length,
      medium_confidence: input.sidecar.test_mappings.filter(m => m.confidence === "medium").length,
      low_confidence: input.sidecar.test_mappings.filter(m => m.confidence === "low").length,
      unknown: input.sidecar.test_mappings.filter(m => m.confidence === "unknown").length,
      mapped_source_ratio: mappedSourceRatio,
    },
    unknown_taxonomy: unknownTaxonomy,
    suggested_protected_zones: protectedZones,
    suggested_review_required_zones: reviewRequiredZones,
    boundary_readiness: boundaryReadiness,
    recommended_trial_scenario: RECOMMENDED_TRIAL_SCENARIO,
    limitations: input.sidecar.limitations,
  };
}

export function renderSaleorObservationReportMarkdown(
  summary: SaleorObservationReportSummary,
): string {
  const lines: string[] = [];

  lines.push(`# ${summary.subject_name} Observation Report v2`);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(
    `${summary.subject_name} is **${formatReadiness(summary.boundary_readiness.explicit_scope)}** and **not ready for automatic intent-to-scope inference**.`,
  );
  lines.push("");
  lines.push("- Pantheon can already govern Saleor changes when a human or team provides an authorized directory/file scope.");
  lines.push("- Pantheon does not claim full Python runtime understanding; observations remain syntax-level and file/path-level.");
  lines.push("- This report is repo-wide evidence for boundary proposals, synthetic PR checks, and future agent trials.");
  lines.push("");

  lines.push("## Repo Scale");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Repo label | ${summary.repo_label} |`);
  lines.push(`| Observed files | ${summary.repo_scale.observed_files} |`);
  lines.push(`| Python files | ${summary.repo_scale.python_files} |`);
  lines.push(`| Scan time | ${formatMs(summary.repo_scale.scan_ms)} |`);
  lines.push(`| Python enhancement time | ${formatMs(summary.repo_scale.enhance_ms)} |`);
  lines.push("");
  lines.push("| Python bucket | Count |");
  lines.push("|---|---|");
  for (const bucket of summary.repo_scale.bucket_distribution) {
    lines.push(`| ${bucket.bucket} | ${bucket.count} |`);
  }
  lines.push("");

  lines.push("## Python Observation Summary");
  lines.push("");
  lines.push("| Signal | Baseline Smoke Scan | Current Sidecar |");
  lines.push("|---|---|---|");
  lines.push(`| Observed files | ${summary.historical_baseline.generic_smoke_scan.observed_files} | ${summary.repo_scale.observed_files} |`);
  lines.push(`| Import observations | ${summary.historical_baseline.generic_smoke_scan.import_edges} | ${summary.python_observation_summary.import_observation_count} |`);
  lines.push(`| Test mappings | ${summary.historical_baseline.generic_smoke_scan.test_mappings} | ${summary.test_mapping_summary.total} |`);
  lines.push(`| Sensitive paths / zones | ${summary.historical_baseline.generic_smoke_scan.sensitive_paths} | ${summary.sensitive_zone_map.length} |`);
  lines.push(`| Unknown bucket files | ${summary.historical_baseline.generic_smoke_scan.unknown_bucket_files} | ${summary.unknown_taxonomy.total_unknowns}* |`);
  lines.push("");
  lines.push(`* Current unknown count is the Python sidecar taxonomy, not the raw generic scanner bucket count. ${summary.historical_baseline.note}`);
  lines.push("");

  lines.push("## Sensitive Zone Map");
  lines.push("");
  lines.push("| Category | Severity | Files | Source | Pattern |");
  lines.push("|---|---|---|---|---|");
  for (const zone of summary.sensitive_zone_map) {
    lines.push(`| ${zone.category} | ${zone.severity} | ${zone.matched_file_count} | ${zone.source} | \`${zone.path_pattern}\` |`);
  }
  lines.push("");

  lines.push("## High-Risk Saleor Domains");
  lines.push("");
  lines.push("| Domain | Pattern | Risk | Files | Source | Tests | Project Imports | Governance Recommendation |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const domain of summary.high_risk_domains) {
    lines.push(
      `| ${domain.domain} | \`${domain.path_pattern}\` | ${domain.risk} | ${domain.matched_file_count} | ${domain.source_file_count} | ${domain.test_file_count} | ${domain.project_import_count} | ${formatGovernanceRecommendation(domain.governance_recommendation)} |`,
    );
  }
  lines.push("");

  lines.push("## Test Mapping Coverage");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Total mappings | ${summary.test_mapping_summary.total} |`);
  lines.push(`| High-confidence mappings | ${summary.test_mapping_summary.high_confidence} |`);
  lines.push(`| Medium-confidence mappings | ${summary.test_mapping_summary.medium_confidence} |`);
  lines.push(`| Low-confidence mappings | ${summary.test_mapping_summary.low_confidence} |`);
  lines.push(`| Unknown mappings | ${summary.test_mapping_summary.unknown} |`);
  lines.push(`| Mapped source ratio | ${formatPercent(summary.test_mapping_summary.mapped_source_ratio)} |`);
  lines.push("");

  lines.push("## Dependency / Import Observation Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Import observations | ${summary.python_observation_summary.import_observation_count} |`);
  lines.push(`| Project imports | ${summary.python_observation_summary.project_import_count} |`);
  lines.push(`| Declared packages | ${summary.python_observation_summary.declared_package_count} |`);
  lines.push(`| Undeclared packages | ${summary.python_observation_summary.undeclared_package_count} |`);
  lines.push(`| Dynamic/unresolved imports | ${summary.python_observation_summary.dynamic_import_count} |`);
  lines.push(`| Dependency manifests | ${summary.python_observation_summary.manifest_count} |`);
  lines.push(`| Low-confidence manifests | ${summary.python_observation_summary.low_confidence_manifest_count} |`);
  lines.push("");

  lines.push("## Unknown Taxonomy");
  lines.push("");
  lines.push("| Classification | Count |");
  lines.push("|---|---|");
  for (const entry of summary.unknown_taxonomy.classification_counts) {
    lines.push(`| ${entry.classification} | ${entry.count} |`);
  }
  lines.push("");
  if (summary.unknown_taxonomy.categories.length > 0) {
    lines.push("| Category | Classification | Count | Note |");
    lines.push("|---|---|---|---|");
    for (const category of summary.unknown_taxonomy.categories) {
      lines.push(`| ${category.category} | ${category.classification} | ${category.count} | ${category.note} |`);
    }
    lines.push("");
  }

  lines.push("## Suggested Protected Zones");
  lines.push("");
  for (const zone of summary.suggested_protected_zones) {
    lines.push(`- \`${zone}\``);
  }
  lines.push("");

  lines.push("## Suggested Review-Required Zones");
  lines.push("");
  for (const zone of summary.suggested_review_required_zones) {
    lines.push(`- \`${zone}\``);
  }
  lines.push("");

  lines.push("## Boundary Readiness");
  lines.push("");
  lines.push(`- **Explicit-scope governance:** \`${summary.boundary_readiness.explicit_scope}\``);
  lines.push(`- **Automatic intent-to-scope inference:** \`${summary.boundary_readiness.auto_scope}\``);
  lines.push("");
  for (const reason of summary.boundary_readiness.reasons) {
    lines.push(`- ${reason}`);
  }
  lines.push("");
  lines.push("Scope granularity in P25 is file/path-level. Function-level and semantic delta constraints are future work.");
  lines.push("");

  lines.push("## Recommended Trial Scenario");
  lines.push("");
  lines.push(`**Intent:** ${summary.recommended_trial_scenario.intent}`);
  lines.push("");
  lines.push("Allowed candidate scope:");
  for (const path of summary.recommended_trial_scenario.allowed) {
    lines.push(`- \`${path}\``);
  }
  lines.push("");
  lines.push("Review-required candidate scope:");
  for (const path of summary.recommended_trial_scenario.review_required) {
    lines.push(`- \`${path}\``);
  }
  lines.push("");
  lines.push("Forbidden / protected candidate scope:");
  for (const path of summary.recommended_trial_scenario.forbidden) {
    lines.push(`- \`${path}\``);
  }
  lines.push("");
  lines.push(summary.recommended_trial_scenario.rationale);
  lines.push("");

  lines.push("## Limitations");
  lines.push("");
  for (const limitation of summary.limitations) {
    lines.push(`- ${limitation}`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("_This report is derived from conservative Python observations. It is evidence for explicit-scope governance, not full Python runtime understanding._");

  return lines.join("\n");
}

function countBuckets(files: readonly PythonObservedFile[]): Array<{ bucket: string; count: number }> {
  const counts = new Map<string, number>();
  for (const file of files) {
    counts.set(file.bucket, (counts.get(file.bucket) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, count]) => ({ bucket, count }));
}

function buildDomainSignals(sidecar: PythonObservationSidecar): SaleorObservationDomainSignal[] {
  return DOMAIN_SPECS.map(spec => {
    const matchedFiles = sidecar.files.filter(file => file.path.startsWith(spec.prefix));
    const sourceCount = matchedFiles.filter(file => file.bucket === "source").length;
    const testCount = matchedFiles.filter(file => file.bucket === "test").length;
    const projectImportCount = sidecar.import_observations.filter(
      obs => obs.status === "project_import" && containsDomainSpecifier(obs.raw_specifier, spec.domain),
    ).length;

    return {
      domain: spec.domain,
      path_pattern: spec.path_pattern,
      risk: spec.risk,
      severity: spec.severity,
      governance_recommendation: spec.governance_recommendation,
      matched_file_count: matchedFiles.length,
      source_file_count: sourceCount,
      test_file_count: testCount,
      project_import_count: projectImportCount,
    };
  });
}

function collectSuggestedProtectedZones(files: readonly PythonObservedFile[]): string[] {
  const zones = [
    "saleor/payment/**",
    "saleor/account/**",
    "saleor/plugins/**",
    "saleor/core/settings.py",
    "migrations/**",
  ];
  return zones.filter(zone => zoneExists(zone, files));
}

function collectSuggestedReviewRequiredZones(files: readonly PythonObservedFile[]): string[] {
  const zones = [
    "saleor/order/**",
    "saleor/tax/**",
    "saleor/discount/**",
    "saleor/graphql/**",
    "saleor/core/**",
  ];
  return zones.filter(zone => zoneExists(zone, files));
}

function computeMappedSourceRatio(
  files: readonly PythonObservedFile[],
  testMappings: readonly PythonTestMapping[],
): number {
  const sourceCount = files.filter(file => file.bucket === "source").length;
  if (sourceCount === 0) return 0;
  const mappedCount = testMappings.filter(mapping => mapping.existing_test_paths.length > 0).length;
  return mappedCount / sourceCount;
}

function summarizeUnknownTaxonomy(unknowns: readonly PythonObservationUnknown[]) {
  const classificationCountsMap = new Map<string, number>();
  let total = 0;

  for (const unknown of unknowns) {
    classificationCountsMap.set(
      unknown.classification,
      (classificationCountsMap.get(unknown.classification) ?? 0) + unknown.count,
    );
    total += unknown.count;
  }

  return {
    total_unknowns: total,
    classification_counts: [...classificationCountsMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([classification, count]) => ({ classification, count })),
    categories: unknowns
      .filter(unknown => unknown.count > 0)
      .map(unknown => ({
        category: unknown.category,
        classification: unknown.classification,
        count: unknown.count,
        note: unknown.note,
      }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
  };
}

function computeBoundaryReadiness(
  sidecar: PythonObservationSidecar,
  domains: readonly SaleorObservationDomainSignal[],
): SaleorObservationReportSummary["boundary_readiness"] {
  const requiredDomains = ["checkout", "payment", "order", "account", "graphql", "discount", "tax", "plugins"];
  const coveredRequiredDomains = domains.filter(
    domain => requiredDomains.includes(domain.domain) && domain.matched_file_count > 0,
  ).length;

  const reasons = [
    `Observed ${coveredRequiredDomains}/${requiredDomains.length} key Saleor domains with file/path-level signals.`,
    `Project import observations are present (${sidecar.quality.project_import_count}), which is enough for conservative cross-module awareness.`,
    `Test mapping candidates are present (${sidecar.quality.test_mapping_count}), so scoped changes can be paired with verification guidance.`,
    "Automatic intent-to-scope inference remains out of scope because import observations are syntax-level only and scope granularity is file/path-level.",
  ];

  const explicitScope =
    coveredRequiredDomains >= 6 &&
    sidecar.quality.project_import_count >= 10 &&
    sidecar.quality.test_mapping_count >= 5 &&
    sidecar.sensitive_zones.length >= 5
      ? "ready_for_explicit_scope"
      : "requires_manual_scope";

  return {
    explicit_scope: explicitScope,
    auto_scope: "not_ready_for_auto_scope",
    reasons,
  };
}

function containsDomainSpecifier(rawSpecifier: string, domain: string): boolean {
  const normalized = rawSpecifier.replace(/^from\s+/, "").replace(/\s+import.+$/, "");
  return normalized.includes(`saleor.${domain}`);
}

function zoneExists(zone: string, files: readonly PythonObservedFile[]): boolean {
  if (zone === "saleor/core/settings.py") {
    return files.some(file => file.path === "saleor/core/settings.py");
  }
  if (zone === "migrations/**") {
    return files.some(file => file.path.includes("/migrations/"));
  }
  const prefix = zone.replace("/**", "/");
  return files.some(file => file.path.startsWith(prefix));
}

function severityRank(severity: string): number {
  switch (severity) {
    case "critical":
      return 3;
    case "high":
      return 2;
    case "medium":
      return 1;
    default:
      return 0;
  }
}

function formatGovernanceRecommendation(
  recommendation: SaleorObservationDomainSignal["governance_recommendation"],
): string {
  switch (recommendation) {
    case "protected":
      return "protected";
    case "review_required":
      return "review required";
    case "explicit_scope_candidate":
      return "explicit-scope candidate";
    default:
      return recommendation;
  }
}

function formatReadiness(
  readiness: SaleorObservationReportSummary["boundary_readiness"]["explicit_scope"],
): string {
  switch (readiness) {
    case "ready_for_explicit_scope":
      return "ready for explicit-scope governance";
    case "requires_manual_scope":
      return "still dependent on manual scope curation";
    case "not_ready_for_auto_scope":
      return "not ready for automatic scope";
    default:
      return readiness;
  }
}

function formatMs(value: number | null): string {
  return value === null ? "n/a" : `${value}ms`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
