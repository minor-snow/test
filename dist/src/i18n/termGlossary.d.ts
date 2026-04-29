/**
 * P15.2 — Term Glossary
 *
 * Canonical bilingual glossary for Pantheon system terms.
 * Used by cockpit i18n and CLI report rendering.
 *
 * Rule: Chinese display always preserves the English term in parentheses.
 * Technical IDs (node_id, block_id, file_path, symbol_name) are NEVER translated.
 */
export interface LocalizedTerm {
    /** Machine-stable identifier (matches node kind, layer name, or system concept) */
    id: string;
    /** English display */
    en: string;
    /** Chinese display — always includes English in parentheses */
    zhCN: string;
    /** If true, this term's id appears directly in node_ids and must never be translated */
    preserveId?: boolean;
}
export declare const TERM_GLOSSARY: LocalizedTerm[];
/** Lookup a term by id. Returns the term or undefined. */
export declare function lookupTerm(id: string): LocalizedTerm | undefined;
/** Get display string for a term in the given locale. Falls back to English. */
export declare function getTermDisplay(id: string, locale: "en" | "zh-CN"): string;
/** Check if a term's id should be preserved (never translated when appearing in technical context). */
export declare function isPreservedId(id: string): boolean;
