/**
 * P30: Architecture Relation Builder
 *
 * Combines extracted claims and evidence candidates into architecture relations.
 * Each relation represents a semantic triple (subject, relation_type, object)
 * with supporting evidence and an initial review status.
 *
 * All relations start as "unreviewed" — they become governance constraints
 * only after user review and `pantheon arch accept`.
 *
 * ref: P30
 */
import { generateRelationId } from "./architectureId.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Build candidate relations from claims and their evidence.
 *
 * Deduplicates by (subject, relation_type, object) triple.
 * Multiple claims producing the same triple are merged —
 * evidence and claim IDs are combined, confidence is the maximum.
 */
export function buildArchitectureRelations(claims, evidence) {
    // Index evidence by claim_id
    const evidenceByClaimId = new Map();
    for (const ev of evidence) {
        const list = evidenceByClaimId.get(ev.claim_id) ?? [];
        list.push(ev);
        evidenceByClaimId.set(ev.claim_id, list);
    }
    // Group claims by semantic triple
    const relationMap = new Map();
    for (const claim of claims) {
        if (!claim.extracted_subject || !claim.extracted_relation)
            continue;
        const key = `${claim.extracted_subject}:${claim.extracted_relation}:${claim.extracted_object ?? ""}`;
        const group = relationMap.get(key) ?? { claims: [], evidence: [] };
        group.claims.push(claim);
        const claimEvidence = evidenceByClaimId.get(claim.claim_id) ?? [];
        group.evidence.push(...claimEvidence);
        relationMap.set(key, group);
    }
    // Build relations from groups
    const relations = [];
    for (const [, group] of relationMap) {
        const primaryClaim = group.claims[0];
        if (!primaryClaim.extracted_subject || !primaryClaim.extracted_relation)
            continue;
        const subject = primaryClaim.extracted_subject;
        const relationType = primaryClaim.extracted_relation;
        const object = primaryClaim.extracted_object ?? "";
        // Derive path patterns from evidence
        const pathPatterns = derivePathPatterns(subject, object, group.evidence);
        // Compute aggregate confidence
        const confidence = aggregateConfidence(group.claims.map(c => c.extraction_confidence), group.evidence.map(e => e.confidence));
        relations.push({
            relation_id: generateRelationId(subject, relationType, object),
            relation_type: relationType,
            subject,
            object,
            subject_kind: inferEntityKind(subject),
            object_kind: object ? inferEntityKind(object) : "unknown",
            path_patterns: pathPatterns,
            source_claim_ids: group.claims.map(c => c.claim_id),
            evidence_ids: [...new Set(group.evidence.map(e => e.evidence_id))],
            override_ids: [],
            confidence,
            review_status: "unreviewed",
        });
    }
    return relations.sort((a, b) => `${a.subject}:${a.relation_type}`.localeCompare(`${b.subject}:${b.relation_type}`));
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Derive path patterns from evidence for a given subject/object.
 *
 * Prefers explicit paths found in evidence. Falls back to
 * conventional patterns (src/<name>/**) if evidence is structural.
 */
function derivePathPatterns(subject, object, evidence) {
    const patterns = new Set();
    // Direct path evidence
    for (const ev of evidence) {
        if (ev.evidence_type === "directory_match" || ev.evidence_type === "path_exists") {
            const path = ev.repo_relative_path.replace(/\/$/, "");
            patterns.add(`${path}/**`);
        }
        else if (ev.evidence_type === "file_match") {
            patterns.add(ev.repo_relative_path);
        }
        else if (ev.evidence_type === "test_match") {
            const path = ev.repo_relative_path.replace(/\/$/, "");
            patterns.add(`${path}/**`);
        }
    }
    // If object looks like a path pattern, include it directly
    if (object && object.includes("/")) {
        patterns.add(object.endsWith("**") ? object : `${object.replace(/\/$/, "")}/**`);
    }
    return [...patterns].sort();
}
/**
 * Infer entity kind from a name.
 */
function inferEntityKind(name) {
    const lower = name.toLowerCase();
    // Path-like names
    if (name.includes("/"))
        return "path_group";
    // Service indicators
    if (lower.includes("service") || lower.includes("server") || lower.includes("api"))
        return "service";
    // External indicators
    if (lower.includes("external") || lower.includes("third-party") || lower.includes("stripe") ||
        lower.includes("aws") || lower.includes("redis") || lower.includes("postgres")) {
        return "external_service";
    }
    // Package indicators
    if (lower.includes("package") || lower.includes("lib") || lower.includes("sdk"))
        return "package";
    // Interface indicators
    if (lower.includes("interface") || lower.includes("endpoint") || lower.includes("rest"))
        return "interface";
    // Default to module
    return "module";
}
/**
 * Aggregate confidence: take the highest confidence from either claims or evidence.
 */
function aggregateConfidence(claimConfidences, evidenceConfidences) {
    const all = [...claimConfidences, ...evidenceConfidences];
    if (all.includes("high"))
        return "high";
    if (all.includes("medium"))
        return "medium";
    return "low";
}
//# sourceMappingURL=architectureRelationBuilder.js.map