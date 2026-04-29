import type { RepoObservations, SensitiveReason } from "../repoObservation/types.js";
import type { PythonObservationSidecar } from "../repoObservation/python/types.js";
import type {
  BugFinding,
  RepairImpactSurface,
  RepairImpactUnknown,
  RepairRelationEdge,
  RepairRiskArea,
  RepairSourceReport,
  RepairSurfaceFile,
  RepairSuspectSurface,
} from "./types.js";
import { matchesPattern, uniqueSorted } from "./repairUtils.js";

export function buildImpactSurface(input: {
  report: RepairSourceReport;
  finding: BugFinding;
  suspectSurface: RepairSuspectSurface;
  relationGraph: readonly RepairRelationEdge[];
  observations: RepoObservations;
  pythonSidecar: PythonObservationSidecar | null;
}): RepairImpactSurface {
  const directFiles = [...input.suspectSurface.files];
  const directSet = new Set(directFiles.map(file => file.path));

  const relatedFiles = new Map<string, RepairSurfaceFile>();
  const relatedTests = new Map<string, RepairSurfaceFile>();
  const riskAreas: RepairRiskArea[] = [];
  const unknowns: RepairImpactUnknown[] = [];

  for (const edge of input.relationGraph) {
    if (edge.from === edge.to && edge.relation === "suspect") continue;
    if (edge.to.endsWith(".test.ts") || edge.to.includes("/test/") || edge.to.includes("/tests/")) {
      relatedTests.set(edge.to, {
        path: edge.to,
        confidence: edge.confidence,
        reason: edge.reason,
        evidence: edge.evidence,
      });
      continue;
    }
    if (!directSet.has(edge.to)) {
      relatedFiles.set(edge.to, {
        path: edge.to,
        confidence: edge.confidence,
        reason: edge.reason,
        evidence: edge.evidence,
      });
    }
  }

  for (const evidence of input.report.evidence) {
    if (evidence.kind === "failing_test" && evidence.path) {
      relatedTests.set(evidence.path, {
        path: evidence.path,
        confidence: "high",
        reason: "Explicit failing test supplied in bug report.",
        evidence: ["bug_report:failing_test"],
      });
    }
  }

  for (const direct of directFiles) {
    const repoMappings = input.observations.observations.test_mappings
      .filter(mapping => mapping.source_path === direct.path);
    for (const mapping of repoMappings) {
      relatedTests.set(mapping.test_path, {
        path: mapping.test_path,
        confidence: mapping.confidence === "high" ? "high" : "medium",
        reason: `Observed related test for ${direct.path}.`,
        evidence: mapping.evidence.map(item => `${item.type}:${item.value}`),
      });
    }
  }

  if (input.pythonSidecar) {
    for (const mapping of input.pythonSidecar.test_mappings) {
      if (!directSet.has(mapping.source_path)) continue;
      for (const testPath of mapping.existing_test_paths) {
        relatedTests.set(testPath, {
          path: testPath,
          confidence: mapping.confidence === "high" ? "high" : "medium",
          reason: `Python test mapping for ${mapping.source_path}.`,
          evidence: [`python_test_mapping:${mapping.confidence}`],
        });
      }
    }
  }

  for (const sensitivePath of input.observations.observations.sensitive_paths) {
    if (!matchesAnyImpactPath(sensitivePath.path, directFiles, relatedFiles)) continue;
    riskAreas.push({
      label: formatSensitiveReason(sensitivePath.reason),
      pattern: sensitivePath.path,
      bucket: sensitiveReasonToBucket(sensitivePath.reason),
      severity: sensitiveReasonToSeverity(sensitivePath.reason),
      source: "repo_sensitive_path",
      reason: `Observed sensitive path: ${sensitivePath.reason}.`,
      evidence: sensitivePath.evidence.map(item => `${item.type}:${item.value}`),
      matched_paths: [sensitivePath.path],
    });
  }

  if (input.pythonSidecar) {
    for (const zone of input.pythonSidecar.sensitive_zones) {
      const matchedPaths = zone.matched_paths.filter(path => matchesAnyImpactPath(path, directFiles, relatedFiles));
      if (matchedPaths.length === 0) continue;
      riskAreas.push({
        label: zone.category,
        pattern: zone.path_pattern,
        bucket: "review_required",
        severity: zone.severity,
        source: "python_sensitive_zone",
        reason: `Python sensitive zone ${zone.category}.`,
        evidence: zone.evidence,
        matched_paths: matchedPaths,
      });
    }

    for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_review) {
      const matchedPaths = uniqueSorted(
        input.observations.observations.files
          .map(file => file.path)
          .filter(path => matchesPattern(path, suggestion.pattern))
          .filter(path => matchesAnyImpactPath(path, directFiles, relatedFiles)),
      );
      if (matchedPaths.length === 0) continue;
      riskAreas.push({
        label: input.pythonSidecar.risk_preset_validation.preset,
        pattern: suggestion.pattern,
        bucket: "review_required",
        severity: suggestion.severity,
        source: "risk_preset",
        reason: suggestion.reason,
        evidence: suggestion.evidence,
        matched_paths: matchedPaths,
      });
    }

    for (const suggestion of input.pythonSidecar.risk_preset_validation.suggested_forbidden) {
      const matchedPaths = uniqueSorted(
        input.observations.observations.files
          .map(file => file.path)
          .filter(path => matchesPattern(path, suggestion.pattern))
          .filter(path => matchesAnyImpactPath(path, directFiles, relatedFiles)),
      );
      if (matchedPaths.length === 0) continue;
      riskAreas.push({
        label: input.pythonSidecar.risk_preset_validation.preset,
        pattern: suggestion.pattern,
        bucket: "forbidden",
        severity: suggestion.severity,
        source: "risk_preset",
        reason: suggestion.reason,
        evidence: suggestion.evidence,
        matched_paths: matchedPaths,
      });
    }
  }

  if (relatedTests.size === 0) {
    unknowns.push({
      kind: "missing_test_mapping",
      note: "No related tests could be mapped from the provided failing tests or suspect files.",
      evidence: ["repair:test_mapping_missing"],
    });
  }
  if (input.finding.invalid_references.length > 0) {
    unknowns.push({
      kind: "invalid_reference",
      note: "One or more references in the bug report could not be validated inside the repo.",
      evidence: input.finding.invalid_references,
    });
  }
  if (relatedFiles.size === 0) {
    unknowns.push({
      kind: "unknown_related_surface",
      note: "No additional related files were found beyond the direct suspect surface.",
      evidence: ["repair:no_related_files"],
    });
  }
  if (input.finding.unverified_claims.length > 0) {
    unknowns.push({
      kind: "unverified_bug_claim",
      note: "The report includes unverified bug claims or hypotheses that must not be treated as confirmed facts.",
      evidence: input.finding.unverified_claims,
    });
  }

  return {
    evidence_level: "bootstrap_conservative",
    direct_files: directFiles,
    related_files: [...relatedFiles.values()].sort((a, b) => a.path.localeCompare(b.path)),
    related_tests: [...relatedTests.values()].sort((a, b) => a.path.localeCompare(b.path)),
    risk_areas: dedupeRiskAreas(riskAreas),
    unknowns,
  };
}

