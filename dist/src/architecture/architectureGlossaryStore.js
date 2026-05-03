/**
 * P30-0.5: Architecture Glossary Store
 *
 * Persistence and query layer for the architecture glossary.
 *
 * Operations:
 * - Load/save glossary JSON
 * - Set/update term → path mapping
 * - Add/remove aliases
 * - Set entity kind
 * - Accept/reject candidates
 * - Auto-generate repo-derived candidates (Layer B)
 * - Search by text (exact, alias, partial)
 *
 * ref: P30
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { architectureRunPaths, ensureArchitectureRunDir } from "./architectureArtifactLayout.js";
import { stableHash } from "../deterministic.js";
// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------
function generateTermId(term) {
    const normalized = term
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
        .replace(/^_|_$/g, "");
    return `term_${normalized}`;
}
// ---------------------------------------------------------------------------
// Glossary persistence
// ---------------------------------------------------------------------------
export function loadArchitectureGlossary(repoRoot, archId) {
    const paths = architectureRunPaths(repoRoot, archId);
    const glossaryPath = paths.dir + "/architecture_glossary.json";
    if (!existsSync(glossaryPath)) {
        return {
            schema_version: "architecture_glossary@0.1.0",
            arch_id: archId,
            entries: [],
            glossary_hash: computeGlossaryHash([]),
        };
    }
    const content = readFileSync(glossaryPath, "utf-8");
    return JSON.parse(content);
}
export function saveArchitectureGlossary(repoRoot, archId, glossary) {
    ensureArchitectureRunDir(repoRoot, archId);
    const paths = architectureRunPaths(repoRoot, archId);
    const glossaryPath = paths.dir + "/architecture_glossary.json";
    const withHash = {
        ...glossary,
        glossary_hash: computeGlossaryHash(glossary.entries),
    };
    writeFileSync(glossaryPath, JSON.stringify(withHash, null, 2), "utf-8");
}
function computeGlossaryHash(entries) {
    const semantic = entries
        .filter(e => e.status === "accepted")
        .map(e => ({
        term: e.term,
        aliases: [...e.aliases].sort(),
        kind: e.kind,
        path_patterns: [...e.path_patterns].sort(),
    }))
        .sort((a, b) => a.term.localeCompare(b.term));
    return stableHash(semantic);
}
// ---------------------------------------------------------------------------
// Term CRUD operations
// ---------------------------------------------------------------------------
/**
 * Set a term → path mapping. Creates or updates.
 */
export function setGlossaryTerm(glossary, term, pathPatterns, options) {
    const termId = generateTermId(term);
    const existing = glossary.entries.find(e => e.term_id === termId);
    const entry = existing
        ? {
            ...existing,
            path_patterns: pathPatterns,
            kind: options?.kind ?? existing.kind,
            source: options?.source ?? "user_override",
            aliases: options?.aliases
                ? [...new Set([...existing.aliases, ...options.aliases])]
                : existing.aliases,
            evidence_paths: options?.evidencePaths ?? existing.evidence_paths,
            status: "accepted",
            confidence: "high",
        }
        : {
            term_id: termId,
            term,
            aliases: options?.aliases ? [...options.aliases] : [],
            kind: options?.kind ?? "module",
            path_patterns: [...pathPatterns],
            evidence_paths: options?.evidencePaths ?? [],
            source: options?.source ?? "user_override",
            confidence: "high",
            status: "accepted",
        };
    const entries = existing
        ? glossary.entries.map(e => (e.term_id === termId ? entry : e))
        : [...glossary.entries, entry];
    return {
        ...glossary,
        entries,
        glossary_hash: computeGlossaryHash(entries),
    };
}
/**
 * Add aliases to an existing term.
 */
export function addGlossaryAlias(glossary, term, aliases) {
    const termId = generateTermId(term);
    const existing = glossary.entries.find(e => e.term_id === termId);
    if (!existing) {
        // Create a new entry with just the aliases
        return setGlossaryTerm(glossary, term, [], { aliases });
    }
    const updated = {
        ...existing,
        aliases: [...new Set([...existing.aliases, ...aliases])],
    };
    return {
        ...glossary,
        entries: glossary.entries.map(e => (e.term_id === termId ? updated : e)),
        glossary_hash: computeGlossaryHash(glossary.entries.map(e => (e.term_id === termId ? updated : e))),
    };
}
/**
 * Set entity kind for a term.
 */
export function setGlossaryKind(glossary, term, kind) {
    const termId = generateTermId(term);
    const existing = glossary.entries.find(e => e.term_id === termId);
    if (!existing) {
        return setGlossaryTerm(glossary, term, [], { kind });
    }
    const updated = { ...existing, kind };
    return {
        ...glossary,
        entries: glossary.entries.map(e => (e.term_id === termId ? updated : e)),
        glossary_hash: computeGlossaryHash(glossary.entries.map(e => (e.term_id === termId ? updated : e))),
    };
}
/**
 * Mark a term as external service.
 */
export function setGlossaryExternal(glossary, term) {
    return setGlossaryTerm(glossary, term, [], { kind: "external_service" });
}
/**
 * Accept or reject a glossary candidate.
 */
