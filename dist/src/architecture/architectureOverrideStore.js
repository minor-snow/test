/**
 * P30: Architecture Override Store
 *
 * JSONL append-only log for architecture overrides.
 * Each line is one override event — the source of truth.
 * `resolveOverrides()` computes the latest-wins semantic view at accept time.
 *
 * Design decision:
 * - JSONL for auditability (each override is a discrete event)
 * - Override event IDs include timestamp for ledger identity
 * - The resolved view is computed, not stored — contract hash
 *   derives from semantic content, not override timestamps
 *
 * ref: P30
 */
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { generateOverrideId, generateRelationId } from "./architectureId.js";
import { architectureRunPaths, ensureArchitectureRunDir } from "./architectureArtifactLayout.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Append an override event to the JSONL log.
 */
export function appendArchitectureOverride(repoRoot, archId, override) {
    ensureArchitectureRunDir(repoRoot, archId);
    const paths = architectureRunPaths(repoRoot, archId);
    const now = new Date().toISOString();
    const fullOverride = {
        ...override,
        override_id: generateOverrideId(override.operation, override.subject, now),
        created_at: now,
    };
    appendFileSync(paths.overrides, JSON.stringify(fullOverride) + "\n", "utf-8");
    return fullOverride;
}
/**
 * Load all override events from the JSONL log.
 */
export function loadArchitectureOverrides(repoRoot, archId) {
    const paths = architectureRunPaths(repoRoot, archId);
    if (!existsSync(paths.overrides))
        return [];
    const content = readFileSync(paths.overrides, "utf-8").trim();
    if (!content)
        return [];
    return content
        .split("\n")
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
}
/**
 * Apply overrides to relations, producing the resolved semantic view.
 *
 * Latest override wins per (subject, relation_type, object) triple.
 * This is the view used by `arch accept` to build the contract.
 *
 * Returns:
 * - Updated relations with review_status and path_patterns modified
 * - New relations created by `set_mapping`, `set_external`, etc.
 */
export function resolveOverrides(relations, overrides) {
    // Build a mutable copy of relations indexed by relation_id
    const relMap = new Map();
    for (const rel of relations) {
        relMap.set(rel.relation_id, { ...rel });
    }
    // Track new relations created by overrides
    const newRelations = [];
    // Process overrides in order (latest wins naturally)
    for (const override of overrides) {
        switch (override.operation) {
            case "accept_relation": {
                // Find matching relation by claim reference or subject match
                const matching = findRelationForOverride(relMap, override);
                if (matching) {
                    relMap.set(matching.relation_id, {
                        ...matching,
                        review_status: "accepted",
                        override_ids: [...matching.override_ids, override.override_id],
                    });
                }
                break;
            }
            case "reject_relation": {
                const matching = findRelationForOverride(relMap, override);
                if (matching) {
                    relMap.set(matching.relation_id, {
                        ...matching,
                        review_status: "rejected",
                        override_ids: [...matching.override_ids, override.override_id],
                    });
                }
                break;
            }
            case "set_mapping": {
                const relId = `rel_set_${override.subject}_${override.path_patterns?.[0] ?? ""}`.replace(/[^a-zA-Z0-9_]/g, "_");
                const existing = [...relMap.values()].find(r => r.subject === override.subject && r.relation_type === "owns");
                if (existing) {
                    relMap.set(existing.relation_id, {
                        ...existing,
                        path_patterns: override.path_patterns ?? existing.path_patterns,
                        review_status: "edited",
                        override_ids: [...existing.override_ids, override.override_id],
                    });
                }
                else {
                    const newRel = createOverrideRelation(override, "owns", "module", "path_group");
                    relMap.set(newRel.relation_id, newRel);
                }
                break;
            }
            case "set_external": {
                const newRel = createOverrideRelation(override, "external_service", "external_service", "unknown");
                relMap.set(newRel.relation_id, newRel);
                break;
            }
            case "set_review_required": {
                const newRel = createOverrideRelation(override, "review_required_for", "module", "path_group");
                relMap.set(newRel.relation_id, newRel);
                break;
            }
            case "set_forbidden": {
                const newRel = createOverrideRelation(override, "forbidden_change", "module", "path_group");
                relMap.set(newRel.relation_id, newRel);
                break;
            }
            case "set_allowed": {
                const newRel = createOverrideRelation(override, "allowed_change", "module", "path_group");
                relMap.set(newRel.relation_id, newRel);
                break;
            }
            case "set_must_not_depend_on": {
                const newRel = createOverrideRelation(override, "must_not_depend_on", "module", "module");
                relMap.set(newRel.relation_id, newRel);
                break;
            }
        }
    }
    return [...relMap.values()].sort((a, b) => `${a.subject}:${a.relation_type}`.localeCompare(`${b.subject}:${b.relation_type}`));
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function findRelationForOverride(relMap, override) {
    // First try: match by subject (override.subject might be a claim_id or a subject name)
    for (const rel of relMap.values()) {
        // Direct claim_id match
        if (rel.source_claim_ids.includes(override.subject))
            return rel;
        // Subject name match
        if (rel.subject === override.subject) {
            if (!override.relation_type || rel.relation_type === override.relation_type) {
                return rel;
            }
        }
    }
    return undefined;
}
function createOverrideRelation(override, relationType, subjectKind, objectKind) {
    const object = override.object ?? override.path_patterns?.[0] ?? "";
    return {
        relation_id: generateRelationId(override.subject, relationType, object),
        relation_type: relationType,
        subject: override.subject,
        object,
        subject_kind: subjectKind,
        object_kind: objectKind,
        path_patterns: override.path_patterns ?? [],
        source_claim_ids: [],
        evidence_ids: [],
        override_ids: [override.override_id],
        confidence: "high", // User overrides are always high confidence
        review_status: "accepted", // Override-created relations are pre-accepted
    };
}
//# sourceMappingURL=architectureOverrideStore.js.map