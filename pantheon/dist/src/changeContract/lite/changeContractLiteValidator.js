/**
 * P20a: ChangeContract Lite Validator
 *
 * Validates Lite contract structural integrity.
 * Rejects any lifecycle_status, result_events, or full ChangeContract fields.
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function validateChangeContractLite(contract) {
    const errors = [];
    const warnings = [];
    // Schema version
    if (contract.schema_version !== "change_contract_lite.v1") {
        errors.push(`Invalid schema_version: ${contract.schema_version}`);
    }
    // Mode
    if (contract.mode !== "bootstrap") {
        errors.push(`Invalid mode: ${contract.mode}; must be 'bootstrap'`);
    }
    // Contract ID
    if (!contract.contract_id) {
        errors.push("Missing contract_id");
    }
    // Created at
    if (!contract.created_at) {
        errors.push("Missing created_at");
    }
    // Refs
    if (!contract.refs.repo_observations_hash) {
        errors.push("Missing refs.repo_observations_hash");
    }
    const validStates = ["git_clean", "git_dirty", "working_tree_only"];
    if (!validStates.includes(contract.refs.repo_state)) {
        errors.push(`Invalid refs.repo_state: ${contract.refs.repo_state}`);
    }
    if (!("head_commit_hash" in contract.refs)) {
        errors.push("Missing refs.head_commit_hash field");
    }
    if (!("has_uncommitted_changes" in contract.refs)) {
        errors.push("Missing refs.has_uncommitted_changes field");
    }
    // Changed file statuses coverage
    const statusPaths = new Set(contract.observed_scope.changed_file_statuses.map(s => s.path));
    for (const cf of contract.changed_files) {
        // Allow for normalization differences — check both raw and potential normalized
        if (!statusPaths.has(cf)) {
            // Check if a normalized version exists
            const found = contract.observed_scope.changed_file_statuses.some(s => s.path === cf || contract.changed_files.includes(s.path));
            if (!found) {
                errors.push(`Changed file '${cf}' has no corresponding changed_file_status`);
            }
        }
    }
    // Decision
    const validVerdicts = ["pass", "requires_review", "requires_reverse_issue", "fail"];
    if (!validVerdicts.includes(contract.decision.verdict)) {
        errors.push(`Invalid decision.verdict: ${contract.decision.verdict}`);
    }
    if (!contract.decision.reasons) {
        errors.push("Missing decision.reasons");
    }
    if (!contract.decision.required_actions) {
        errors.push("Missing decision.required_actions");
    }
    if (contract.decision.verdict !== "pass" && contract.decision.reasons.length === 0) {
        errors.push("Non-pass verdict must have at least one reason");
    }
    if (contract.decision.verdict !== "pass" && contract.decision.required_actions.length === 0) {
        warnings.push("Non-pass verdict has no required_actions");
    }
    // Reject full ChangeContract fields that should NOT be in Lite
    const raw = contract;
    if ("lifecycle_status" in raw) {
        errors.push("ChangeContract Lite must not have lifecycle_status");
    }
    if ("result_events" in raw) {
        errors.push("ChangeContract Lite must not have result_events");
    }
    if ("current_decision" in raw) {
        errors.push("ChangeContract Lite must not have current_decision");
    }
    if ("obligations" in raw) {
        errors.push("ChangeContract Lite must not have obligations");
    }
    return {
        status: errors.length === 0 ? "valid" : "invalid",
        errors,
        warnings,
    };
}
//# sourceMappingURL=changeContractLiteValidator.js.map