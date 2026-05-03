import { matchesPattern, uniqueSorted } from "../repairUtils.js";
export function detectActiveScopePatternOverlaps(input) {
    const findings = [];
    for (const other of input.otherContracts) {
        const overlap = findPatternOverlap(input.contract, other);
        if (!overlap)
            continue;
        findings.push(overlap);
    }
    return findings;
}
export function detectActualChangedFileOverlaps(input) {
    const findings = [];
    for (const other of input.otherContracts) {
        const matched = [];
        let bucket;
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
        if (!bucket || matched.length === 0)
            continue;
        findings.push(buildActualOverlapFinding(input.repairId, other.repair_id, bucket, matched));
    }
    return findings;
}
function findPatternOverlap(contract, other) {
    const currentEntries = [
        ...contract.repair_scope.allowed.map(entry => ({ bucket: "allowed", pattern: entry.pattern })),
        ...contract.repair_scope.review_required.map(entry => ({ bucket: "review_required", pattern: entry.pattern })),
        ...contract.repair_scope.forbidden.map(entry => ({ bucket: "forbidden", pattern: entry.pattern })),
    ];
    const otherEntries = [
        ...other.repair_scope.allowed.map(entry => ({ bucket: "allowed", pattern: entry.pattern })),
        ...other.repair_scope.review_required.map(entry => ({ bucket: "review_required", pattern: entry.pattern })),
        ...other.repair_scope.forbidden.map(entry => ({ bucket: "forbidden", pattern: entry.pattern })),
    ];
    const overlappingPatterns = [];
    let strongestBucket = "allowed";
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
function buildPatternOverlapFinding(repairId, otherRepairId, bucket, patterns) {
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
function buildActualOverlapFinding(repairId, otherRepairId, bucket, files) {
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
function patternsOverlap(left, right) {
    return matchesPattern(left, right) || matchesPattern(right, left) || left === right;
}
function strongerBucket(left, right) {
    const rank = { allowed: 0, review_required: 1, forbidden: 2 };
    return rank[left] >= rank[right] ? left : right;
}
//# sourceMappingURL=activeRepairOverlapDetector.js.map