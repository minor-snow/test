/**
 * P20a: Sensitive Path Detector
 *
 * Detects sensitive paths by keyword matching in path segments.
 * No content inspection — path-only analysis.
 */
import { pathContainsKeyword } from "./pathKeywordMatcher.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const SENSITIVE_KEYWORDS = [
    { keyword: "auth", reason: "auth_keyword" },
    { keyword: "payment", reason: "payment_keyword" },
    { keyword: "billing", reason: "payment_keyword" },
    { keyword: "admin", reason: "admin_keyword" },
    { keyword: "secret", reason: "secret_keyword" },
    { keyword: "secrets", reason: "secret_keyword" },
    { keyword: "infra", reason: "infra_keyword" },
    { keyword: "migration", reason: "migration_keyword" },
    { keyword: "migrations", reason: "migration_keyword" },
    { keyword: "prod", reason: "config_keyword" },
    { keyword: "production", reason: "config_keyword" },
];
/**
 * Detect sensitive paths by keyword matching in path segments.
 */
export function detectSensitivePaths(files) {
    const results = [];
    const seen = new Set();
    for (const file of files) {
        const segments = file.path.toLowerCase().split("/");
        for (const { keyword, reason } of SENSITIVE_KEYWORDS) {
            if (pathContainsKeyword(file.path, keyword)) {
                const key = `${file.path}:${reason}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({
                        path: file.path,
                        reason,
                        review_required: true,
                        evidence: [{ type: "keyword", source_path: file.path, value: `Path contains sensitive segment: ${keyword}` }],
                    });
                }
            }
        }
    }
    return results;
}
//# sourceMappingURL=sensitivePathDetector.js.map