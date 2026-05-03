/**
 * P21: Diff Verifier
 *
 * Checks whether the actual diff stayed inside an AgentScopeLite.
 *
 * It intentionally does not recompute the full ChangeContractLite decision.
 * Keep review-required semantics aligned with:
 *   src/changeContract/lite/changeContractLiteBuilder.ts
 *
 * Source of truth:
 *   - ChangeContractLite builder decides initial bootstrap risk.
 *   - AgentScopeLite carries that risk into agent-facing scope.
 *   - P21 verifier checks actual diff against that scope.
 *
 * For full scope diff validation, see:
 *   src/scopeDiff/scopeDiffValidator.ts (P18)
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function verifyDiffAgainstScope(input) {
    const { diff, scope } = input;
    const fileStatuses = [];
    const reasons = [];
    const requiredActions = [];
    let hasOutsideScope = false;
    let hasForbidden = false;
    let hasReviewRequired = false;
    const allowedSet = new Set(scope.allowed_files);
    const requiredTestSet = new Set(scope.required_tests);
    const reviewPaths = new Set(scope.review_required_files.map(r => r.path));
    for (const file of diff.changed_files) {
        const path = file.path;
        // Check forbidden patterns
        const matchedForbidden = matchForbiddenPattern(path, scope.forbidden_patterns);
        if (matchedForbidden) {
            hasForbidden = true;
            fileStatuses.push({
                path,
                status: "forbidden",
                reasons: [`Matches forbidden pattern: ${matchedForbidden.pattern} — ${matchedForbidden.reason}`],
            });
            reasons.push(`\`${path}\` matches forbidden pattern \`${matchedForbidden.pattern}\`.`);
            continue;
        }
        // Check allowed or review-required
        if (allowedSet.has(path) || requiredTestSet.has(path) || reviewPaths.has(path)) {
            // Check if also review-required
            if (reviewPaths.has(path)) {
                hasReviewRequired = true;
                const reviewFile = scope.review_required_files.find(r => r.path === path);
                fileStatuses.push({
                    path,
                    status: "review_required",
                    reasons: reviewFile ? [...reviewFile.reasons] : ["Review required."],
                });
                reasons.push(`\`${path}\` requires review.`);
            }
            else {
                fileStatuses.push({ path, status: "allowed", reasons: ["Within authorized scope."] });
            }
            continue;
        }
        // Outside scope
        hasOutsideScope = true;
        fileStatuses.push({
            path,
            status: "outside_scope",
            reasons: ["File is not in the authorized scope."],
        });
        reasons.push(`\`${path}\` is outside the authorized scope.`);
    }
    // Determine verdict
    let verdict;
    if (hasForbidden || hasOutsideScope) {
        verdict = "requires_reverse_issue";
        if (hasOutsideScope) {
            requiredActions.push("Create a Pantheon reverse issue to expand scope, or revert out-of-scope changes.");
        }
        if (hasForbidden) {
            requiredActions.push("Revert changes to forbidden files. They are managed by Pantheon.");
        }
    }
    else if (hasReviewRequired) {
        verdict = "requires_review";
        requiredActions.push("Review flagged files before merging.");
    }
    else {
        verdict = "pass";
    }
    return {
        schema_version: "diff_verification_result.v1",
        verified_at: new Date().toISOString(),
        source_scope_id: scope.scope_id,
        source_contract_id: scope.source_contract_id,
        verdict,
        reasons,
        required_actions: requiredActions,
        file_statuses: fileStatuses,
    };
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function matchForbiddenPattern(path, patterns) {
    for (const fp of patterns) {
        // Simple glob: "dir/**" matches any file under dir/
        if (fp.pattern.endsWith("/**")) {
            const prefix = fp.pattern.slice(0, -3);
            if (path.startsWith(prefix + "/") || path === prefix) {
                return fp;
            }
        }
        // Exact match
        if (path === fp.pattern) {
            return fp;
        }
    }
    return null;
}
//# sourceMappingURL=diffVerifier.js.map