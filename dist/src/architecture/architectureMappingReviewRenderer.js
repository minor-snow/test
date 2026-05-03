/**
 * P30: Architecture Mapping Review Renderer
 *
 * Generates `architecture_mapping_review.md` — the core human-facing UX of P30.
 * Groups claims by confidence, provides reproducible CLI commands for each claim,
 * and surfaces unmapped claims and glossary term candidates for manual resolution.
 *
 * P30-0.5 evolution: Now includes:
 * - Term Candidates section (glossary terms found but not yet accepted)
 * - Claims Needing Term Mapping section (text with no glossary match)
 * - `pantheon arch term` commands alongside `arch map` commands
 *
 * ref: P30
 */
/**
 * Render the architecture mapping review as markdown.
 */
export function renderArchitectureMappingReview(input) {
    const { archId, sourcePath, claims, evidence, relations } = input;
    // Index evidence by claim_id
    const evidenceByClaimId = new Map();
    for (const ev of evidence) {
        const list = evidenceByClaimId.get(ev.claim_id) ?? [];
        list.push(ev);
        evidenceByClaimId.set(ev.claim_id, list);
    }
    // Index relations by claim_id
    const relationsByClaimId = new Map();
    for (const rel of relations) {
        for (const claimId of rel.source_claim_ids) {
            const list = relationsByClaimId.get(claimId) ?? [];
            list.push(rel);
            relationsByClaimId.set(claimId, list);
        }
    }
    // Categorize claims
    const highConfidence = [];
    const needsReview = [];
    const unmapped = [];
    for (const claim of claims) {
        const claimEvidence = evidenceByClaimId.get(claim.claim_id) ?? [];
        const claimRelations = relationsByClaimId.get(claim.claim_id) ?? [];
        if (claim.extraction_confidence === "high" && claimEvidence.length > 0 && claimRelations.length > 0) {
            highConfidence.push(claim);
        }
        else if (claimRelations.length > 0) {
            needsReview.push(claim);
        }
        else {
            unmapped.push(claim);
        }
    }
    const lines = [];
    // Header
    lines.push("# Architecture Mapping Review");
    lines.push("");
    lines.push(`Source: ${sourcePath}`);
    lines.push(`Architecture ID: ${archId}`);
    lines.push("");
    // Summary
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Claims extracted: ${claims.length}`);
    lines.push(`- High-confidence mappings: ${highConfidence.length}`);
    lines.push(`- Needs review: ${needsReview.length}`);
    lines.push(`- Unmapped claims: ${unmapped.length}`);
    lines.push(`- User overrides: 0`);
    lines.push("");
    // Limitation notice
    lines.push("> Architecture contracts are governance constraints derived from reviewed documentation and repository evidence.");
    lines.push("> They do not prove semantic correctness or complete dependency structure.");
    lines.push("");
    // High-confidence section
    if (highConfidence.length > 0) {
        lines.push("## Accepted Candidates");
        lines.push("");
        for (const claim of highConfidence) {
            renderClaimBlock(lines, claim, evidenceByClaimId, relationsByClaimId);
        }
    }
    // Needs review section
    if (needsReview.length > 0) {
        lines.push("## Needs Review");
        lines.push("");
        for (const claim of needsReview) {
            renderClaimBlock(lines, claim, evidenceByClaimId, relationsByClaimId);
        }
    }
    // Unmapped section
    if (unmapped.length > 0) {
        lines.push("## Unmapped Claims");
        lines.push("");
        for (const claim of unmapped) {
            renderUnmappedClaim(lines, claim);
        }
    }
    // Term Candidates section (from glossary)
    if (input.glossary) {
        const candidates = input.glossary.entries.filter(e => e.status === "candidate");
        if (candidates.length > 0) {
            lines.push("## Term Candidates");
            lines.push("");
            lines.push("The following terms were automatically extracted from the repository.");
            lines.push("Review and accept them with `pantheon arch term` commands.");
            lines.push("");
            for (const entry of candidates) {
                renderTermCandidate(lines, entry);
            }
        }
    }
    // Claims needing term mapping
    const needsTermMapping = claims.filter(c => c.status === "needs_review");
    if (needsTermMapping.length > 0) {
        lines.push("## Claims Needing Term Mapping");
        lines.push("");
        lines.push("These claims mention glossary terms but could not be automatically mapped.");
        lines.push("Set a term mapping to resolve them.");
        lines.push("");
        for (const claim of needsTermMapping) {
            renderNeedsTermMapping(lines, claim);
        }
    }
    // Next steps
    lines.push("## Next Steps");
    lines.push("");
    lines.push("1. Review each mapping above and run the suggested commands to accept, reject, or correct.");
    lines.push("2. Accept glossary term candidates with `pantheon arch term set`.");
    lines.push(`3. When satisfied, run: \`pantheon arch accept --arch-id ${archId}\``);
    lines.push("4. The accepted contract will constrain future `change` and `repair` checks.");
    lines.push("");
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function renderClaimBlock(lines, claim, evidenceByClaimId, relationsByClaimId) {
    const claimEvidence = evidenceByClaimId.get(claim.claim_id) ?? [];
    const claimRelations = relationsByClaimId.get(claim.claim_id) ?? [];
    lines.push(`### ${claim.claim_id}`);
    lines.push(`Source: ${claim.source_heading} (L${claim.source_line_start})`);
    lines.push("");
    lines.push(`> ${claim.raw_text}`);
    lines.push("");
    // Suggested mappings
    if (claimRelations.length > 0) {
        lines.push("Suggested mapping:");
        for (const rel of claimRelations) {
            const objectStr = rel.object ? ` ${rel.object}` : "";
            lines.push(`- ${rel.subject} ${rel.relation_type}${objectStr}`);
            if (rel.path_patterns.length > 0) {
                lines.push(`  Path patterns: ${rel.path_patterns.join(", ")}`);
            }
        }
        lines.push("");
    }
    // Evidence
    if (claimEvidence.length > 0) {
        lines.push("Evidence:");
        for (const ev of claimEvidence) {
            lines.push(`- [${ev.evidence_type}] ${ev.match_reason}`);
        }
        lines.push("");
    }
    lines.push(`Confidence: ${claim.extraction_confidence}`);
    lines.push("");
    // Suggested commands
    lines.push("Suggested commands:");
    lines.push("```bash");
    lines.push(`pantheon arch map accept ${claim.claim_id}`);
    lines.push(`pantheon arch map reject ${claim.claim_id} --reason "Not a current constraint"`);
    // Additional contextual commands
    if (claim.extracted_subject && claim.extracted_object && claim.extracted_object.includes("/")) {
        lines.push(`pantheon arch map set "${claim.extracted_subject}" "${claim.extracted_object}"`);
    }
    if (claim.extracted_relation === "review_required_for" && claim.extracted_subject) {
        for (const rel of claimRelations) {
            if (rel.path_patterns.length > 0) {
                lines.push(`pantheon arch map review-required "${claim.extracted_subject}" "${rel.path_patterns[0]}"`);
            }
        }
    }
    if (claim.extracted_relation === "forbidden_change" && claim.extracted_subject) {
        for (const rel of claimRelations) {
            if (rel.path_patterns.length > 0) {
                lines.push(`pantheon arch map forbidden "${claim.extracted_subject}" "${rel.path_patterns[0]}"`);
            }
        }
    }
    if (claim.extracted_relation === "must_not_depend_on" && claim.extracted_subject && claim.extracted_object) {
        lines.push(`pantheon arch map must-not-depend "${claim.extracted_subject}" "${claim.extracted_object}"`);
    }
    if (claim.extracted_relation === "external_service" && claim.extracted_subject) {
        lines.push(`pantheon arch map external "${claim.extracted_subject}"`);
    }
    lines.push("```");
    lines.push("");
}
function renderUnmappedClaim(lines, claim) {
    lines.push(`### ${claim.claim_id}`);
    lines.push(`Source: ${claim.source_heading} (L${claim.source_line_start})`);
    lines.push("");
    lines.push(`> ${claim.raw_text}`);
    lines.push("");
    lines.push(`Kind: ${claim.claim_kind}`);
    lines.push(`Confidence: ${claim.extraction_confidence}`);
    lines.push("");
    lines.push("No automatic mapping found. Possible actions:");
    lines.push("```bash");
    lines.push(`pantheon arch map reject ${claim.claim_id} --reason "Not applicable"`);
    if (claim.extracted_subject) {
        lines.push(`pantheon arch map set "${claim.extracted_subject}" "src/<path>/**"`);
        lines.push(`pantheon arch term set "${claim.extracted_subject}" "src/<path>/**"`);
    }
    lines.push("```");
    lines.push("");
}
function renderTermCandidate(lines, entry) {
    lines.push(`### ${entry.term}`);
    lines.push("");
    if (entry.aliases.length > 0) {
        lines.push("Aliases found:");
        for (const alias of entry.aliases) {
            lines.push(`- ${alias}`);
        }
        lines.push("");
    }
    lines.push(`Kind: ${entry.kind}`);
    lines.push(`Source: ${entry.source}`);
    lines.push(`Confidence: ${entry.confidence}`);
    lines.push("");
    if (entry.path_patterns.length > 0) {
        lines.push("Suggested paths:");
        for (const p of entry.path_patterns) {
            lines.push(`- ${p}`);
        }
        lines.push("");
    }
    if (entry.evidence_paths.length > 0) {
        lines.push("Evidence:");
        for (const p of entry.evidence_paths.slice(0, 5)) {
            lines.push(`- ${p}`);
        }
        lines.push("");
    }
    lines.push("Suggested commands:");
    lines.push("```bash");
    if (entry.path_patterns.length > 0) {
        lines.push(`pantheon arch term set "${entry.term}" "${entry.path_patterns[0]}"`);
    }
    else {
        lines.push(`pantheon arch term set "${entry.term}" "src/<path>/**"`);
    }
    for (const alias of entry.aliases) {
        lines.push(`pantheon arch term alias "${entry.term}" "${alias}"`);
    }
    if (entry.kind !== "module" && entry.kind !== "unknown") {
        lines.push(`pantheon arch term kind "${entry.term}" ${entry.kind}`);
    }
    lines.push("```");
    lines.push("");
}
function renderNeedsTermMapping(lines, claim) {
    lines.push(`### ${claim.claim_id}`);
    lines.push(`Source: ${claim.source_heading} (L${claim.source_line_start})`);
    lines.push("");
    lines.push(`> ${claim.raw_text}`);
    lines.push("");
    if (claim.extracted_subject) {
        lines.push(`Matched term: ${claim.extracted_subject}`);
        if (claim.extracted_object) {
            lines.push(`Suggested path: ${claim.extracted_object}`);
        }
        else {
            lines.push("Missing mapping: no path configured for this term");
        }
        lines.push("");
        lines.push("Suggested commands:");
        lines.push("```bash");
        if (claim.extracted_object) {
            lines.push(`pantheon arch term set "${claim.extracted_subject}" "${claim.extracted_object}"`);
        }
        else {
            lines.push(`pantheon arch term set "${claim.extracted_subject}" "<path>"`);
        }
        lines.push("```");
        lines.push("");
    }
}
//# sourceMappingURL=architectureMappingReviewRenderer.js.map