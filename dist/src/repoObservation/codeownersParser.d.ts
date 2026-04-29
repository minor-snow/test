/**
 * P20a: CODEOWNERS Parser
 *
 * Conservative CODEOWNERS parsing.
 * Supports root, .github/, docs/ locations.
 * Complex patterns marked as unresolved.
 */
import type { OwnerHint } from "./types.js";
export declare function parseCodeowners(repoRoot: string): {
    owner_hints: OwnerHint[];
    unresolved_patterns: string[];
};
