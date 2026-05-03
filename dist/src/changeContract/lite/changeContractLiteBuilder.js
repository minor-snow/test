/**
 * P20a: ChangeContract Lite Builder
 *
 * Builds a Lite contract from RepoObservations + user-provided changed files.
 * Decision rules (correction applied):
 *   - path_invalid / excluded → requires_reverse_issue
 *   - not_observed / sensitive / owner-hinted / dirty / no-test-mapping → requires_review
 *   - otherwise → pass
 *
 * P20a does NOT produce "fail" for missing test mappings.
 */
import { shortStableId } from "../../deterministic.js";
import { isRepoRelativePath, normalizeRepoRelativePath } from "../../repoObservation/pathUtils.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function buildChangeContractLite(input) {
    const { observations } = input;
    // 1. Classify each changed file
    const fileStatuses = classifyChangedFiles(input.changedFiles, observations);
    // 2. Gather scope information
    const observedPaths = new Set(observations.observations.files.map(f => f.path));
    const sensitivePaths = observations.observations.sensitive_paths;
    const testMappings = observations.observations.test_mappings;
    const ownerHints = observations.observations.owner_hints;
    const touchedBuckets = new Set();
    const touchedSensitive = [];
    const sensitivePathDetails = [];
    const relatedTests = [];
    const touchedOwners = [];
    const unknowns = [];
    const undeclaredPackageDetails = [];
    const unmappedSrcDetails = [];
    for (const fs of fileStatuses) {
        if (fs.status === "observed") {
            const file = observations.observations.files.find(f => f.path === fs.path);
            if (file)
                touchedBuckets.add(file.bucket);
            // Sensitive?
            const sensitive = sensitivePaths.filter(s => s.path === fs.path);
            for (const s of sensitive) {
                touchedSensitive.push(`${s.path} (${s.reason})`);
                sensitivePathDetails.push({ path: s.path, reason: s.reason });
            }
            // Test mapping?
            const mapped = testMappings.filter(m => m.source_path === fs.path);
            for (const m of mapped) {
                relatedTests.push(m.test_path);
            }
            // Owner hint?
            for (const oh of ownerHints) {
                if (oh.match_status === "simple_pattern" && fs.path.startsWith(oh.path_pattern.replace(/\/$/, ""))) {
                    touchedOwners.push(`${oh.path_pattern} → ${oh.owners.join(", ")}`);
                }
            }
        }
        else if (fs.status === "not_observed") {
            unknowns.push(fs.path);
        }
    }
    // 3. Derive decision
    const decision = deriveDecision(fileStatuses, observations, touchedSensitive, relatedTests, touchedOwners, unknowns, unmappedSrcDetails, undeclaredPackageDetails);
    return {
        schema_version: "change_contract_lite.v1",
        contract_id: shortStableId("ccl", {
            observation_hash: observations.meta.observation_hash,
            changed_files: [...input.changedFiles].sort((a, b) => a.localeCompare(b)),
            intent: input.intent ?? null,
            repo_state: observations.repo.repo_state,
        }),
        mode: "bootstrap",
        created_at: new Date().toISOString(),
        ...(input.intent ? { intent: input.intent } : {}),
        refs: {
            repo_observations_hash: observations.meta.observation_hash,
            head_commit_hash: observations.repo.head_commit_hash,
            repo_state: observations.repo.repo_state,
            has_uncommitted_changes: observations.repo.has_uncommitted_changes,
        },
        changed_files: input.changedFiles,
        observed_scope: {
            touched_buckets: [...touchedBuckets],
            touched_sensitive_paths: touchedSensitive,
            related_tests: relatedTests,
            owner_hints: touchedOwners,
            unknowns,
            changed_file_statuses: fileStatuses,
            sensitive_path_details: sensitivePathDetails,
            undeclared_package_details: undeclaredPackageDetails,
            unmapped_src_details: unmappedSrcDetails,
        },
        decision,
    };
}
// ---------------------------------------------------------------------------
// Changed file classification
// ---------------------------------------------------------------------------
function classifyChangedFiles(changedFiles, observations) {
    const observedPaths = new Set(observations.observations.files.map(f => f.path));
    const excludedPaths = new Set(observations.excluded.map(e => e.path));
    const excludedDirs = new Set(observations.limits.excluded_dirs.map(d => d.toLowerCase()));
    return changedFiles.map(raw => {
        // Path validity check
        if (!raw || raw.trim().length === 0) {
            return { path: raw, status: "path_invalid", reason: "Empty path" };
        }
        let normalized;
        try {
            normalized = normalizeRepoRelativePath(raw);
        }
        catch {
            return { path: raw, status: "path_invalid", reason: "Path is absolute or escapes repo" };
        }
        if (!isRepoRelativePath(normalized)) {
            return { path: raw, status: "path_invalid", reason: "Path is not valid repo-relative" };
        }
        // Check excluded
        if (excludedPaths.has(normalized)) {
            return { path: normalized, status: "excluded", reason: "Path is excluded from observation scope" };
        }
        // Check if inside excluded dir
        const firstSegment = normalized.split("/")[0].toLowerCase();
        if (excludedDirs.has(firstSegment)) {
            return { path: normalized, status: "excluded", reason: `Path is inside excluded directory: ${firstSegment}` };
        }
        // Check observed
        if (observedPaths.has(normalized)) {
            return { path: normalized, status: "observed", reason: "File found in observations" };
        }
        return { path: normalized, status: "not_observed", reason: "File not found in observations; manual verification recommended" };
    });
}
// ---------------------------------------------------------------------------
// Decision derivation
// ---------------------------------------------------------------------------
function deriveDecision(fileStatuses, observations, touchedSensitive, relatedTests, touchedOwners, unknowns, unmappedSrcDetails, undeclaredPackageDetails) {
    const reasons = [];
    const actions = [];
    let verdict = "pass";
    // Priority: requires_reverse_issue > requires_review > pass
    // (fail reserved for validator/malformed, not used by P20a decision logic)
    // requires_reverse_issue conditions
    const invalidFiles = fileStatuses.filter(f => f.status === "path_invalid");
    const excludedFiles = fileStatuses.filter(f => f.status === "excluded");
    if (invalidFiles.length > 0) {
        verdict = "requires_reverse_issue";
        for (const f of invalidFiles) {
            reasons.push(`Changed file path invalid: ${f.path} — ${f.reason}`);
            actions.push(`Fix or remove invalid changed file path: ${f.path}`);
        }
    }
    if (excludedFiles.length > 0) {
        verdict = "requires_reverse_issue";
        for (const f of excludedFiles) {
            reasons.push(`Changed file is excluded from observation scope: ${f.path}`);
            actions.push(`Verify excluded changed file: ${f.path}`);
        }
    }
    // requires_review conditions (only escalate, never downgrade)
    if (verdict !== "requires_reverse_issue") {
        const needsReview = [];
        // not_observed files
        const notObserved = fileStatuses.filter(f => f.status === "not_observed");
        if (notObserved.length > 0) {
            for (const f of notObserved) {
                needsReview.push(`Changed file not observed: ${f.path}`);
                actions.push(`Verify unobserved changed file: ${f.path}`);
            }
        }
        // Sensitive paths
        if (touchedSensitive.length > 0) {
            needsReview.push(`Touches sensitive paths: ${touchedSensitive.join(", ")}`);
            actions.push("Review changes to sensitive paths");
        }
        // Owner-hinted paths
        if (touchedOwners.length > 0) {
            needsReview.push(`Touches owner-hinted paths: ${touchedOwners.join(", ")}`);
            actions.push("Notify code owners for review");
        }
        // Dirty/working-tree-only repo state
        if (observations.repo.repo_state === "git_dirty") {
            needsReview.push("Repository has uncommitted changes");
            actions.push("Commit or stash uncommitted changes before proceeding");
        }
        if (observations.repo.repo_state === "working_tree_only") {
            needsReview.push("No Git repository detected; observations are working-tree-only");
            actions.push("Consider initializing a Git repository for full audit trail");
        }
        // Missing test mapping for src files (CORRECTION: requires_review, not fail)
        const srcFiles = fileStatuses.filter(f => f.status === "observed");
        for (const f of srcFiles) {
            const file = observations.observations.files.find(of => of.path === f.path);
            if (file && file.bucket === "src") {
                const hasTest = observations.observations.test_mappings.some(m => m.source_path === f.path);
                if (!hasTest) {
                    needsReview.push(`No test mapping found by path convention for: ${f.path}; manual verification recommended`);
                    actions.push(`Verify test coverage for: ${f.path}`);
                    unmappedSrcDetails.push({ path: f.path });
                }
            }
        }
        // Undeclared package imports in changed files (P20a.2: scoped to changed file only)
        const observedChangedPaths = new Set(fileStatuses.filter(f => f.status === "observed").map(f => f.path));
        const undeclaredEdges = observations.observations.import_edges.filter(e => e.resolution_status === "undeclared_package" && observedChangedPaths.has(e.from_file));
        if (undeclaredEdges.length > 0) {
            const uniquePkgs = [...new Set(undeclaredEdges.map(e => e.raw_specifier))];
            needsReview.push(`Changed file(s) import undeclared package(s): ${uniquePkgs.join(", ")}`);
            actions.push(`Add undeclared package(s) to package.json or review imports: ${uniquePkgs.join(", ")}`);
            for (const edge of undeclaredEdges) {
                undeclaredPackageDetails.push({
                    file_path: edge.from_file,
                    package_name: edge.raw_specifier,
                });
            }
        }
        if (needsReview.length > 0) {
            verdict = "requires_review";
            reasons.push(...needsReview);
        }
    }
    return { verdict, reasons, required_actions: actions };
}
//# sourceMappingURL=changeContractLiteBuilder.js.map