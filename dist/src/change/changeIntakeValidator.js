export function validateChangeIntake(intake) {
    const errors = [];
    if (intake.schema_version !== "change_intake@0.1.0") {
        errors.push(`Invalid schema version: ${intake.schema_version}`);
    }
    if (!intake.change_id || !intake.change_id.startsWith("chg_")) {
        errors.push("Missing or invalid change_id");
    }
    if (!intake.title || intake.title.trim() === "") {
        errors.push("Missing title");
    }
    if (!intake.target_patterns || intake.target_patterns.length === 0) {
        errors.push("Missing target_patterns. At least one target path pattern must be provided.");
    }
    const validTypes = [
        "feature",
        "refactor",
        "config_change",
        "dependency_update",
        "test_change",
        "architecture_change",
        "bugfix",
    ];
    if (!validTypes.includes(intake.change_type)) {
        errors.push(`Invalid change_type: ${intake.change_type}`);
    }
    if (!intake.repo_state || !intake.repo_state.base_sha) {
        errors.push("Missing repo_state or base_sha");
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=changeIntakeValidator.js.map