export function setGlossaryStatus(glossary, termId, status) {
    const existing = glossary.entries.find(e => e.term_id === termId);
    if (!existing)
        return glossary;
    const updated = {
        ...existing,
        status,
        confidence: status === "accepted" ? "high" : existing.confidence,
    };
    return {
        ...glossary,
        entries: glossary.entries.map(e => (e.term_id === termId ? updated : e)),
        glossary_hash: computeGlossaryHash(glossary.entries.map(e => (e.term_id === termId ? updated : e))),
    };
}
// ---------------------------------------------------------------------------
// Layer B: Repo-derived term candidates
// ---------------------------------------------------------------------------
/**
 * Auto-generate glossary candidates from repo observations.
 *
 * Extracts from:
 * - Top-level src/ directories → module candidates
 * - Package names → package candidates
 * - Known config files → infrastructure candidates
 *
 * All candidates start as status: "candidate" — they don't enter
 * the contract until explicitly accepted.
 */
export function deriveGlossaryCandidates(observations, existingGlossary) {
    const existingTermIds = new Set(existingGlossary.entries.map(e => e.term_id));
    const newEntries = [];
    // Extract src/<name>/ directories as module candidates
    const srcDirs = new Set();
    for (const file of observations.observations.files) {
        const match = file.path.match(/^src\/([^/]+)\//);
        if (match)
            srcDirs.add(match[1]);
    }
    for (const dir of srcDirs) {
        const termId = generateTermId(dir);
        if (existingTermIds.has(termId))
            continue;
        const filesInDir = observations.observations.files
            .filter(f => f.path.startsWith(`src/${dir}/`))
            .map(f => f.path);
        newEntries.push({
            term_id: termId,
            term: dir,
            aliases: [],
            kind: "module",
            path_patterns: [`src/${dir}/**`],
            evidence_paths: filesInDir.slice(0, 5), // keep evidence compact
            source: "repo_observation",
            confidence: "low",
            status: "candidate",
        });
    }
    // Extract package names
    for (const manifest of observations.observations.package_manifests) {
        if (manifest.package_name) {
            const termId = generateTermId(manifest.package_name);
            if (existingTermIds.has(termId))
                continue;
            const dir = manifest.package_json_path.replace(/\/package\.json$/, "");
            newEntries.push({
                term_id: termId,
                term: manifest.package_name,
                aliases: [],
                kind: "package",
                path_patterns: dir ? [`${dir}/**`] : [],
                evidence_paths: [manifest.package_json_path],
                source: "repo_observation",
                confidence: "low",
                status: "candidate",
            });
        }
    }
    // Extract packages/<name>/ directories as package candidates
    const pkgDirs = new Set();
    for (const file of observations.observations.files) {
        const match = file.path.match(/^packages\/([^/]+)\//);
        if (match)
            pkgDirs.add(match[1]);
    }
    for (const dir of pkgDirs) {
        const termId = generateTermId(dir);
        if (existingTermIds.has(termId))
            continue;
        newEntries.push({
            term_id: termId,
            term: dir,
            aliases: [],
            kind: "package",
            path_patterns: [`packages/${dir}/**`],
            evidence_paths: [],
            source: "repo_observation",
            confidence: "low",
            status: "candidate",
        });
    }
    if (newEntries.length === 0)
        return existingGlossary;
    const allEntries = [...existingGlossary.entries, ...newEntries];
    return {
        ...existingGlossary,
        entries: allEntries,
        glossary_hash: computeGlossaryHash(allEntries),
    };
}
// ---------------------------------------------------------------------------
// Search / matching
// ---------------------------------------------------------------------------
/**
 * Search for glossary terms in text.
 *
 * Returns all matches sorted by match quality (exact > alias > partial).
 * Only accepted entries are searched by default.
 */
export function findGlossaryMatches(text, glossary, options) {
    const matches = [];
    const lowerText = text.toLowerCase();
    const includeUnaccepted = options?.includeUnaccepted ?? false;
    for (const entry of glossary.entries) {
        if (!includeUnaccepted && entry.status !== "accepted")
            continue;
        // Exact term match
        if (lowerText.includes(entry.term.toLowerCase())) {
            matches.push({
                entry,
                matched_text: entry.term,
                match_type: "exact",
            });
            continue;
        }
        // Alias match
        let aliasMatched = false;
        for (const alias of entry.aliases) {
            if (lowerText.includes(alias.toLowerCase())) {
                matches.push({
                    entry,
                    matched_text: alias,
                    match_type: "alias",
                });
                aliasMatched = true;
                break;
            }
        }
        if (aliasMatched)
            continue;
        // Partial match (term words appear in text)
        const termWords = entry.term
            .toLowerCase()
            .split(/[\s_-]+/)
            .filter(w => w.length >= 3);
        if (termWords.length >= 2) {
            const matchCount = termWords.filter(w => lowerText.includes(w)).length;
            if (matchCount >= Math.ceil(termWords.length * 0.7)) {
                matches.push({
                    entry,
                    matched_text: entry.term,
                    match_type: "partial",
                });
            }
        }
    }
    // Sort by match quality: exact > alias > partial
    const matchOrder = { exact: 0, alias: 1, partial: 2 };
    matches.sort((a, b) => matchOrder[a.match_type] - matchOrder[b.match_type]);
    return matches;
}
/**
 * Get the accepted glossary entries only.
 * These are the entries that participate in contract generation.
 */
export function getAcceptedGlossaryEntries(glossary) {
    return glossary.entries.filter(e => e.status === "accepted");
}
/**
 * Get candidate entries needing user review.
 */
export function getGlossaryCandidates(glossary) {
    return glossary.entries.filter(e => e.status === "candidate");
}
//# sourceMappingURL=architectureGlossaryStore.js.map