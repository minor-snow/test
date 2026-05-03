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
import type { ArchitectureGlossary, ArchitectureGlossaryEntry, ArchitectureGlossaryEntryKind, ArchitectureGlossaryEntrySource, ArchitectureGlossaryEntryStatus, GlossaryTermMatch } from "./architectureGlossary.js";
import type { RepoObservations } from "../repoObservation/types.js";
export declare function loadArchitectureGlossary(repoRoot: string, archId: string): ArchitectureGlossary;
export declare function saveArchitectureGlossary(repoRoot: string, archId: string, glossary: ArchitectureGlossary): void;
/**
 * Set a term → path mapping. Creates or updates.
 */
export declare function setGlossaryTerm(glossary: ArchitectureGlossary, term: string, pathPatterns: readonly string[], options?: {
    kind?: ArchitectureGlossaryEntryKind;
    source?: ArchitectureGlossaryEntrySource;
    aliases?: readonly string[];
    evidencePaths?: readonly string[];
}): ArchitectureGlossary;
/**
 * Add aliases to an existing term.
 */
export declare function addGlossaryAlias(glossary: ArchitectureGlossary, term: string, aliases: readonly string[]): ArchitectureGlossary;
/**
 * Set entity kind for a term.
 */
export declare function setGlossaryKind(glossary: ArchitectureGlossary, term: string, kind: ArchitectureGlossaryEntryKind): ArchitectureGlossary;
/**
 * Mark a term as external service.
 */
export declare function setGlossaryExternal(glossary: ArchitectureGlossary, term: string): ArchitectureGlossary;
/**
 * Accept or reject a glossary candidate.
 */
export declare function setGlossaryStatus(glossary: ArchitectureGlossary, termId: string, status: ArchitectureGlossaryEntryStatus): ArchitectureGlossary;
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
export declare function deriveGlossaryCandidates(observations: RepoObservations, existingGlossary: ArchitectureGlossary): ArchitectureGlossary;
/**
 * Search for glossary terms in text.
 *
 * Returns all matches sorted by match quality (exact > alias > partial).
 * Only accepted entries are searched by default.
 */
export declare function findGlossaryMatches(text: string, glossary: ArchitectureGlossary, options?: {
    includeUnaccepted?: boolean;
}): GlossaryTermMatch[];
/**
 * Get the accepted glossary entries only.
 * These are the entries that participate in contract generation.
 */
export declare function getAcceptedGlossaryEntries(glossary: ArchitectureGlossary): ArchitectureGlossaryEntry[];
/**
 * Get candidate entries needing user review.
 */
export declare function getGlossaryCandidates(glossary: ArchitectureGlossary): ArchitectureGlossaryEntry[];
