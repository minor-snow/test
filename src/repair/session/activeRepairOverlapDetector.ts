import type { RepairContract } from "../types.js";
import type { ConcurrentRepairFinding } from "./repairSessionTypes.js";
import { matchesPattern, uniqueSorted } from "../repairUtils.js";

export function detectActiveScopePatternOverlaps(input: {
  contract: RepairContract;
  otherContracts: readonly RepairContract[];
}): readonly ConcurrentRepairFinding[] {
  const findings: ConcurrentRepairFinding[] = [];

  for (const other of input.otherContracts) {
    const overlap = findPatternOverlap(input.contract, other);
    if (!overlap) continue;
    findings.push(overlap);
  }

  return findings;
}

export function detectActualChangedFileOverlaps(input: {
  repairId: string;
  changedFiles: readonly string[];
  otherContracts: readonly RepairContract[];
}): readonly ConcurrentRepairFinding[] {
  const findings: ConcurrentRepairFinding[] = [];

  for (const other of input.otherContracts) {
    const matched: string[] = [];
    let bucket: "allowed" | "review_required" | "forbidden" | undefined;

    for (const file of input.changedFiles) {
      const forbidden = other.repair_scope.forbidden.find(entry => matchesPattern(file, entry.pattern));
      if (forbidden) {
        matched.push(file);
        bucket = "forbidden";
        continue;
      }

      const review = other.repair_scope.review_required.find(entry => matchesPattern(file, entry.pattern));
      if (review) {
        matched.push(file);
        bucket = bucket === "forbidden" ? bucket : "review_required";
        continue;
      }

      const allowed = other.repair_scope.allowed.find(entry => matchesPattern(file, entry.pattern));
      if (allowed) {
        matched.push(file);
        bucket = bucket ?? "allowed";
      }
    }

    if (!bucket || matched.length === 0) continue;
    findings.push(buildActualOverlapFinding(input.repairId, other.repair_id, bucket, matched));
  }

  return findings;
}

function findPatternOverlap(
  contract: RepairContract,
  other: RepairContract,
): ConcurrentRepairFinding | null {
  const currentEntries = [
    ...contract.repair_scope.allowed.map(entry => ({ bucket: "allowed" as const, pattern: entry.pattern })),
    ...contract.repair_scope.review_required.map(entry => ({ bucket: "review_required" as const, pattern: entry.pattern })),
    ...contract.repair_scope.forbidden.map(entry => ({ bucket: "forbidden" as const, pattern: entry.pattern })),
  ];
  const otherEntries = [
    ...other.repair_scope.allowed.map(entry => ({ bucket: "allowed" as const, pattern: entry.pattern })),
    ...other.repair_scope.review_required.map(entry => ({ bucket: "review_required" as const, pattern: entry.pattern })),
    ...other.repair_scope.forbidden.map(entry => ({ bucket: "forbidden" as const, pattern: entry.pattern })),
  ];

  const overlappingPatterns: string[] = [];
  let strongestBucket: "allowed" | "review_required" | "forbidden" = "allowed";

  for (const current of currentEntries) {
    for (const candidate of otherEntries) {
      if (patternsOverlap(current.pattern, candidate.pattern)) {
        overlappingPatterns.push(current.pattern, candidate.pattern);
        strongestBucket = strongerBucket(strongestBucket, strongerBucket(current.bucket, candidate.bucket));
      }
    }
  }

  if (overlappingPatterns.length === 0) {
    return null;
  }

  return buildPatternOverlapFinding(contract.repair_id, other.repair_id, strongestBucket, uniqueSorted(overlappingPatterns));
}

function buildPatternOverlapFinding(
  repairId: string,
  otherRepairId: string,
  bucket: "allowed" | "review_required" | "forbidden",
  patterns: readonly string[],
): ConcurrentRepairFinding {
  if (bucket === "forbidden") {
    return {
      kind: "active_scope_pattern_overlap",
      severity: "blocking",
      repair_id: repairId,
      other_repair_id: otherRepairId,
      overlap: { bucket, patterns },
      reason: `This repair overlaps a forbidden scope in active repair ${otherRepairId}.`,
      recommended_action: "request_replan",
    };
  }
  if (bucket === "review_required") {
    return {
      kind: "active_scope_pattern_overlap",
      severity: "requires_human_audit",
      repair_id: repairId,
      other_repair_id: otherRepairId,
      overlap: { bucket, patterns },
      reason: `This repair overlaps a review-required scope in active repair ${otherRepairId}.`,
      recommended_action: "human_review",
    };
  }
  return {
    kind: "active_scope_pattern_overlap",
    severity: "warning",
    repair_id: repairId,
    other_repair_id: otherRepairId,
    overlap: { bucket, patterns },
    reason: `This repair overlaps an allowed scope in active repair ${otherRepairId}.`,
    recommended_action: "continue",
  };
}

function buildActualOverlapFinding(
  repairId: string,
  otherRepairId: string,
  bucket: "allowed" | "review_required" | "forbidden",
  files: readonly string[],
): ConcurrentRepairFinding {
  if (bucket === "forbidden") {
    return {
      kind: "actual_changed_file_overlap",
      severity: "blocking",
      repair_id: repairId,
      other_repair_id: otherRepairId,
      overlap: { bucket, files },
      reason: `Changed files overlap a forbidden scope in active repair ${otherRepairId}.`,
      recommended_action: "request_replan",
    };
  }
  if (bucket === "review_required") {
    return {
      kind: "actual_changed_file_overlap",
      severity: "requires_human_audit",
      repair_id: repairId,
      other_repair_id: otherRepairId,
      overlap: { bucket, files },
      reason: `Changed files overlap a review-required scope in active repair ${otherRepairId}.`,
      recommended_action: "human_review",
    };
  }
  return {
    kind: "actual_changed_file_overlap",
    severity: "warning",
    repair_id: repairId,
    other_repair_id: otherRepairId,
    overlap: { bucket, files },
    reason: `Changed files overlap an allowed scope in active repair ${otherRepairId}.`,
    recommended_action: "continue",
  };
}

function patternsOverlap(left: string, right: string): boolean {
  return matchesPattern(left, right) || matchesPattern(right, left) || left === right;
}

function strongerBucket(
  left: "allowed" | "review_required" | "forbidden",
  right: "allowed" | "review_required" | "forbidden",
): "allowed" | "review_required" | "forbidden" {
  const rank = { allowed: 0, review_required: 1, forbidden: 2 } as const;
  return rank[left] >= rank[right] ? left : right;
}
