/**
 * P18: Test Result Validator
 *
 * Validates required test results against scope-bound required-tests.json.
 * Primary join key: test_id.
 *
 * ref: P18
 */
export function validateRequiredTests(requiredTestsFile, scope, testResults, options, scopeHash) {
    const violations = [];
    const warnings = [];
    // 1. Scope binding check: scope_id
    if (requiredTestsFile.scope_id !== scope.scope_id) {
        violations.push({
            violation_id: "v_scope_mismatch",
            violation_type: "required_tests_scope_mismatch",
            severity: "high",
            message: `required-tests.json scope_id "${requiredTestsFile.scope_id}" does not match scope.json scope_id "${scope.scope_id}".`,
            required_action: "Regenerate required-tests.json from the current scope using P17 CLI.",
            source: { scope_id: scope.scope_id, rule: "required_tests.scope_id === scope.scope_id" },
        });
        return {
            violations,
            warnings,
            summary: { required_tests: 0, required_tests_passed: 0, required_tests_failed: 0, required_tests_missing: 0 },
        };
    }
    // 1b. Scope binding check: source_scope_hash
    if (scopeHash && requiredTestsFile.source_scope_hash !== scopeHash) {
        violations.push({
            violation_id: "v_scope_hash_mismatch",
            violation_type: "required_tests_scope_mismatch",
            severity: "high",
            message: `required-tests.json source_scope_hash "${requiredTestsFile.source_scope_hash}" does not match current scope hash "${scopeHash}".`,
            required_action: "Regenerate required-tests.json from the current scope using P17 CLI. The required tests file may have been manually edited or is stale.",
            source: { scope_id: scope.scope_id, rule: "required_tests.source_scope_hash === hash(scope.json)" },
        });
        return {
            violations,
            warnings,
            summary: { required_tests: 0, required_tests_passed: 0, required_tests_failed: 0, required_tests_missing: 0 },
        };
    }
    // 2. Build test result lookup by test_id
    const resultMap = new Map();
    if (testResults) {
        for (const tr of testResults) {
            resultMap.set(tr.test_id, tr);
        }
    }
    let passed = 0;
    let failed = 0;
    let missing = 0;
    // 3. Check each required test
    for (const rt of requiredTestsFile.required_tests) {
        const result = resultMap.get(rt.test_id);
        if (!result) {
            if (options?.treat_missing_tests_as_warning) {
                warnings.push({
                    warning_id: `w_missing_test_${rt.test_id}`,
                    warning_type: "test_result_extra",
                    message: `Required test "${rt.test_id}" has no result (treated as warning by option).`,
                });
            }
            else {
                violations.push({
                    violation_id: `v_missing_${rt.test_id}`,
                    violation_type: "required_test_missing",
                    severity: "high",
                    test_id: rt.test_id,
                    message: `Required test "${rt.test_id}" was not run.`,
                    required_action: `Run test "${rt.test_id}" and report result.`,
                    source: { scope_id: scope.scope_id, source_nodes: rt.source_nodes },
                });
            }
            missing++;
            continue;
        }
        switch (result.status) {
            case "passed":
                passed++;
                break;
            case "failed":
                violations.push({
                    violation_id: `v_failed_${rt.test_id}`,
                    violation_type: "required_test_failed",
                    severity: "high",
                    test_id: rt.test_id,
                    message: `Required test "${rt.test_id}" failed.`,
                    required_action: `Fix implementation to pass test "${rt.test_id}".`,
                    source: { scope_id: scope.scope_id, source_nodes: rt.source_nodes },
                });
                failed++;
                break;
            case "skipped":
            case "not_run":
                violations.push({
                    violation_id: `v_notrun_${rt.test_id}`,
                    violation_type: "required_test_missing",
                    severity: "high",
                    test_id: rt.test_id,
                    message: `Required test "${rt.test_id}" was ${result.status}.`,
                    required_action: `Run test "${rt.test_id}" and report result.`,
                    source: { scope_id: scope.scope_id, source_nodes: rt.source_nodes },
                });
                missing++;
                break;
        }
    }
    // 4. Extra test results warning
    const requiredIds = new Set(requiredTestsFile.required_tests.map(t => t.test_id));
    if (testResults) {
        for (const tr of testResults) {
            if (!requiredIds.has(tr.test_id)) {
                warnings.push({
                    warning_id: `w_extra_${tr.test_id}`,
                    warning_type: "test_result_extra",
                    message: `Test result "${tr.test_id}" is not in required tests list.`,
                });
            }
        }
    }
    return {
        violations,
        warnings,
        summary: {
            required_tests: requiredTestsFile.required_tests.length,
            required_tests_passed: passed,
            required_tests_failed: failed,
            required_tests_missing: missing,
        },
    };
}
//# sourceMappingURL=testResultValidator.js.map