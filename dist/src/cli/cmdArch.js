/**
 * P30-11: Architecture CLI
 *
 * Commands:
 *   pantheon arch ingest <path>
 *   pantheon arch review [--arch-id <id>]
 *   pantheon arch term list [--arch-id <id>]
 *   pantheon arch term set "<term>" "<pattern>" [--arch-id <id>]
 *   pantheon arch term alias "<term>" "<alias>" [--arch-id <id>]
 *   pantheon arch term kind "<term>" <kind> [--arch-id <id>]
 *   pantheon arch map accept <claim_id> [--arch-id <id>]
 *   pantheon arch map reject <claim_id> --reason "<reason>" [--arch-id <id>]
 *   pantheon arch map set "<subject>" "<pattern>" [--arch-id <id>]
 *   pantheon arch map review-required "<subject>" "<pattern>" [--arch-id <id>]
 *   pantheon arch map forbidden "<subject>" "<pattern>" [--arch-id <id>]
 *   pantheon arch map must-not-depend "<subject>" "<object>" [--arch-id <id>]
 *   pantheon arch map external "<subject>" [--arch-id <id>]
 *   pantheon arch accept [--arch-id <id>]
 *   pantheon arch status
 *
 * ref: P30
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { parseMarkdownArchitecture } from "../architecture/markdownArchitectureParser.js";
import { extractArchitectureClaims } from "../architecture/architectureClaimExtractor.js";
import { alignArchitectureEvidence } from "../architecture/architectureEvidenceAligner.js";
import { buildArchitectureRelations } from "../architecture/architectureRelationBuilder.js";
import { renderArchitectureMappingReview } from "../architecture/architectureMappingReviewRenderer.js";
import { appendArchitectureOverride, loadArchitectureOverrides, resolveOverrides, } from "../architecture/architectureOverrideStore.js";
import { buildArchitectureContract } from "../architecture/architectureContractBuilder.js";
import { renderArchitectureContract } from "../architecture/architectureContractRenderer.js";
import { loadArchitectureGlossary, saveArchitectureGlossary, setGlossaryTerm, addGlossaryAlias, setGlossaryKind, deriveGlossaryCandidates, getAcceptedGlossaryEntries, getGlossaryCandidates, } from "../architecture/architectureGlossaryStore.js";
import { generateArchId, generateOverrideId } from "../architecture/architectureId.js";
import { ensureArchitectureDirs, ensureArchitectureRunDir, architectureRootPaths, architectureRunPaths, } from "../architecture/architectureArtifactLayout.js";
import { scanRepo } from "../repoObservation/repoScanner.js";
import { loadRepoObservationConfig } from "../repoObservation/repoObservationConfigLoader.js";
import { tryAppendGovernanceEvent } from "../governanceLog/governanceEventWriter.js";
import { writeReviewRequest } from "../review/reviewQueueStore.js";
import { buildArchitectureMappingReviewRequest } from "../review/reviewRequestBuilder.js";
import { evaluateArchitectureConstraints } from "../architecture/architectureConstraintEvaluator.js";
import { renderArchitectureFindings } from "../architecture/architectureFindingRenderer.js";
import { readGitDiffSummary } from "../diffWorkflow/gitDiffReader.js";
// ---------------------------------------------------------------------------
// Flag helpers (local to this module, same pattern as cmdRepair)
// ---------------------------------------------------------------------------
function getFlag(args, name) {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1])
        return args[idx + 1];
    return undefined;
}
function requireFlag(args, name, errorMessage) {
    const val = getFlag(args, name);
    if (!val) {
        console.error(errorMessage);
        process.exit(1);
    }
    return val;
}
function getPositional(args, index) {
    const val = args[index];
    if (!val || val.startsWith("--"))
        return undefined;
    return val;
}
function requirePositional(args, index, errorMessage) {
    const val = getPositional(args, index);
    if (!val) {
        console.error(errorMessage);
        process.exit(1);
    }
    return val;
}
// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------
export function cmdArch(args) {
    const subcommand = args[0];
    const repoRoot = resolve(getFlag(args, "repo") ?? ".");
    switch (subcommand) {
        case "ingest":
            cmdArchIngest(repoRoot, args.slice(1));
            return;
        case "review":
            cmdArchReview(repoRoot, args.slice(1));
            return;
        case "term":
            cmdArchTerm(repoRoot, args.slice(1));
            return;
        case "map":
            cmdArchMap(repoRoot, args.slice(1));
            return;
        case "accept":
            cmdArchAccept(repoRoot, args.slice(1));
            return;
        case "status":
            cmdArchStatus(repoRoot);
            return;
        case "check":
            cmdArchCheck(repoRoot, getFlag(args, "base"));
            return;
        default:
            printArchHelp();
            process.exit(subcommand ? 1 : 0);
    }
}
// ---------------------------------------------------------------------------
// arch ingest <path>
// ---------------------------------------------------------------------------
function cmdArchIngest(repoRoot, args) {
    const sourcePath = requirePositional(args, 0, "Usage: pantheon arch ingest <path>");
    const absPath = resolve(sourcePath);
    if (!existsSync(absPath)) {
        console.error(`File not found: ${absPath}`);
        process.exit(1);
    }
    ensureArchitectureDirs(repoRoot);
    const content = readFileSync(absPath, "utf-8");
    const contentHash = createHash("sha256").update(content).digest("hex").slice(0, 16);
    const archId = generateArchId(contentHash);
    ensureArchitectureRunDir(repoRoot, archId);
    const paths = architectureRunPaths(repoRoot, archId);
    // 1. Parse markdown
    const sections = parseMarkdownArchitecture(content);
    // 2. Load/derive glossary
    let glossary = loadArchitectureGlossary(repoRoot, archId);
    const obsConfig = loadRepoObservationConfig(repoRoot);
    const observations = scanRepo({ repoRoot, config: obsConfig.config });
    glossary = deriveGlossaryCandidates(observations, glossary);
    saveArchitectureGlossary(repoRoot, archId, glossary);
    // 3. Extract claims
    const claims = extractArchitectureClaims(archId, sections, glossary);
    // 4. Align evidence
    const evidence = alignArchitectureEvidence(claims, observations);
    // 5. Build relations
    const relations = buildArchitectureRelations(claims, evidence);
    // 6. Generate mapping review
    const reviewMd = renderArchitectureMappingReview({
        archId,
        sourcePath: relative(repoRoot, absPath),
        claims,
        evidence,
        relations,
        glossary,
    });
    // 7. Write artifacts
    const ingestRun = {
        schema_version: "architecture_ingest_run@0.1.0",
        arch_id: archId,
        source_path: relative(repoRoot, absPath),
        source_content_hash: contentHash,
        created_at: new Date().toISOString(),
        status: "review_generated",
    };
    writeFileSync(paths.ingestRun, JSON.stringify(ingestRun, null, 2));
    writeFileSync(paths.claims, JSON.stringify(claims, null, 2));
    writeFileSync(paths.evidence, JSON.stringify(evidence, null, 2));
    writeFileSync(paths.relations, JSON.stringify(relations, null, 2));
    writeFileSync(paths.mappingReview, reviewMd);
    tryAppendGovernanceEvent(repoRoot, {
        schema_version: "pantheon_governance_event@0.1.0",
        event_id: `ev_${Date.now()}_arch_ingest`,
        timestamp: new Date().toISOString(),
        source: "local_cli",
        event_type: "architecture_ingested",
        target_type: "architecture",
        target_id: archId,
    });
    const reviewReq = buildArchitectureMappingReviewRequest({
        archId,
        source: "local_cli",
        unresolvedCount: claims.filter(c => c.status === "needs_review").length + glossary.entries.filter(e => e.status === "candidate").length,
    });
    if (reviewReq) {
        writeReviewRequest(repoRoot, reviewReq);
        tryAppendGovernanceEvent(repoRoot, {
            schema_version: "pantheon_governance_event@0.1.0",
            event_id: `ev_${Date.now()}_arch_map_rev`,
            timestamp: new Date().toISOString(),
            source: "local_cli",
            event_type: "architecture_mapping_review_generated",
            target_type: "architecture",
            target_id: archId,
        });
    }
    console.log("Pantheon Architecture Ingest\n");
    console.log(`  Source: ${relative(repoRoot, absPath)}`);
    console.log(`  Architecture ID: ${archId}`);
    console.log(`  Claims extracted: ${claims.length}`);
    console.log(`  Evidence aligned: ${evidence.length}`);
    console.log(`  Relations built: ${relations.length}`);
    console.log(`  Glossary terms: ${glossary.entries.length} (${getAcceptedGlossaryEntries(glossary).length} accepted, ${getGlossaryCandidates(glossary).length} candidates)`);
    console.log(`  Mapping review: ${paths.mappingReview}`);
    console.log("");
    console.log("Next steps:");
    console.log(`  1. Review: ${paths.mappingReview}`);
    console.log(`  2. Set terms: pantheon arch term set "<term>" "<pattern>" --arch-id ${archId}`);
    console.log(`  3. Accept mappings: pantheon arch map accept <claim_id> --arch-id ${archId}`);
    console.log(`  4. Accept contract: pantheon arch accept --arch-id ${archId}`);
}
// ---------------------------------------------------------------------------
// arch review [--arch-id <id>]
// ---------------------------------------------------------------------------
function cmdArchReview(repoRoot, args) {
    const archId = resolveArchId(repoRoot, args);
    const paths = architectureRunPaths(repoRoot, archId);
    if (!existsSync(paths.mappingReview)) {
        console.error(`No mapping review found for ${archId}. Run 'pantheon arch ingest' first.`);
        process.exit(1);
    }
    const claims = loadJsonArtifact(paths.claims, "claims");
    const evidence = loadJsonArtifact(paths.evidence, "evidence");
    const relations = loadJsonArtifact(paths.relations, "relations");
    const glossary = loadArchitectureGlossary(repoRoot, archId);
    // Index by claim_id
    const evidenceByClaimId = new Map();
    for (const ev of evidence) {
        const list = evidenceByClaimId.get(ev.claim_id) ?? [];
        list.push(ev);
        evidenceByClaimId.set(ev.claim_id, list);
    }
    const relationsByClaimId = new Map();
    for (const rel of relations) {
        for (const claimId of rel.source_claim_ids) {
            const list = relationsByClaimId.get(claimId) ?? [];
            list.push(rel);
            relationsByClaimId.set(claimId, list);
        }
    }
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
    console.log("Pantheon Architecture Mapping Review");
    console.log(`Architecture ID: ${archId}`);
    console.log("");
    console.log("Summary:");
    console.log(`  - Claims extracted: ${claims.length}`);
    console.log(`  - Accepted candidates (high confidence): ${highConfidence.length}`);
    console.log(`  - Needs review: ${needsReview.length}`);
    console.log(`  - Unmapped claims: ${unmapped.length}`);
    const candidates = glossary.entries.filter(e => e.status === "candidate");
    if (candidates.length > 0) {
        console.log(`  - Term candidates: ${candidates.length}`);
    }
    const needsTermMapping = claims.filter(c => c.status === "needs_review");
    if (needsTermMapping.length > 0) {
        console.log(`  - Needs term mapping: ${needsTermMapping.length}`);
    }
    console.log("");
    // Term Candidates
    if (candidates.length > 0) {
        console.log("--- Term Candidates (accept these first) ---");
        for (const entry of candidates) {
            console.log(`[${entry.term}] (kind: ${entry.kind}, confidence: ${entry.confidence})`);
            const defaultPath = entry.path_patterns.length > 0 ? entry.path_patterns[0] : "src/<path>/**";
            console.log(`  pantheon arch term set "${entry.term}" "${defaultPath}"`);
        }
        console.log("");
    }
    // Needs Term Mapping
    if (needsTermMapping.length > 0) {
        console.log("--- Claims Needing Term Mapping ---");
        for (const claim of needsTermMapping) {
            console.log(`[${claim.claim_id}] ${claim.raw_text}`);
            if (claim.extracted_subject) {
                const defaultPath = claim.extracted_object ?? "<path>";
                console.log(`  pantheon arch term set "${claim.extracted_subject}" "${defaultPath}"`);
            }
        }
        console.log("");
    }
    // Needs Review
    if (needsReview.length > 0) {
        console.log("--- Mappings Needing Review ---");
        for (const claim of needsReview) {
            console.log(`[${claim.claim_id}] ${claim.raw_text}`);
            const rels = relationsByClaimId.get(claim.claim_id) ?? [];
            for (const rel of rels) {
                const objectStr = rel.object ? ` ${rel.object}` : "";
                console.log(`  Suggested: ${rel.subject} ${rel.relation_type}${objectStr}`);
            }
            console.log(`  pantheon arch map accept ${claim.claim_id}`);
            console.log(`  pantheon arch map reject ${claim.claim_id} --reason "incorrect or obsolete"`);
            console.log("");
        }
    }
    // Unmapped
    if (unmapped.length > 0) {
        console.log("--- Unmapped Claims ---");
        for (const claim of unmapped) {
            console.log(`[${claim.claim_id}] ${claim.raw_text}`);
            console.log(`  pantheon arch map reject ${claim.claim_id} --reason "not applicable"`);
            if (claim.extracted_subject) {
                console.log(`  pantheon arch map set "${claim.extracted_subject}" "src/<path>/**"`);
            }
            console.log("");
        }
    }
    console.log(`For detailed evidence, see: ${relative(repoRoot, paths.mappingReview)}`);
    console.log("When satisfied, complete the workflow with:");
    console.log(`  pantheon arch accept --arch-id ${archId}`);
}
// ---------------------------------------------------------------------------
// arch term <subcommand>
// ---------------------------------------------------------------------------
function cmdArchTerm(repoRoot, args) {
    const sub = args[0];
    switch (sub) {
        case "list": {
            const archId = resolveArchId(repoRoot, args.slice(1));
            const glossary = loadArchitectureGlossary(repoRoot, archId);
            console.log(`Architecture Glossary (${archId})\n`);
            const accepted = getAcceptedGlossaryEntries(glossary);
            const candidates = getGlossaryCandidates(glossary);
            if (accepted.length > 0) {
                console.log("Accepted terms:");
                for (const e of accepted) {
                    const aliases = e.aliases.length > 0 ? ` (aliases: ${e.aliases.join(", ")})` : "";
                    console.log(`  ${e.term} [${e.kind}] → ${e.path_patterns.join(", ")}${aliases}`);
                }
                console.log("");
            }
            if (candidates.length > 0) {
                console.log("Candidates (needs review):");
                for (const e of candidates) {
                    console.log(`  ${e.term} [${e.kind}] → ${e.path_patterns.join(", ")} (${e.source})`);
                }
                console.log("");
            }
            if (accepted.length === 0 && candidates.length === 0) {
                console.log("  No terms. Run 'pantheon arch ingest' to generate candidates.");
            }
            return;
        }
        case "set": {
            const term = requirePositional(args, 1, 'Usage: pantheon arch term set "<term>" "<pattern>" [--arch-id <id>]');
            const pattern = requirePositional(args, 2, 'Usage: pantheon arch term set "<term>" "<pattern>" [--arch-id <id>]');
            const archId = resolveArchId(repoRoot, args.slice(3));
            let glossary = loadArchitectureGlossary(repoRoot, archId);
            glossary = setGlossaryTerm(glossary, term, [pattern]);
            saveArchitectureGlossary(repoRoot, archId, glossary);
            console.log(`Set term "${term}" → ${pattern}`);
            console.log(`  Glossary hash: ${glossary.glossary_hash}`);
            return;
        }
        case "alias": {
            const term = requirePositional(args, 1, 'Usage: pantheon arch term alias "<term>" "<alias>" [--arch-id <id>]');
            const alias = requirePositional(args, 2, 'Usage: pantheon arch term alias "<term>" "<alias>" [--arch-id <id>]');
            const archId = resolveArchId(repoRoot, args.slice(3));
            let glossary = loadArchitectureGlossary(repoRoot, archId);
            glossary = addGlossaryAlias(glossary, term, [alias]);
            saveArchitectureGlossary(repoRoot, archId, glossary);
            console.log(`Added alias "${alias}" → "${term}"`);
            return;
        }
        case "kind": {
            const term = requirePositional(args, 1, 'Usage: pantheon arch term kind "<term>" <kind> [--arch-id <id>]');
            const kind = requirePositional(args, 2, 'Usage: pantheon arch term kind "<term>" <kind> [--arch-id <id>]');
            const archId = resolveArchId(repoRoot, args.slice(3));
            let glossary = loadArchitectureGlossary(repoRoot, archId);
            glossary = setGlossaryKind(glossary, term, kind);
            saveArchitectureGlossary(repoRoot, archId, glossary);
            console.log(`Set kind "${term}" → ${kind}`);
            return;
        }
        default:
            console.error("Usage:");
            console.error("  pantheon arch term list [--arch-id <id>]");
            console.error('  pantheon arch term set "<term>" "<pattern>" [--arch-id <id>]');
            console.error('  pantheon arch term alias "<term>" "<alias>" [--arch-id <id>]');
            console.error('  pantheon arch term kind "<term>" <kind> [--arch-id <id>]');
            process.exit(1);
    }
}
// ---------------------------------------------------------------------------
// arch map <subcommand>
// ---------------------------------------------------------------------------
function cmdArchMap(repoRoot, args) {
    const sub = args[0];
    const archId = resolveArchId(repoRoot, args.slice(1));
    const paths = architectureRunPaths(repoRoot, archId);
    switch (sub) {
        case "accept": {
            const claimId = requirePositional(args, 1, "Usage: pantheon arch map accept <claim_id> [--arch-id <id>]");
            applyOverride(repoRoot, archId, {
                operation: "accept_relation",
                subject: claimId,
                reason: "User accepted mapping.",
            });
            console.log(`Accepted mapping: ${claimId}`);
            console.log("  Run 'pantheon arch accept' when all mappings are reviewed.");
            return;
        }
        case "reject": {
            const claimId = requirePositional(args, 1, "Usage: pantheon arch map reject <claim_id> --reason \"...\" [--arch-id <id>]");
            const reason = getFlag(args, "reason") ?? "User rejected mapping.";
            applyOverride(repoRoot, archId, {
                operation: "reject_relation",
                subject: claimId,
                reason,
            });
            console.log(`Rejected mapping: ${claimId}`);
            return;
        }
        case "set": {
            const subject = requirePositional(args, 1, 'Usage: pantheon arch map set "<subject>" "<pattern>" [--arch-id <id>]');
            const pattern = requirePositional(args, 2, 'Usage: pantheon arch map set "<subject>" "<pattern>" [--arch-id <id>]');
            applyOverride(repoRoot, archId, {
                operation: "set_mapping",
                subject,
                pathPatterns: [pattern],
                reason: "User-defined ownership mapping.",
            });
            console.log(`Set mapping: ${subject} → ${pattern}`);
            return;
        }
        case "review-required": {
            const subject = requirePositional(args, 1, 'Usage: pantheon arch map review-required "<subject>" "<pattern>" [--arch-id <id>]');
            const pattern = requirePositional(args, 2, 'Usage: pantheon arch map review-required "<subject>" "<pattern>" [--arch-id <id>]');
            applyOverride(repoRoot, archId, {
                operation: "set_review_required",
                subject,
                pathPatterns: [pattern],
                reason: "User marked as review-required.",
            });
            console.log(`Set review-required: ${subject} → ${pattern}`);
            return;
        }
        case "forbidden": {
            const subject = requirePositional(args, 1, 'Usage: pantheon arch map forbidden "<subject>" "<pattern>" [--arch-id <id>]');
            const pattern = requirePositional(args, 2, 'Usage: pantheon arch map forbidden "<subject>" "<pattern>" [--arch-id <id>]');
            applyOverride(repoRoot, archId, {
                operation: "set_forbidden",
                subject,
                pathPatterns: [pattern],
                reason: "User marked as forbidden.",
            });
            console.log(`Set forbidden: ${subject} → ${pattern}`);
            return;
        }
        case "must-not-depend": {
            const subject = requirePositional(args, 1, 'Usage: pantheon arch map must-not-depend "<subject>" "<object>" [--arch-id <id>]');
            const object = requirePositional(args, 2, 'Usage: pantheon arch map must-not-depend "<subject>" "<object>" [--arch-id <id>]');
            applyOverride(repoRoot, archId, {
                operation: "set_must_not_depend_on",
                subject,
                object,
                reason: "User-defined dependency constraint.",
            });
            console.log(`Set must-not-depend: ${subject} → ${object}`);
            return;
        }
        case "external": {
            const subject = requirePositional(args, 1, 'Usage: pantheon arch map external "<subject>" [--arch-id <id>]');
            applyOverride(repoRoot, archId, {
                operation: "set_external",
                subject,
                reason: "User marked as external service.",
            });
            console.log(`Set external service: ${subject}`);
            return;
        }
        default:
            console.error("Usage:");
            console.error("  pantheon arch map accept <claim_id> [--arch-id <id>]");
            console.error("  pantheon arch map reject <claim_id> --reason \"...\" [--arch-id <id>]");
            console.error('  pantheon arch map set "<subject>" "<pattern>" [--arch-id <id>]');
            console.error('  pantheon arch map review-required "<subject>" "<pattern>" [--arch-id <id>]');
            console.error('  pantheon arch map forbidden "<subject>" "<pattern>" [--arch-id <id>]');
            console.error('  pantheon arch map must-not-depend "<subject>" "<object>" [--arch-id <id>]');
            console.error('  pantheon arch map external "<subject>" [--arch-id <id>]');
            process.exit(1);
    }
}
// ---------------------------------------------------------------------------
// arch accept [--arch-id <id>]
// ---------------------------------------------------------------------------
function cmdArchAccept(repoRoot, args) {
    const archId = resolveArchId(repoRoot, args);
    const paths = architectureRunPaths(repoRoot, archId);
    // Load all artifacts
    const claims = loadJsonArtifact(paths.claims, "claims");
    const evidence = loadJsonArtifact(paths.evidence, "evidence");
    const relations = loadJsonArtifact(paths.relations, "relations");
    const overrides = loadArchitectureOverrides(repoRoot, archId);
    const ingestRun = loadJsonArtifact(paths.ingestRun, "ingest run");
    const resolvedRelations = resolveOverrides(relations, overrides);
    const allClaimIds = claims.map(c => c.claim_id);
    // Build the contract
    const contract = buildArchitectureContract({
        archId,
        sourceDocumentHash: ingestRun.source_content_hash,
        revision: 1, // Start at revision 1 for MVP
        resolvedRelations,
        allClaimIds,
    });
    // Render
    const contractMd = renderArchitectureContract(contract);
    // Write to active contract location
    const rootPaths = architectureRootPaths(repoRoot);
    writeFileSync(rootPaths.activeContract, JSON.stringify(contract, null, 2));
    writeFileSync(rootPaths.activeContractMd, contractMd);
    writeFileSync(rootPaths.activeContractHash, contract.contract_hash);
    tryAppendGovernanceEvent(repoRoot, {
        schema_version: "pantheon_governance_event@0.1.0",
        event_id: `ev_${Date.now()}_arch_accept`,
        timestamp: new Date().toISOString(),
        source: "local_cli",
        event_type: "architecture_contract_accepted",
        target_type: "architecture",
        target_id: contract.architecture_contract_id,
    });
    console.log("Pantheon Architecture Contract Accepted\n");
    console.log(`  Architecture ID: ${archId}`);
    console.log(`  Contract ID: ${contract.architecture_contract_id}`);
    console.log(`  Accepted relations: ${contract.accepted_relations.length}`);
    console.log(`  Rejected claims: ${contract.rejected_claims.length}`);
    console.log(`  Constraints: ${contract.constraints.length}`);
    console.log(`  Contract hash: ${contract.contract_hash}`);
    console.log(`  Output: ${rootPaths.activeContract}`);
    console.log("");
    console.log("The accepted contract will now constrain future 'change' and 'repair' checks.");
}
// ---------------------------------------------------------------------------
// arch status
// ---------------------------------------------------------------------------
function cmdArchStatus(repoRoot) {
    const rootPaths = architectureRootPaths(repoRoot);
    console.log("Pantheon Architecture Status\n");
    if (!existsSync(rootPaths.activeContract)) {
        console.log("  No active architecture contract.");
        console.log("  Run 'pantheon arch ingest <path>' to begin.");
        return;
    }
    const contract = loadJsonArtifact(rootPaths.activeContract, "active contract");
    console.log(`  Contract ID: ${contract.architecture_contract_id}`);
    console.log(`  Source arch ID: ${contract.source_arch_id}`);
    console.log(`  Revision: ${contract.revision}`);
    console.log(`  Accepted relations: ${contract.accepted_relations.length}`);
    console.log(`  Rejected claims: ${contract.rejected_claims.length}`);
    console.log(`  Constraints: ${contract.constraints.length}`);
    console.log(`  Contract hash: ${contract.contract_hash}`);
    // Breakdown by constraint type
    const forbidden = contract.constraints.filter(c => c.constraint_type === "forbidden_path").length;
    const review = contract.constraints.filter(c => c.constraint_type === "review_required_path" || c.constraint_type === "external_boundary_review").length;
    const ownership = contract.constraints.filter(c => c.constraint_type === "allowed_path").length;
    const boundary = contract.constraints.filter(c => c.constraint_type === "must_not_touch_together" || c.constraint_type === "requires_scope_expansion").length;
    const advisory = contract.constraints.filter(c => c.constraint_tier === "advisory").length;
    console.log("");
    console.log("  Constraint breakdown:");
    console.log(`    Forbidden paths (blocking): ${forbidden}`);
    console.log(`    Review-required (review): ${review}`);
    console.log(`    Boundary rules (review): ${boundary}`);
    console.log(`    Ownership rules (info): ${ownership}`);
    if (advisory > 0) {
        console.log(`    Advisory rules (info): ${advisory}`);
    }
    console.log("");
    if (forbidden > 0 || review > 0) {
        console.log("  ✅ Architecture contract is active and enforcing constraints.");
    }
    else {
        console.log("  ⚠️ Architecture contract has no blocking/review constraints.");
    }
}
// ---------------------------------------------------------------------------
// arch check [--base <ref>]
// ---------------------------------------------------------------------------
function cmdArchCheck(repoRoot, baseRef) {
    const rootPaths = architectureRootPaths(repoRoot);
    console.log("Pantheon Architecture Check\n");
    if (!existsSync(rootPaths.activeContract)) {
        console.log("  No active architecture contract.");
        console.log("  Pass: No constraints to enforce.");
        process.exit(0);
    }
    const contract = loadJsonArtifact(rootPaths.activeContract, "active contract");
    const diff = readGitDiffSummary({ repoRoot, baseRef: baseRef ?? "" });
    if (diff.changed_files.length === 0) {
        console.log("  No changed files detected.");
        console.log("  Pass.");
        process.exit(0);
    }
    const changedPaths = diff.changed_files.map(f => f.path);
    const evaluation = evaluateArchitectureConstraints({
        contract,
        changedFiles: changedPaths,
        targetSubjects: [], // local check doesn't have a specific intent subject
        architectureContractModified: changedPaths.includes(".pantheon/architecture/architecture_contract.json"),
    });
    console.log(`  Evaluating ${changedPaths.length} changed files...`);
    const rendered = renderArchitectureFindings({
        findings: evaluation.findings,
        format: "plain",
        audience: "cli",
        contract_summary: {
            architecture_contract_id: contract.architecture_contract_id,
            revision: contract.revision,
        },
    });
    if (evaluation.findings.length > 0) {
        tryAppendGovernanceEvent(repoRoot, {
            schema_version: "pantheon_governance_event@0.1.0",
            event_id: `ev_${Date.now()}_arch_check`,
            timestamp: new Date().toISOString(),
            source: "local_cli",
            event_type: "architecture_constraint_triggered",
            target_type: "architecture",
            target_id: contract.architecture_contract_id,
            reasons: evaluation.findings.map(f => ({
                kind: f.severity === "blocking" ? "architecture_forbidden" :
                    f.severity === "review" ? "architecture_review_required" :
                        "architecture_dependency_boundary", // Mapping loosely
                action: f.severity === "blocking" ? "block_merge" :
                    f.severity === "review" ? "human_review" :
                        "continue",
            })),
            bucket_counts: {
                allowed: 0,
                review_required: rendered.review_count,
                forbidden: rendered.blocking_count,
                outside_scope: 0,
            }
        });
    }
    if (evaluation.findings.length === 0) {
        console.log("  Pass: No architecture constraints triggered.");
        process.exit(0);
    }
    console.log("");
    console.log(rendered.plain.split('\n').map(line => `  ${line}`).join('\n'));
    console.log("");
    if (rendered.blocking_count > 0) {
        console.log("  Fail: Architecture contract forbids this change.");
        process.exit(1);
    }
    if (rendered.review_count > 0) {
        console.log("  Review Required: This change touches architectural boundaries and requires human review.");
        // We exit 0 because it's a review requirement, not a fatal failure. The PR check will flag it for review.
        process.exit(0);
    }
    console.log("  Pass: Advisory constraints only.");
    process.exit(0);
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function resolveArchId(repoRoot, args) {
    const explicit = getFlag(args, "arch-id");
    if (explicit)
        return explicit;
    // Try to find the latest ingest run
    const rootPaths = architectureRootPaths(repoRoot);
    if (existsSync(rootPaths.activeContract)) {
        const contract = loadJsonArtifact(rootPaths.activeContract, "active contract");
        return contract.source_arch_id;
    }
    // Scan for any runs directory
    const { readdirSync } = require("node:fs");
    if (existsSync(rootPaths.runsDir)) {
        const dirs = readdirSync(rootPaths.runsDir);
        if (dirs.length === 1)
            return dirs[0];
        if (dirs.length > 1) {
            console.error("Multiple architecture runs found. Specify --arch-id:");
            for (const d of dirs) {
                console.error(`  --arch-id ${d}`);
            }
            process.exit(1);
        }
    }
    console.error("No architecture run found. Run 'pantheon arch ingest <path>' first.");
    process.exit(1);
}
function applyOverride(repoRoot, archId, input) {
    const override = {
        override_id: generateOverrideId(input.operation, input.subject, new Date().toISOString()),
        created_at: new Date().toISOString(),
        operation: input.operation,
        subject: input.subject,
        ...(input.object ? { object: input.object } : {}),
        ...(input.pathPatterns ? { path_patterns: input.pathPatterns } : {}),
        reason: input.reason,
        operator_id: "user",
    };
    appendArchitectureOverride(repoRoot, archId, override);
}
function loadJsonArtifact(path, label) {
    if (!existsSync(path)) {
        console.error(`Missing ${label} artifact: ${path}`);
        process.exit(1);
    }
    return JSON.parse(readFileSync(path, "utf-8"));
}
function printArchHelp() {
    console.log("Pantheon Architecture Governance\n");
    console.log("Usage:");
    console.log("  pantheon arch ingest <path>                  Ingest architecture document");
    console.log("  pantheon arch review [--arch-id <id>]        Show mapping review");
    console.log("  pantheon arch term list [--arch-id <id>]     List glossary terms");
    console.log('  pantheon arch term set "<t>" "<p>"           Set term → path mapping');
    console.log('  pantheon arch term alias "<t>" "<a>"         Add term alias');
    console.log('  pantheon arch term kind "<t>" <kind>         Set term entity kind');
    console.log("  pantheon arch map accept <claim_id>          Accept a claim mapping");
    console.log("  pantheon arch map reject <claim_id>          Reject a claim mapping");
    console.log('  pantheon arch map set "<s>" "<p>"            Set ownership mapping');
    console.log('  pantheon arch map review-required "<s>" "<p>"  Mark as review-required');
    console.log('  pantheon arch map forbidden "<s>" "<p>"      Mark as forbidden');
    console.log('  pantheon arch map must-not-depend "<s>" "<o>"  Set dependency constraint');
    console.log('  pantheon arch map external "<s>"             Mark as external service');
    console.log("  pantheon arch accept [--arch-id <id>]        Accept architecture contract");
    console.log("  pantheon arch status                         Show active contract status");
    console.log("  pantheon arch check [--base <ref>]           Verify local changes against contract");
    console.log("");
    console.log("Workflow:");
    console.log("  1. pantheon arch ingest docs/architecture.md");
    console.log('  2. pantheon arch term set "Billing" "src/billing/**"');
    console.log("  3. pantheon arch map accept <claim_id>");
    console.log("  4. pantheon arch accept");
    console.log("  5. pantheon arch status");
}
//# sourceMappingURL=cmdArch.js.map