/**
 * P20a: File Classification
 *
 * Classifies files by path into buckets and languages.
 * Uses only path-based rules — no content inspection.
 */
import type { FileBucket, FileLanguage } from "./types.js";
/**
 * Classify a repo-relative path into a bucket.
 */
export declare function classifyFile(path: string): FileBucket;
/**
 * Detect the language of a file by its extension.
 */
export declare function detectLanguage(path: string): FileLanguage;
