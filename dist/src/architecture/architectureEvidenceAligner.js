/**
 * P30: Architecture Evidence Aligner
 *
 * Aligns extracted architecture claims with repository evidence.
 * Uses existing repoObservation capabilities (path existence, directory matching,
 * test mapping, manifest matching, config hints).
 *
 * Conservative: only produces evidence types with clear structural backing.
 * No import_hint in MVP to avoid "seems to understand dependency graph" overclaim.
 *
 * ref: P30
 */
import { generateEvidenceId } from "./architectureId.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * For each claim, search the repository observations for supporting evidence.
 * Returns a flat array of evidence candidates linked to their source claims.
 */
export function alignArchitectureEvidence(claims, observations) {
    const evidence = [];
    const allPaths = observations.observations.files.map(f => f.path);
    for (const claim of claims) {
        const candidates = findEvidenceForClaim(claim, allPaths, observations);
        evidence.push(...candidates);
    }
    return evidence;
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function findEvidenceForClaim(claim, allPaths, observations) {
    const results = [];
    // Extract path-like references from the claim
    const pathCandidates = extractPathCandidatesFromClaim(claim);
    for (const pathCandidate of pathCandidates) {
        // Check for exact directory existence
        const dirPattern = pathCandidate.replace(/\*\*$/, "").replace(/\/$/, "");
        const dirMatches = allPaths.filter(p => p.startsWith(dirPattern + "/") || p === dirPattern);
        if (dirMatches.length > 0) {
            results.push({
                evidence_id: generateEvidenceId(claim.claim_id, "directory_match", dirPattern),
                claim_id: claim.claim_id,
                evidence_type: "directory_match",
                repo_relative_path: dirPattern + "/",
                match_reason: `Directory ${dirPattern}/ exists with ${dirMatches.length} file(s)`,
                confidence: "high",
            });
        }
        // Check for specific file match
        const fileMatches = allPaths.filter(p => p === pathCandidate);
        if (fileMatches.length > 0) {
            results.push({
                evidence_id: generateEvidenceId(claim.claim_id, "file_match", pathCandidate),
                claim_id: claim.claim_id,
                evidence_type: "file_match",
                repo_relative_path: pathCandidate,
                match_reason: `File ${pathCandidate} exists`,
                confidence: "high",
            });
        }
    }
    // Check subject/object name against path structure for ownership claims
    if (claim.extracted_subject) {
        const subjectEvidence = findSubjectPathEvidence(claim.claim_id, claim.extracted_subject, allPaths);
        results.push(...subjectEvidence);
    }
    if (claim.extracted_object && claim.claim_kind !== "external_service") {
        const objectEvidence = findSubjectPathEvidence(claim.claim_id, claim.extracted_object, allPaths);
        results.push(...objectEvidence);
    }
    // Check test mapping evidence
    if (claim.extracted_relation === "tested_by" && claim.extracted_object) {
        const testEvidence = findTestMappingEvidence(claim, allPaths, observations);
        results.push(...testEvidence);
    }
    // Check package manifest evidence
    if (claim.extracted_relation === "depends_on" || claim.extracted_relation === "external_service") {
        const manifestEvidence = findManifestEvidence(claim, observations);
        results.push(...manifestEvidence);
    }
    return deduplicateEvidence(results);
}
function extractPathCandidatesFromClaim(claim) {
    const paths = [];
    // Extract from raw_text using the path pattern
    const pathRe = /(?:^|[\s`"'(,])([a-zA-Z0-9_.][a-zA-Z0-9_./\-*]*\/[a-zA-Z0-9_./\-*]*[a-zA-Z0-9_*])/g;
    let match;
    pathRe.lastIndex = 0;
    while ((match = pathRe.exec(claim.raw_text)) !== null) {
        const candidate = match[1];
        if (!candidate.includes("://") && candidate.length >= 4) {
            paths.push(candidate);
        }
    }
    // Also check the extracted_object if it looks like a path
    if (claim.extracted_object && claim.extracted_object.includes("/")) {
        paths.push(claim.extracted_object);
    }
    return [...new Set(paths)];
}
function findSubjectPathEvidence(claimId, name, allPaths) {
    const results = [];
    const normalized = name.toLowerCase().replace(/\s+/g, "");
    // Look for src/<name>/ pattern
    const directoryPrefixes = [
        `src/${normalized}/`,
        `src/${normalized}`,
        `packages/${normalized}/`,
        `lib/${normalized}/`,
    ];
    for (const prefix of directoryPrefixes) {
        const matches = allPaths.filter(p => p.toLowerCase().startsWith(prefix));
        if (matches.length > 0) {
            results.push({
                evidence_id: generateEvidenceId(claimId, "path_exists", prefix),
                claim_id: claimId,
                evidence_type: "path_exists",
                repo_relative_path: prefix,
                match_reason: `Path prefix ${prefix} matches ${matches.length} file(s) for "${name}"`,
                confidence: "medium",
            });
        }
    }
    // Look for test/<name>/ pattern
    const testPrefixes = [
        `test/${normalized}/`,
        `tests/${normalized}/`,
        `__tests__/${normalized}/`,
    ];
    for (const prefix of testPrefixes) {
        const matches = allPaths.filter(p => p.toLowerCase().startsWith(prefix));
        if (matches.length > 0) {
            results.push({
                evidence_id: generateEvidenceId(claimId, "test_match", prefix),
                claim_id: claimId,
                evidence_type: "test_match",
                repo_relative_path: prefix,
                match_reason: `Test path prefix ${prefix} matches ${matches.length} file(s) for "${name}"`,
                confidence: "medium",
            });
        }
    }
    return results;
}
function findTestMappingEvidence(claim, allPaths, observations) {
    const results = [];
    const testPath = claim.extracted_object;
    if (!testPath)
        return results;
    const testPathClean = testPath.replace(/\*\*$/, "").replace(/\/$/, "");
    const matches = allPaths.filter(p => p.startsWith(testPathClean));
    if (matches.length > 0) {
        results.push({
            evidence_id: generateEvidenceId(claim.claim_id, "test_match", testPathClean),
            claim_id: claim.claim_id,
            evidence_type: "test_match",
            repo_relative_path: testPathClean + "/",
            match_reason: `Test directory ${testPathClean}/ exists with ${matches.length} file(s)`,
            confidence: "high",
        });
    }
    return results;
}
function findManifestEvidence(claim, observations) {
    const results = [];
    const target = claim.extracted_object ?? claim.extracted_subject ?? "";
    if (!target)
        return results;
    const targetLower = target.toLowerCase();
    for (const manifest of observations.observations.package_manifests) {
        const allDeps = [
            ...manifest.dependencies,
            ...manifest.dev_dependencies,
            ...manifest.peer_dependencies,
            ...manifest.optional_dependencies,
        ];
        const matchingDeps = allDeps.filter(d => d.toLowerCase().includes(targetLower));
        if (matchingDeps.length > 0) {
            results.push({
                evidence_id: generateEvidenceId(claim.claim_id, "manifest_match", manifest.package_json_path),
                claim_id: claim.claim_id,
                evidence_type: "manifest_match",
                repo_relative_path: manifest.package_json_path,
                match_reason: `Package "${matchingDeps[0]}" found in ${manifest.package_json_path}`,
                confidence: "medium",
            });
        }
    }
    return results;
}
function deduplicateEvidence(evidence) {
    const seen = new Set();
    return evidence.filter(e => {
        if (seen.has(e.evidence_id))
            return false;
        seen.add(e.evidence_id);
        return true;
    });
}
//# sourceMappingURL=architectureEvidenceAligner.js.map