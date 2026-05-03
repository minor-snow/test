/**
 * P20a: CODEOWNERS Parser
 *
 * Conservative CODEOWNERS parsing.
 * Supports root, .github/, docs/ locations.
 * Complex patterns marked as unresolved.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function parseCodeowners(repoRoot) {
    const hints = [];
    const unresolved = [];
    const locations = [
        join(repoRoot, "CODEOWNERS"),
        join(repoRoot, ".github", "CODEOWNERS"),
        join(repoRoot, "docs", "CODEOWNERS"),
    ];
    for (const loc of locations) {
        if (!existsSync(loc))
            continue;
        const content = readFileSync(loc, "utf-8");
        const lines = content.split(/\r?\n/);
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith("#"))
                continue;
            const parts = line.split(/\s+/);
            if (parts.length < 2)
                continue;
            const pattern = parts[0];
            const owners = parts.slice(1).filter(p => p.startsWith("@"));
            if (owners.length === 0)
                continue;
            const source = loc.includes(".github")
                ? "CODEOWNERS:.github"
                : loc.includes("docs")
                    ? "CODEOWNERS:docs"
                    : "CODEOWNERS";
            const expandedPatterns = expandBracePatterns(pattern);
            for (const expandedPattern of expandedPatterns) {
                const isComplex = isComplexPattern(expandedPattern);
                if (isComplex) {
                    unresolved.push(expandedPattern);
                }
                hints.push({
                    path_pattern: expandedPattern,
                    owners,
                    source,
                    match_status: isComplex ? "unresolved_complex_pattern" : "simple_pattern",
                    evidence: [{ type: "codeowners", source_path: loc.replace(repoRoot, "").replace(/\\/g, "/").replace(/^\//, ""), value: line }],
                });
            }
        }
    }
    return { owner_hints: hints, unresolved_patterns: unresolved };
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
/**
 * Determine if a CODEOWNERS pattern is "complex" and cannot be
 * confidently interpreted by simple prefix matching.
 *
 * Complex patterns include: **, *, ?, [, !
 * Simple patterns: path/ or path/file
 */
function isComplexPattern(pattern) {
    // Double star glob
    if (pattern.includes("**"))
        return true;
    // Single star or question mark wildcard
    if (pattern.includes("*") || pattern.includes("?"))
        return true;
    // Character class
    if (pattern.includes("["))
        return true;
    // Negation
    if (pattern.startsWith("!"))
        return true;
    return false;
}
function expandBracePatterns(pattern) {
    const match = /\{([^{}]+)\}/.exec(pattern);
    if (!match || match.index === undefined) {
        return [pattern];
    }
    const before = pattern.slice(0, match.index);
    const after = pattern.slice(match.index + match[0].length);
    const options = match[1]
        .split(",")
        .map(option => option.trim())
        .filter(option => option.length > 0);
    if (options.length === 0) {
        return [pattern];
    }
    return options.flatMap(option => expandBracePatterns(`${before}${option}${after}`));
}
//# sourceMappingURL=codeownersParser.js.map