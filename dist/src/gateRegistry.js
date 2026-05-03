/**
 * P18.1: Gate Completeness Registry
 *
 * Every deterministic gate in Pantheon declares what it checks,
 * what it explicitly does NOT check, its fail-closed cases,
 * and which regression tests prove it is wired correctly.
 *
 * Purpose: Prevent "gate gap" bugs — the #1 systemic risk pattern
 * identified across 40 bugs in P2–P18.
 *
 * ref: P18.1
 */
// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const GATE_REGISTRY = [
    // =========================================================================
    // Layer 4: Core Gates
    // =========================================================================
    {
        gate_id: "validate_skill_output",
        gate_name: "Quarantine Skill Output Validator",
        source_file: "src/validators.ts",
        entry_function: "validateSkillOutput",
        phase_introduced: "P2",
        primary_owned_fields: [
            "patch_proposal.target_artifact_id",
            "patch_proposal.operations[].target_block_id",
            "patch_proposal.operations[].new_block",
        ],
        observed_fields: [
            "artifact.sections[].commitments[].block_id",
        ],
        required_checks: [
            "JSON parse succeeds",
            "Schema validation passes (Zod)",
            "target_artifact_id matches current artifact",
            "Every target_block_id exists in artifact",
            "new_block has required fields",
            "Host recomputes content_hash (ignores LLM-provided hash)",
        ],
        known_non_goals: [
            "Semantic quality of patch text",
            "Whether patch addresses the intended issue",
            "Cross-artifact consistency",
        ],
        fail_closed_cases: [
            "Malformed JSON → reject",
            "Schema mismatch → reject",
            "Non-existent target_block_id → reject",
            "Missing target_artifact_id → reject",
        ],
        regression_tests: [
            { file: "test/validators.test.ts", name: "rejects invalid JSON" },
            { file: "test/validators.test.ts", name: "fails when target_block_id does not exist" },
            { file: "test/validators.test.ts", name: "checks operations[].target_block_id" },
            { file: "test/validators.test.ts", name: "passes valid PatchProposal" },
        ],
    },
    {
        gate_id: "lint_artifact",
        gate_name: "Single-Artifact Linter",
        source_file: "src/linter.ts",
        entry_function: "lintArtifact",
        phase_introduced: "P4",
        primary_owned_fields: [
            "artifact.sections[].commitments[].text",
            "artifact.sections[].commitments[].terms",
        ],
        observed_fields: [
            "artifact.sections[].commitments[].block_id",
        ],
        required_checks: [
            "empty_block_text: block text is whitespace-only or missing",
            "undefined_term: snake_case or backtick term not in terms[]",
            "domain_irrelevant_content: domain keyword matching",
            "redundant_narrative: excessive filler patterns",
        ],
        known_non_goals: [
            "Cross-artifact link validity (→ cross_lint_artifacts)",
            "Schema structural correctness (→ validate_skill_output)",
            "Semantic regression (→ semantic_regression)",
        ],
        fail_closed_cases: [
            "Empty block text → Issue(empty_block_text)",
            "Undefined technical term → Issue(undefined_term)",
        ],
        regression_tests: [
            { file: "test/linter.test.ts", name: "flags empty text" },
            { file: "test/linter.test.ts", name: "flags undefined backtick terms" },
            { file: "test/linter.domain.test.ts", name: "flags text with zero domain-relevant keywords" },
            { file: "test/linter.redundancy.test.ts", name: "returns 1 for identical sets" },
        ],
    },
    {
        gate_id: "cross_lint_artifacts",
        gate_name: "Cross-Artifact Linter",
        source_file: "src/crossArtifactLinter.ts",
        entry_function: "crossLintArtifacts",
        phase_introduced: "P7a",
        primary_owned_fields: [
            "artifact.sections[].commitments[].linked_architecture_blocks",
            "artifact.sections[].commitments[].linked_interface_blocks",
        ],
        observed_fields: [
            "artifact.sections[].commitments[].block_id",
            "artifact.sections[].commitments[].terms",
        ],
        required_checks: [
            "orphan_interface_contract: interface block links to non-existent arch block",
            "stale_link: architecture block references non-existent block_id",
            "orphan_module_contract: module block links to non-existent interface block",
            "stale_interface_link: interface block references non-existent arch block",
        ],
        known_non_goals: [
            "Single-artifact text quality (→ lint_artifact)",
            "Handoff projection consistency (→ handoff_readiness)",
        ],
        fail_closed_cases: [
            "Link to non-existent block → Issue(stale_link/stale_interface_link)",
            "Contract without upstream block → Issue(orphan_*_contract)",
        ],
        regression_tests: [
            { file: "test/crossArtifactLinter.test.ts", name: "detects orphan interface blocks with no links" },
            { file: "test/crossArtifactLinter.test.ts", name: "detects stale links to non-existent architecture blocks" },
        ],
    },
    {
        gate_id: "compile_patch",
        gate_name: "Patch Compiler",
        source_file: "src/applyPatch.ts",
        entry_function: "compilePatch",
        phase_introduced: "P4",
        primary_owned_fields: [
            "patch_proposal.operations[].expected_old_hash",
            "patch_proposal.base_revision_id",
        ],
        observed_fields: [
            "artifact.revision_id",
            "artifact.sections[].commitments[].content_hash",
        ],
        required_checks: [
            "base_revision_id matches artifact.revision_id",
            "expected_old_hash matches current block content_hash",
            "target_block_id exists in artifact",
            "No duplicate target_block_id in operations",
        ],
        known_non_goals: [
            "Semantic quality of new text",
            "Whether patch content is relevant to issue",
        ],
        fail_closed_cases: [
            "Stale base_revision_id → reject",
            "Hash mismatch → reject",
            "Non-existent block → reject",
        ],
        regression_tests: [
            { file: "test/applyPatch.test.ts", name: "rejects on base_revision_id mismatch" },
            { file: "test/applyPatch.test.ts", name: "rejects on hash mismatch" },
            { file: "test/applyPatch.test.ts", name: "throws for non-existent target_block_id" },
        ],
    },
    {
        gate_id: "apply_patch",
        gate_name: "Patch Applicator",
        source_file: "src/applyPatch.ts",
        entry_function: "applyPatch",
        phase_introduced: "P4",
        primary_owned_fields: [
            "artifact.sections[].commitments[].content_hash",
            "artifact.revision_id",
        ],
        observed_fields: [
            "artifact.parent_revision_id",
        ],
        required_checks: [
            "Host recomputes content_hash for every modified block",
            "Host recomputes revision_id",
            "Parent revision chain maintained",
        ],
        known_non_goals: [
            "Hash validation of input (→ compile_patch)",
            "Semantic regression (→ semantic_regression)",
        ],
        fail_closed_cases: [
            "No valid compiled patch → no modification",
        ],
        regression_tests: [
            { file: "test/applyPatch.test.ts", name: "constructs new_block with updated text and computed hash" },
            { file: "test/applyPatch.test.ts", name: "candidate revision has different revision_id from base" },
            { file: "test/applyPatch.test.ts", name: "fills expected_old_hash from current block" },
        ],
    },
    {
        gate_id: "apply_override_patch",
        gate_name: "Human Override Patch Applicator",
        source_file: "src/applyOverridePatch.ts",
        entry_function: "applyOverridePatch",
        phase_introduced: "P5",
        primary_owned_fields: [
            "override_patch.override_type",
            "override_patch.failed_gates",
            "override_patch.operations[].expected_old_hash",
        ],
        observed_fields: [
            "artifact.revision_id",
            "artifact.sections[].commitments[].block_id",
        ],
        required_checks: [
            "Non-overridable mechanical gates cannot be overridden (C-08)",
            "base_revision_id matches artifact",
            "target_block_id exists",
            "expected_old_hash matches",
            "new_block.block_id matches target_block_id",
            "Host recomputes content_hash",
        ],
        known_non_goals: [
            "Quality of override rationale",
            "Semantic regression of override (operator accepted risk)",
        ],
        fail_closed_cases: [
            "Override of json_parse/schema_gate → reject",
            "Stale base_revision_id → reject",
            "Non-existent block_id → reject",
            "block_id substitution → reject",
        ],
        regression_tests: [
            { file: "test/applyOverridePatch.test.ts", name: "identifies non-overridable gates" },
            { file: "test/applyOverridePatch.test.ts", name: "rejects override of non-overridable gates" },
            { file: "test/applyOverridePatch.test.ts", name: "rejects when target_block_id does not exist" },
            { file: "test/applyOverridePatch.test.ts", name: "rejects when new_block.block_id !== target_block_id" },
        ],
    },
    {
        gate_id: "semantic_regression",
        gate_name: "Semantic Regression Detector",
        source_file: "src/semanticRegression.ts",
        entry_function: "runSemanticRegression",
        phase_introduced: "P4",
        primary_owned_fields: [
            "artifact.sections[].commitments[].text",
        ],
        observed_fields: [
            "artifact.sections[].commitments[].terms",
        ],
        required_checks: [
            "constraint_deletion: strong constraint language removed (must/never/only)",
            "undefined_term: new technical terms not in terms[]",
            "scope_expansion: significant text length increase",
            "scope_contraction: significant text length decrease",
            "term_removal: defined terms removed from block",
        ],
        known_non_goals: [
            "Cross-artifact link validity (→ cross_lint_artifacts)",
            "Block structural integrity (→ compile_patch)",
        ],
        fail_closed_cases: [
            "Strong constraint deleted → regression_failed",
            "Undefined term introduced → regression_failed",
        ],
        regression_tests: [
            { file: "test/semanticRegression.test.ts", name: "extracts must, only, never from text" },
            { file: "test/semanticRegression.test.ts", name: "intercepts undefined term in new block" },
            { file: "test/semanticRegression.test.ts", name: "identifies changed blocks by content_hash difference" },
            { file: "test/e2e.test.ts", name: "runs full pipeline and halts at regression_failed" },
        ],
    },
    {
        gate_id: "integrity_check",
        gate_name: "Store-Wide Integrity Scanner",
        source_file: "src/integrityCheck.ts",
        entry_function: "integrityCheck",
        phase_introduced: "P5",
        primary_owned_fields: [
            "revision.revision_id",
            "revision.sections[].commitments[].content_hash",
            "canonical_pointer.revision_id",
        ],
        observed_fields: [
            "audit_log",
            "quarantine_files",
        ],
        required_checks: [
            "Every revision file is valid JSON",
            "Every revision passes schema validation",
            "Stored content_hash matches recomputed hash",
            "Stored revision_id matches recomputed revision_id",
            "Canonical pointer references existing revision",
            "Parent chain is acyclic",
            "No orphan quarantine files",
        ],
        known_non_goals: [
            "Semantic quality of content",
            "Cross-artifact consistency",
            "Performance or timing",
        ],
        fail_closed_cases: [
            "Hash mismatch → corrupt finding",
            "Missing revision for canonical pointer → corrupt finding",
            "Unparseable JSON → corrupt finding",
        ],
        regression_tests: [
            { file: "test/integrityCheck.test.ts", name: "detects canonical pointing to non-existent revision" },
            { file: "test/corruption.test.ts", name: "integrityCheck reports block_content_hash_mismatch" },
            { file: "test/corruption.test.ts", name: "integrityCheck reports canonical_target_missing" },
        ],
    },
    // =========================================================================
    // Layer 5: Draft Lifecycle Gates
    // =========================================================================
    {
        gate_id: "validate_draft",
        gate_name: "Draft Structural Gate",
        source_file: "src/draftValidator.ts",
        entry_function: "validateDraft",
        phase_introduced: "P8",
        primary_owned_fields: [
            "draft.artifact_id",
            "draft.artifact_type",
            "draft.schema_version",
            "draft.sections[].section_id",
            "draft.sections[].commitments[].block_id",
        ],
        observed_fields: [],
        required_checks: [
            "JSON parse succeeds",
            "Required top-level fields present",
            "At least one section",
            "Every section has section_id and title",
            "Every block has block_id and text",
            "No duplicate block_ids",
            "No duplicate section_ids",
            "Host recomputes all hashes",
            "Host recomputes revision_id",
            "Host ignores LLM-provided hashes",
        ],
        known_non_goals: [
            "Domain quality (→ domain_quality_evaluator)",
            "Concept coverage (→ domain_quality_evaluator)",
            "Cross-artifact links (→ cross_lint_artifacts)",
        ],
        fail_closed_cases: [
            "Malformed JSON → reject",
            "Missing sections → reject",
            "Duplicate block_id → reject",
            "Missing artifact_type → reject",
        ],
        regression_tests: [
            { file: "test/draftValidator.test.ts", name: "rejects non-object input" },
            { file: "test/draftValidator.test.ts", name: "rejects duplicate section_id" },
            { file: "test/draftValidator.test.ts", name: "rejects empty sections" },
            { file: "test/draftValidator.test.ts", name: "warns about wrong schema_version" },
        ],
    },
    {
        gate_id: "domain_quality_evaluator",
        gate_name: "Domain Quality & Concept Coverage Gate",
        source_file: "src/domainQualityEvaluator.ts",
        entry_function: "evaluateDraftQuality",
        phase_introduced: "P9",
        primary_owned_fields: [
            "quality_report.score",
            "quality_report.recommendation",
            "quality_report.concept_coverage",
        ],
        observed_fields: [
            "domain_profile.required_concepts",
            "domain_profile.rubric",
            "draft.sections[].commitments[].text",
        ],
        required_checks: [
            "Concept coverage: each required concept matched in draft text",
            "missing_required_section: profile-required sections present",
            "missing_required_concept: coverage percentage threshold",
            "placeholder_concept: shallow/vague concept mentions",
            "domain_irrelevant_content: off-topic blocks",
            "Rubric violations: min_sections, min_blocks, max_blocks, min_coverage",
            "Score formula: 100 - 15×high - 8×med - 3×low + bonuses",
        ],
        known_non_goals: [
            "Structural validity of draft (→ validate_draft)",
            "Cross-artifact consistency (→ cross_lint_artifacts)",
            "Natural language fluency",
        ],
        fail_closed_cases: [
            "Rubric violation → reject_draft recommendation",
            "Coverage below min → reject_draft recommendation",
            "Score < threshold → reject_draft recommendation",
        ],
        regression_tests: [
            { file: "test/domainQualityEvaluator.test.ts", name: "detects missing required sections" },
            { file: "test/domainQualityEvaluator.test.ts", name: "detects forbidden generic phrases" },
            { file: "test/domainQualityEvaluator.test.ts", name: "detects missing required concepts" },
        ],
    },
    // =========================================================================
    // Layer 8: Handoff Gate
    // =========================================================================
    {
        gate_id: "handoff_readiness",
        gate_name: "Handoff Readiness Evaluator",
        source_file: "src/handoff/handoffReadinessEvaluator.ts",
        entry_function: "evaluateHandoffReadiness",
        phase_introduced: "P11",
        primary_owned_fields: [
            "readiness_report.overall_status",
            "readiness_report.checks[].status",
        ],
        observed_fields: [
            "handoff_package.contract_definitions",
            "handoff_package.conflict_policy_matrix",
            "handoff_package.data_models",
            "handoff_package.state_machines",
            "handoff_package.forbidden_assumptions",
        ],
        required_checks: [
            "12 checks: contract completeness, conflict matrix, data model, state machine",
            "state_machine_contradictions: allowed ∩ forbidden = ∅",
            "unresolved_structural_terms: 0 unresolved",
            "Orphan state detection",
            "Missing transition coverage",
        ],
        known_non_goals: [
            "Kotlin compilation correctness (→ compile harness)",
            "Boundary graph consistency (→ boundary_gates)",
            "Implementation completeness",
        ],
        fail_closed_cases: [
            "State machine contradiction → not_ready",
            "Unresolved structural terms > 0 → not_ready",
            "Missing contract definition → not_ready",
        ],
        regression_tests: [
            { file: "test/handoff/structuralTermResolver.test.ts", name: "reports unresolved term" },
            { file: "test/handoff/structuralTermResolver.test.ts", name: "fails when unresolved_terms" },
        ],
    },
    // =========================================================================
    // Layer 10: Boundary Gates
    // =========================================================================
    {
        gate_id: "boundary_gates",
        gate_name: "Boundary Graph Consistency Gates (6 gates)",
        source_file: "src/boundary/boundaryGatesAndQueries.ts",
        entry_function: "runAllGates",
        phase_introduced: "P14",
        primary_owned_fields: [
            "gate_results[].status",
            "gate_results[].coverage",
        ],
        observed_fields: [
            "boundary_graph.nodes",
            "boundary_graph.edges",
        ],
        required_checks: [
            "Gate 1: Interface-relevant architecture coverage",
            "Gate 2: Implementation-relevant interface coverage",
            "Gate 3: Module to handoff coverage",
            "Gate 4: Handoff → generated artifact coverage (critical, generative kinds only)",
            "Gate 5: Risk + FA → test coverage (critical, high-risk policies only)",
            "Gate 6: Generated reverse provenance (critical)",
        ],
        known_non_goals: [
            "Blast radius computation (→ blast_radius)",
            "Scoped handoff export (→ scoped_handoff_validator)",
            "Kotlin code correctness",
        ],
        fail_closed_cases: [
            "Critical handoff node without generated edge → gate fail",
            "High-risk policy without test edge → gate fail",
            "Generated file without provenance → gate fail",
        ],
        regression_tests: [
            { file: "test/handoff/boundaryGraph.test.ts", name: "gate 4" },
            { file: "test/handoff/boundaryGraph.test.ts", name: "gate 5" },
            { file: "test/handoff/boundaryGraph.test.ts", name: "gate 6" },
        ],
    },
    // =========================================================================
    // Layer P17: Scoped Handoff Validation
    // =========================================================================
    {
        gate_id: "scoped_handoff_validator",
        gate_name: "Scoped Implementation Boundary Validator",
        source_file: "src/scopedHandoff/scopedHandoffValidator.ts",
        entry_function: "validateScopedImplementationBoundaryPackage",
        phase_introduced: "P17",
        primary_owned_fields: [
            "scope.scope_id",
            "scope.allowed_files[].path",
            "scope.forbidden_files[].pattern",
            "scope.required_tests[].test_id",
            "scope.reverse_issue_required_if",
            "scope.summary.must_require_human_review",
        ],
        observed_fields: [
            "scope.must_preserve",
            "scope.handoff_reference",
        ],
        required_checks: [
            "16-point structural validation",
            "scope_id non-empty",
            "allowed_files non-empty with valid paths",
            "forbidden_files include .pantheon/** and .cursor/**",
            "required_tests have test_id and source_nodes",
            "reverse_issue triggers have valid --type in example_command",
            "must_preserve entries have source_nodes",
            "summary fields complete",
        ],
        known_non_goals: [
            "Compliance checking (→ scope_diff_validator)",
            "Blast radius computation (→ blast_radius)",
            "File system validation",
        ],
        fail_closed_cases: [
            "Missing scope_id → not_ready",
            "Zero allowed_files → not_ready",
            "Missing .pantheon/ in forbidden_files → not_ready",
            "Invalid --type in reverse issue command → not_ready",
        ],
        regression_tests: [
            { file: "test/scopedHandoff/scopedHandoffExporter.test.ts", name: "has valid scope_id" },
            { file: "test/scopedHandoff/scopedHandoffExporter.test.ts", name: "fails if forbidden_files missing .pantheon" },
            { file: "test/scopedHandoff/scopedHandoffExporter.test.ts", name: "all reverse issue example commands use valid --type" },
        ],
    },
    // =========================================================================
    // Layer P18: Scope Diff Validator
    // =========================================================================
    {
        gate_id: "scope_diff_validator",
        gate_name: "Scope Diff Compliance Validator",
        source_file: "src/scopeDiff/scopeDiffValidator.ts",
        entry_function: "validateScopeDiff",
        phase_introduced: "P18",
        primary_owned_fields: [
            "report.status",
            "report.violations[].violation_type",
            "report.blocking_reasons",
            "report.required_actions",
        ],
        observed_fields: [
            "scope.allowed_files",
            "scope.forbidden_files",
            "scope.required_tests",
            "scope.summary.must_require_human_review",
            "required_tests_file.scope_id",
            "required_tests_file.source_scope_hash",
        ],
        required_checks: [
            "File classification: allowed / forbidden / protocol / outside",
            "Generated boundary file modify permission check",
            "Required tests: scope_id binding",
            "Required tests: source_scope_hash binding",
            "Required tests: pass/fail/missing/skipped",
            "Human review: required for high-risk scopes",
            "Reverse issue trigger aggregation",
            "Status hierarchy: requires_human_review > requires_reverse_issue > fail > pass",
            "required_actions completeness for all violation types",
        ],
        known_non_goals: [
            "Scope export quality (→ scoped_handoff_validator)",
            "Blast radius computation",
            "Git diff semantic analysis",
        ],
        fail_closed_cases: [
            "No changed_files or diff_text → fail",
            "scope_id mismatch → fail (early return)",
            "source_scope_hash mismatch → fail (early return)",
            "Protocol file modified → requires_reverse_issue",
            "High-risk scope without review → requires_human_review",
        ],
        regression_tests: [
            { file: "test/scopeDiff/scopeDiffValidator.test.ts", name: "pass scenario: allowed files + tests pass + human review" },
            { file: "test/scopeDiff/scopeDiffValidator.test.ts", name: "outside scope scenario" },
            { file: "test/scopeDiff/scopeDiffValidator.test.ts", name: "protocol modification scenario" },
            { file: "test/scopeDiff/scopeDiffValidator.test.ts", name: "fails when source_scope_hash is tampered" },
            { file: "test/scopeDiff/scopeDiffValidator.test.ts", name: "generated boundary modified without modify permission" },
            { file: "test/scopeDiff/scopeDiffValidator.test.ts", name: "missing human review still preserves reverse-issue signal" },
        ],
    },
];
// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
export function getGateById(id) {
    return GATE_REGISTRY.find(g => g.gate_id === id);
}
export function getGatesByPhase(phase) {
    return GATE_REGISTRY.filter(g => g.phase_introduced === phase);
}
export function getAllGateIds() {
    return GATE_REGISTRY.map(g => g.gate_id);
}
//# sourceMappingURL=gateRegistry.js.map