function matchesAnyImpactPath(
  candidatePath: string,
  directFiles: readonly RepairSurfaceFile[],
  relatedFiles: ReadonlyMap<string, RepairSurfaceFile>,
): boolean {
  const relatedPaths = new Set([...directFiles.map(file => file.path), ...relatedFiles.keys()]);
  if (relatedPaths.has(candidatePath)) return true;
  for (const relatedPath of relatedPaths) {
    const prefix = toDirectoryPrefix(relatedPath);
    if (prefix && candidatePath.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

function dedupeRiskAreas(input: readonly RepairRiskArea[]): RepairRiskArea[] {
  const seen = new Map<string, RepairRiskArea>();
  for (const area of input) {
    const key = `${area.pattern}|${area.bucket}|${area.source}`;
    if (!seen.has(key)) seen.set(key, area);
  }
  return [...seen.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}

function toDirectoryPrefix(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function sensitiveReasonToSeverity(reason: SensitiveReason): "medium" | "high" | "critical" {
  switch (reason) {
    case "secret_keyword":
    case "migration_keyword":
      return "critical";
    case "payment_keyword":
    case "auth_keyword":
      return "high";
    default:
      return "medium";
  }
}

function sensitiveReasonToBucket(reason: SensitiveReason): "review_required" | "forbidden" {
  switch (reason) {
    case "secret_keyword":
    case "migration_keyword":
      return "forbidden";
    default:
      return "review_required";
  }
}

function formatSensitiveReason(reason: SensitiveReason): string {
  return reason.replace(/_/g, " ");
}
