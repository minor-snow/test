/**
 * Operator Fatigue Test Fixtures — Release Decision
 *
 * ref: P5-004
 *
 * 15 scenarios covering the full decision space.
 * Goal: test whether operator can maintain judgment quality
 * across consecutive sign-off decisions.
 */
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function issue(block_id, section_id, issue_type, severity, message) {
    return {
        issue_id: `issue_${block_id}_${issue_type}`,
        block_id,
        section_id,
        section_title: section_id.replace("sec_", "Section "),
        issue_type,
        severity,
        message,
    };
}
function snapshot(issues) {
    const by_severity = {};
    const by_type = {};
    const by_section = {};
    for (const i of issues) {
        by_severity[i.severity] = (by_severity[i.severity] || 0) + 1;
        by_type[i.issue_type] = (by_type[i.issue_type] || 0) + 1;
        by_section[i.section_id] = (by_section[i.section_id] || 0) + 1;
    }
    return { total: issues.length, by_severity, by_type, by_section, issues };
}
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
export const RELEASE_FIXTURES = [
    // 1. Fully clean
    {
        id: "rf01_fully_clean",
        name: "Fully Clean Artifact",
        description: "Zero residual issues. All layers green.",
        three_layer: { integrity_clean: true, artifact_clean: true, document_coherent: true },
        residual: snapshot([]),
        expected_decision: "accepted_clean",
        expected_rationale_keywords: ["clean", "no residual"],
    },
    // 2. Single low residual
    {
        id: "rf02_single_low",
        name: "Single Low Residual",
        description: "One redundant_narrative (low). Minor overlap.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_010", "sec_core", "redundant_narrative", "low", "Shares phrases with b_002"),
        ]),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["low", "advisory", "backlog"],
    },
    // 3. Three concentrated mediums
    {
        id: "rf03_concentrated_medium",
        name: "Concentrated Medium Residuals",
        description: "3 undefined_term in same block. Terminology debt.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_025", "sec_gates", "undefined_term", "medium", "base_revision_id not defined"),
            issue("b_025", "sec_gates", "undefined_term", "medium", "target_block_id not defined"),
            issue("b_025", "sec_gates", "undefined_term", "medium", "expected_old_hash not defined"),
        ]),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["terminology", "concentrated", "one block"],
    },
    // 4. Single high residual
    {
        id: "rf04_single_high",
        name: "Single High Residual",
        description: "One empty_block_text (high). Cannot sign off.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_034", "sec_integrity", "empty_block_text", "high", "Block text is empty"),
        ]),
        expected_decision: "rejected_requires_cleanup",
        expected_rationale_keywords: ["high", "empty", "cleanup"],
    },
    // 5. Mixed high + low
    {
        id: "rf05_mixed_high_low",
        name: "Mixed High and Low",
        description: "1 high + 2 low. High blocks cleanup.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_033", "sec_integrity", "unsafe_canonical_commit", "high", "Unsafe commit language"),
            issue("b_010", "sec_core", "redundant_narrative", "low", "Shares phrases"),
            issue("b_020", "sec_pipeline", "redundant_narrative", "low", "Shares phrases"),
        ]),
        expected_decision: "rejected_requires_cleanup",
        expected_rationale_keywords: ["high", "unsafe", "must fix"],
    },
    // 6. All redundant_narrative (low)
    {
        id: "rf06_all_low_redundancy",
        name: "All Low Redundancy",
        description: "4 redundant_narrative issues (low). Advisory only.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_005", "sec_core", "redundant_narrative", "low", "Shares phrases with b_001"),
            issue("b_012", "sec_pipeline", "redundant_narrative", "low", "Shares phrases with b_003"),
            issue("b_020", "sec_gates", "redundant_narrative", "low", "Shares phrases with b_015"),
            issue("b_030", "sec_integrity", "redundant_narrative", "low", "Shares phrases with b_025"),
        ]),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["low", "advisory", "editorial"],
    },
    // 7. domain_irrelevant_content present
    {
        id: "rf07_domain_irrelevant",
        name: "Domain Irrelevant Content",
        description: "Block with non-architectural content. Must rewrite.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: false },
        residual: snapshot([
            issue("b_018", "sec_store", "domain_irrelevant_content", "medium", "No domain keywords found"),
        ]),
        expected_decision: "rejected_requires_cleanup",
        expected_rationale_keywords: ["domain", "irrelevant", "rewrite"],
    },
    // 8. Empty block present
    {
        id: "rf08_empty_block",
        name: "Empty Block",
        description: "Unresolved empty block. Hardest incomplete signal.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: false },
        residual: snapshot([
            issue("b_034", "sec_integrity", "empty_block_text", "high", "Block text is empty"),
        ]),
        expected_decision: "rejected_requires_cleanup",
        expected_rationale_keywords: ["empty", "incomplete", "high"],
    },
    // 9. Phase 4 scenario (7 residuals, 0 high)
    {
        id: "rf09_phase4_scenario",
        name: "Phase 4 Post-Cleanup",
        description: "7 residuals, 0 high. The actual Phase 4 outcome.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_025", "sec_gates", "undefined_term", "medium", "base_revision_id"),
            issue("b_025", "sec_gates", "undefined_term", "medium", "target_block_id"),
            issue("b_025", "sec_gates", "undefined_term", "medium", "expected_old_hash"),
            issue("b_025", "sec_gates", "undefined_term", "medium", "new_block"),
            issue("b_025", "sec_gates", "undefined_term", "medium", "applypatch"),
            issue("b_029", "sec_regression", "undefined_term", "medium", "confidence_score"),
            issue("b_034", "sec_integrity", "redundant_narrative", "low", "Overlap with b_018"),
        ]),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["terminology", "concentrated", "no high"],
    },
    // 10. Integrity corruption
    {
        id: "rf10_integrity_corrupt",
        name: "Integrity Corruption",
        description: "Integrity check failed. Cannot proceed to sign-off.",
        three_layer: { integrity_clean: false, artifact_clean: false, document_coherent: false },
        residual: snapshot([]),
        expected_decision: "rejected_requires_cleanup",
        expected_rationale_keywords: ["integrity", "corrupt", "data"],
    },
    // 11. All issues in one section
    {
        id: "rf11_single_section",
        name: "Single Section Concentration",
        description: "All 4 mediums in sec_gates. Targeted cleanup candidate.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_025", "sec_gates", "undefined_term", "medium", "term_a"),
            issue("b_026", "sec_gates", "undefined_term", "medium", "term_b"),
            issue("b_027", "sec_gates", "undefined_term", "medium", "term_c"),
            issue("b_028", "sec_gates", "undefined_term", "medium", "term_d"),
        ]),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["concentrated", "single section", "targeted"],
    },
    // 12. Issues spread across all sections
    {
        id: "rf12_spread_across",
        name: "Spread Across Sections",
        description: "4 mediums spread across 4 sections. Still manageable.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_005", "sec_core", "undefined_term", "medium", "term_a"),
            issue("b_015", "sec_pipeline", "undefined_term", "medium", "term_b"),
            issue("b_025", "sec_gates", "undefined_term", "medium", "term_c"),
            issue("b_035", "sec_integrity", "undefined_term", "medium", "term_d"),
        ]),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["spread", "medium", "backlog"],
    },
    // 13. Many low residuals
    {
        id: "rf13_many_low",
        name: "15 Low Residuals",
        description: "High volume but all low severity. Volume alone doesn't block.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot(Array.from({ length: 15 }, (_, i) => issue(`b_${i + 1}`, `sec_${(i % 3) + 1}`, "redundant_narrative", "low", `Overlap ${i + 1}`))),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["low", "volume", "advisory"],
    },
    // 14. Single unsafe_canonical_commit only
    {
        id: "rf14_unsafe_commit_only",
        name: "Unsafe Commit Only",
        description: "One unsafe_canonical_commit (high). Hard blocker.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_033", "sec_integrity", "unsafe_canonical_commit", "high", "Bypass quarantine"),
        ]),
        expected_decision: "rejected_requires_cleanup",
        expected_rationale_keywords: ["high", "unsafe", "cannot sign off"],
    },
    // 15. Post-cleanup: 0 high, 2 medium
    {
        id: "rf15_post_cleanup",
        name: "Post-Cleanup Residual",
        description: "Cleaned highs, 2 medium remain. Ready for conditional sign-off.",
        three_layer: { integrity_clean: true, artifact_clean: false, document_coherent: true },
        residual: snapshot([
            issue("b_029", "sec_regression", "undefined_term", "medium", "confidence_score"),
            issue("b_034", "sec_integrity", "redundant_narrative", "low", "Overlap with b_018"),
        ]),
        expected_decision: "accepted_with_residual_issues",
        expected_rationale_keywords: ["cleaned", "no high", "conditional"],
    },
];
//# sourceMappingURL=index.js.map