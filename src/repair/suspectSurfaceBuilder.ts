import type { RepoObservations } from "../repoObservation/types.js";
import type { BugFinding, RepairSourceReport, RepairSuspectSurface, RepairSurfaceFile } from "./types.js";
import { uniqueSorted } from "./repairUtils.js";

export function buildSuspectSurface(input: {
  report: RepairSourceReport;
  finding: BugFinding;
  observations: RepoObservations;
}): RepairSuspectSurface {
  const fileSet = new Set(input.observations.observations.files.map(file => file.path));
  const byPath = new Map<string, RepairSurfaceFile>();

  for (const suspect of input.report.suspected_files) {
    if (!fileSet.has(suspect.path)) continue;
    byPath.set(suspect.path, {
      path: suspect.path,
      confidence: suspect.confidence,
      reason: suspect.reason,
      evidence: ["explicit_suspect_file"],
    });
  }

  for (const evidence of input.report.evidence) {
    if (!evidence.path || !fileSet.has(evidence.path)) continue;

    if (evidence.kind === "code_observation" || evidence.kind === "user_reference") {
      upsertSurface(byPath, {
        path: evidence.path,
        confidence: "medium",
        reason: evidence.summary ?? "Explicit file reference in bug report evidence.",
        evidence: [evidence.kind],
      });
    }

    if (evidence.kind === "failing_test") {
      const mappedSources = input.observations.observations.test_mappings
        .filter(mapping => mapping.test_path === evidence.path)
        .map(mapping => mapping.source_path);

      for (const sourcePath of uniqueSorted(mappedSources)) {
        upsertSurface(byPath, {
          path: sourcePath,
          confidence: "medium",
          reason: `Mapped from failing test ${evidence.path}.`,
          evidence: ["test_mapping"],
        });
      }
    }
  }

  if (byPath.size === 0) {
    for (const fact of input.finding.confirmed_facts) {
      const match = fact.match(/^(.+?) exists$/);
      if (!match) continue;
      const path = match[1];
      if (!fileSet.has(path)) continue;
      upsertSurface(byPath, {
        path,
        confidence: "low",
        reason: "Confirmed path reference included in bug report.",
        evidence: ["confirmed_path_reference"],
      });
    }
  }

  return {
    files: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)),
    reason: "Derived from explicit suspect files, confirmed path references, and failing-test mappings.",
  };
}

function upsertSurface(target: Map<string, RepairSurfaceFile>, item: RepairSurfaceFile): void {
  const existing = target.get(item.path);
  if (!existing) {
    target.set(item.path, item);
    return;
  }

  const confidenceOrder = { high: 3, medium: 2, low: 1 } as const;
  const confidence = confidenceOrder[item.confidence] > confidenceOrder[existing.confidence]
    ? item.confidence
    : existing.confidence;
  const reason = existing.reason === item.reason ? existing.reason : `${existing.reason}; ${item.reason}`;
  const evidence = [...new Set([...existing.evidence, ...item.evidence])];

  target.set(item.path, {
    path: item.path,
    confidence,
    reason,
    evidence,
  });
}
