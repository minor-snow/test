/**
 * P30: Architecture Claim Extractor
 *
 * Three-source claim extraction engine (P30-0.5 evolution):
 *
 *   Source 1: Structured hint blocks (`<!-- pantheon-arch ... -->`)
 *             → Highest confidence, deterministic, no ambiguity
 *
 *   Source 2: Glossary-assisted matching
 *             → Term + alias match in text produces claims even
 *               without standard trigger words
 *
 *   Source 3: Phrase rules (English + Chinese)
 *             → Fallback pattern matching for free-form prose
 *
 * Confidence is evidence-driven, not phrase-specificity-driven:
 *   High:   relation trigger + glossary term + path evidence
 *           OR structured hint block
 *   Medium: glossary term + nearby path evidence
 *           OR relation trigger + known module heading
 *   Low:    relation trigger only
 *           OR glossary term only
 *
 * No LLM. Deterministic only.
 *
 * ref: P30
 */
import type { ArchitectureClaim } from "./types.js";
import type { MarkdownSection } from "./markdownArchitectureParser.js";
import type { ArchitectureGlossary } from "./architectureGlossary.js";
/**
 * Extract architecture claims from parsed markdown sections.
 *
 * Three-source extraction priority:
 *   1. Structured hint blocks (deterministic, highest confidence)
 *   2. Glossary-assisted text matching (term/alias presence)
 *   3. Phrase rules (English + Chinese fallback)
 *
 * Claims are deduplicated by (subject, relation, object) triple.
 */
export declare function extractArchitectureClaims(archId: string, sections: readonly MarkdownSection[], glossary?: ArchitectureGlossary): ArchitectureClaim[];
