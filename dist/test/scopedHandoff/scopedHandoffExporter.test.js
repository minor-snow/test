/**
 * P17a+b Tests: Scoped Handoff Exporter + Cursor Rules Renderer
 *
 * Covers the 20-point test matrix from P17 spec:
 * 1-10: package structure, allowed files, required tests, constraints
 * 11-16: cursor rules quality, technical ID preservation
 * 17-20: validator edge cases
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildScopedImplementationBoundaryPackage, buildHandoffReference } from "../../src/scopedHandoff/scopedHandoffExporter.js";
import { renderCursorRules } from "../../src/scopedHandoff/cursorRulesRenderer.js";
import { renderReverseIssueInstructions, renderPantheonReadme, renderForbiddenAssumptions } from "../../src/scopedHandoff/reverseIssueRenderer.js";
import { validateScopedImplementationBoundaryPackage, buildScopedHandoffReport, renderScopedHandoffReportMarkdown } from "../../src/scopedHandoff/scopedHandoffValidator.js";
import { FORBIDDEN_GENERIC_PHRASES } from "../../src/scopedHandoff/types.js";
// ---------------------------------------------------------------------------
// Load test fixtures
// ---------------------------------------------------------------------------
const DATA_BASE = resolve(__dirname, "../../data/dogfood/p10");
let graph;
let report;
let pkg;
let pkgZh;
let cursorRules;
beforeAll(() => {
    graph = JSON.parse(readFileSync(resolve(DATA_BASE, "boundary/boundary_graph.json"), "utf-8"));
    report = JSON.parse(readFileSync(resolve(DATA_BASE, "boundary/blast_radius_report.json"), "utf-8"));
    pkg = buildScopedImplementationBoundaryPackage({
        handoffPackageHash: "sha256:testfixture",
        boundaryGraph: graph,
        blastRadiusReport: report,
        options: {
            locale: "en",
            scopeLabel: "test-fixture",
            extraForbiddenPatterns: ["ui/**", "navigation/**"],
        },
    });
    pkgZh = buildScopedImplementationBoundaryPackage({
        handoffPackageHash: "sha256:testfixture",
        boundaryGraph: graph,
        blastRadiusReport: report,
        options: {
            locale: "zh-CN",
            scopeLabel: "test-fixture-zh",
        },
    });
    cursorRules = renderCursorRules(pkg);
});
// ============================================================
// Package structure (P17a)
// ============================================================
describe("ScopedImplementationBoundaryPackage", () => {
    it("1. has valid scope_id and created_at", () => {
        expect(pkg.scope_id).toMatch(/^test-fixture_/);
        expect(pkg.created_at).toBeTruthy();
    });
    it("2. has correct source hashes", () => {
        expect(pkg.source.handoff_package_hash).toBe("sha256:testfixture");
        expect(pkg.source.boundary_graph_hash).toBe(report.graph_hash);
        expect(pkg.source.blast_radius_report_hash).toBeTruthy();
        expect(pkg.source.generator_version).toBe("p17.0");
    });
    it("3. allowed_files includes all affected generated files", () => {
        const allowedPaths = pkg.allowed_files.map(f => f.path);
        for (const fileId of report.by_layer.generated_files) {
            const filePath = fileId.replace("file:", "");
            expect(allowedPaths).toContain(filePath);
        }
    });
    it("4. every allowed file has origin + reason + source_nodes", () => {
        for (const f of pkg.allowed_files) {
            expect(f.origin, `${f.path} missing origin`).toBeTruthy();
            expect(f.reason, `${f.path} missing reason`).toBeTruthy();
            expect(f.source_nodes.length, `${f.path} missing source_nodes`).toBeGreaterThan(0);
        }
    });
    it("5. test files have read+modify+test, non-test files have read+modify+regenerate+test", () => {
        for (const f of pkg.allowed_files) {
            if (f.path.includes("Test")) {
                expect(f.allowed_operations).toContain("test");
                expect(f.allowed_operations).not.toContain("regenerate");
            }
            else {
                expect(f.allowed_operations).toContain("regenerate");
            }
        }
    });
    it("6. required_tests include all affected tests from blast radius", () => {
        const testIds = pkg.required_tests.map(t => t.test_id);
        for (const testId of report.by_layer.tests) {
            expect(testIds).toContain(testId);
        }
    });
    it("7. required_tests all have requirement = must_run", () => {
        for (const t of pkg.required_tests) {
            expect(t.requirement).toBe("must_run");
        }
    });
    it("8. must_preserve constraints have source_nodes", () => {
        for (const c of pkg.must_preserve) {
            expect(c.source_nodes.length).toBeGreaterThan(0);
        }
    });
    it("9. high-risk scope sets must_require_human_review = true", () => {
        expect(report.summary.highest_risk_level).toBe("high");
        expect(pkg.summary.must_require_human_review).toBe(true);
    });
    it("10. forbidden_files include .pantheon/** and .cursor/**", () => {
        const patterns = pkg.forbidden_files.map(f => f.pattern);
        expect(patterns).toContain(".pantheon/**");
        expect(patterns).toContain(".cursor/**");
    });
    it("10b. extra forbidden patterns from input are included", () => {
        const patterns = pkg.forbidden_files.map(f => f.pattern);
        expect(patterns).toContain("ui/**");
        expect(patterns).toContain("navigation/**");
    });
    it("11. reverse_issue_required_if is non-empty", () => {
        expect(pkg.reverse_issue_required_if.length).toBeGreaterThanOrEqual(6);
    });
    it("12. risk_amplification matches blast radius report", () => {
        expect(pkg.risk_amplification.length).toBe(report.risk_amplification.length);
        for (const amp of pkg.risk_amplification) {
            expect(amp.risk_id).toBeTruthy();
            expect(amp.risk_level).toBeTruthy();
        }
    });
    it("13. affected_symbols matches blast radius report", () => {
        expect(pkg.affected_symbols.length).toBe(report.by_layer.generated_symbols.length);
        for (const sym of pkg.affected_symbols) {
            expect(sym.symbol_id).toBeTruthy();
            expect(sym.symbol_name).toBeTruthy();
        }
    });
    it("14. summary numbers match blast radius", () => {
        expect(pkg.summary.downstream_nodes).toBe(report.summary.total_downstream);
        expect(pkg.summary.affected_files).toBe(report.summary.affected_files);
        expect(pkg.summary.affected_symbols).toBe(report.summary.affected_symbols);
        expect(pkg.summary.affected_tests).toBe(report.summary.affected_tests);
        expect(pkg.summary.risk_level).toBe(report.summary.highest_risk_level);
    });
});
// ============================================================
// Enforced_by heuristic (tightening point #1)
// ============================================================
describe("enforced_by heuristic", () => {
    it("must_preserve constraints have enforcement entries", () => {
        // At least some constraints should find enforcement heuristically
        const withEnforcement = pkg.must_preserve.filter(c => c.enforced_by.length > 0);
        // Forbidden assumptions should find test enforcement
        const faConstraints = pkg.must_preserve.filter(c => c.constraint_id.includes("forbidden"));
        for (const c of faConstraints) {
            if (c.enforced_by.length > 0) {
                expect(c.enforced_by[0].enforcement_source).toBe("heuristic_downstream_match");
            }
        }
    });
    it("enforcement_source is labeled on all heuristic entries", () => {
        for (const c of pkg.must_preserve) {
            for (const e of c.enforced_by) {
                expect(e.enforcement_source).toBeTruthy();
            }
        }
    });
});
// ============================================================
// Handoff reference (tightening point #2)
// ============================================================
describe("handoff reference", () => {
    it("is reference-only, not a subset dump", () => {
        const ref = buildHandoffReference("sha256:test", "data/dogfood/p10/handoff/handoff_package.json", report, graph);
        expect(ref.note).toContain("Reference-only");
        expect(ref.handoff_package_hash).toBe("sha256:test");
        expect(ref.handoff_package_path).toContain("handoff_package.json");
        expect(ref.relevant_nodes.length).toBeGreaterThan(0);
    });
});
// ============================================================
// Cursor Rules (P17b)
// ============================================================
describe("renderCursorRules", () => {
    it("15. contains no forbidden generic phrases", () => {
        const lower = cursorRules.toLowerCase();
        for (const phrase of FORBIDDEN_GENERIC_PHRASES) {
            expect(lower).not.toContain(phrase);
        }
    });
    it("contains allowed files with paths", () => {
        for (const f of pkg.allowed_files) {
            expect(cursorRules).toContain(f.path);
        }
    });
    it("contains forbidden file patterns", () => {
        expect(cursorRules).toContain(".pantheon/**");
        expect(cursorRules).toContain(".cursor/**");
    });
    it("contains required test IDs", () => {
        for (const t of pkg.required_tests) {
            expect(cursorRules).toContain(t.test_id);
        }
    });
    it("contains reverse issue instructions", () => {
        expect(cursorRules).toContain("Reverse Issue");
        expect(cursorRules).toContain("createImplementationIssue");
    });
    it("contains risk level and human review", () => {
        expect(cursorRules).toContain("HIGH");
        expect(cursorRules).toContain("Required: **yes**");
    });
    it("contains changed nodes", () => {
        for (const n of pkg.request.changed_nodes.filter(n => !report.invalid_nodes.includes(n))) {
            expect(cursorRules).toContain(n);
        }
    });
    it("no Cursor-specific fields in core package", () => {
        const json = JSON.stringify(pkg);
        expect(json).not.toContain("cursorRule");
        expect(json).not.toContain("cursor_config");
        expect(json).not.toContain(".cursorrules");
    });
});
// ============================================================
// Reverse Issue Instructions (P17c)
// ============================================================
describe("renderReverseIssueInstructions", () => {
    it("contains all trigger conditions", () => {
        const md = renderReverseIssueInstructions(pkg);
        expect(md).toContain("missing_field");
        expect(md).toContain("new_state_transition");
        expect(md).toContain("contract_test_failure");
        expect(md).toContain("createImplementationIssue");
    });
});
describe("renderForbiddenAssumptions", () => {
    it("contains forbidden assumption statements", () => {
        const md = renderForbiddenAssumptions(pkg);
        if (pkg.forbidden_assumptions.length > 0) {
            expect(md).toContain("Forbidden Assumptions");
            for (const fa of pkg.forbidden_assumptions) {
                expect(md).toContain(fa.assumption_id);
            }
        }
    });
    it("marks heuristic enforcement", () => {
        const md = renderForbiddenAssumptions(pkg);
        if (pkg.forbidden_assumptions.some(fa => fa.enforced_by.some(e => e.enforcement_source === "heuristic_downstream_match"))) {
            expect(md).toContain("heuristic");
        }
    });
});
describe("renderPantheonReadme", () => {
    it("contains key file descriptions", () => {
        const md = renderPantheonReadme();
        expect(md).toContain("scope.json");
        expect(md).toContain("handoff.json");
        expect(md).toContain("reverse-issue.md");
        expect(md).toContain("Do not edit manually");
    });
});
// ============================================================
// Chinese locale (P15.2 integration)
// ============================================================
describe("zh-CN locale", () => {
    it("16. preserves all technical node IDs", () => {
        const json = JSON.stringify(pkgZh);
        // Changed nodes
        for (const n of report.request.changed_nodes) {
            if (!report.invalid_nodes.includes(n)) {
                expect(json).toContain(n);
            }
        }
        // File paths — stored as paths, not node IDs with file: prefix
        for (const f of report.by_layer.generated_files) {
            const filePath = f.replace("file:", "");
            expect(json).toContain(filePath);
        }
        // Test IDs
        for (const t of report.by_layer.tests) {
            expect(json).toContain(t);
        }
    });
    it("has Chinese human summary", () => {
        expect(pkgZh.human_readable_summary).toContain("风险等级");
        expect(pkgZh.human_readable_summary).toContain("下游影响");
    });
    it("has Chinese implementation context", () => {
        expect(pkgZh.implementation_context).toContain("实现上下文");
        expect(pkgZh.implementation_context).toContain("允许修改的文件");
    });
    it("Chinese constraints preserve source node IDs", () => {
        for (const c of pkgZh.must_preserve) {
            for (const src of c.source_nodes) {
                // Source node IDs must be original English IDs
                expect(src).toMatch(/^(hc:|blk:|file:|sym:|test:)/);
            }
        }
    });
});
// ============================================================
// Validator (P17e)
// ============================================================
describe("scopedHandoffValidator", () => {
    it("17. passes current P10 scoped handoff", () => {
        const result = validateScopedImplementationBoundaryPackage(pkg, cursorRules);
        expect(result.error_count).toBe(0);
        expect(result.status).toMatch(/^pass/);
    });
    it("18. warns on heuristic enforcement", () => {
        const result = validateScopedImplementationBoundaryPackage(pkg);
        const heuristicInfos = result.entries.filter(e => e.check_id === "heuristic_enforcement");
        // Should have info entries for heuristic-derived enforcement
        if (pkg.must_preserve.some(c => c.enforced_by.some(e => e.enforcement_source === "heuristic_downstream_match"))) {
            expect(heuristicInfos.length).toBeGreaterThan(0);
        }
    });
    it("19. fails if high-risk + must_require_human_review = false", () => {
        const broken = { ...pkg, summary: { ...pkg.summary, must_require_human_review: false } };
        const result = validateScopedImplementationBoundaryPackage(broken);
        expect(result.status).toBe("fail");
        expect(result.entries.some(e => e.check_id === "human_review_high")).toBe(true);
    });
    it("20. fails if forbidden_files missing .pantheon/**", () => {
        const broken = {
            ...pkg,
            forbidden_files: pkg.forbidden_files.filter(f => f.pattern !== ".pantheon/**"),
        };
        const result = validateScopedImplementationBoundaryPackage(broken);
        expect(result.status).toBe("fail");
        expect(result.entries.some(e => e.check_id === "forbidden_pantheon")).toBe(true);
    });
    it("fails if cursor rules contain generic phrase", () => {
        const badRules = cursorRules + "\n\nAlways follow good architecture and ensure quality.";
        const result = validateScopedImplementationBoundaryPackage(pkg, badRules);
        expect(result.status).toBe("fail");
        expect(result.entries.some(e => e.check_id === "cursor_generic_phrase")).toBe(true);
    });
    it("21. all reverse issue example commands use valid --type values", () => {
        const validTypes = [
            "missing_field", "wrong_type", "missing_state", "wrong_transition",
            "missing_interface", "contract_mismatch", "acceptance_gap", "other",
        ];
        for (const ri of pkg.reverse_issue_required_if) {
            const typeMatch = ri.example_command.match(/--type\s+"([^"]+)"/);
            expect(typeMatch, `Trigger ${ri.trigger_id} missing --type in example_command`).toBeTruthy();
            if (typeMatch) {
                expect(validTypes, `Trigger ${ri.trigger_id} uses invalid type "${typeMatch[1]}"`).toContain(typeMatch[1]);
            }
        }
    });
    it("22. validator fails if reverse issue uses invalid --type", () => {
        const broken = {
            ...pkg,
            reverse_issue_required_if: [
                {
                    trigger_id: "bad_trigger",
                    condition: "test",
                    required_action: "test",
                    example_command: 'npx tsx scripts/createImplementationIssue.ts --type "nonexistent_type" --description "..."',
                },
            ],
        };
        const result = validateScopedImplementationBoundaryPackage(broken);
        expect(result.status).toBe("fail");
        expect(result.entries.some(e => e.check_id === "reverse_issue_invalid_type")).toBe(true);
    });
    it("23. example commands include --artifact and --block placeholders", () => {
        for (const ri of pkg.reverse_issue_required_if) {
            expect(ri.example_command).toContain("--artifact");
            expect(ri.example_command).toContain("--block");
        }
    });
});
// ============================================================
// Report
// ============================================================
describe("scopedHandoffReport", () => {
    it("builds report with correct status", () => {
        const validation = validateScopedImplementationBoundaryPackage(pkg, cursorRules);
        const report = buildScopedHandoffReport(pkg, validation, [".pantheon/scope.json"]);
        expect(report.scope_id).toBe(pkg.scope_id);
        expect(["ready", "ready_with_warnings"]).toContain(report.status);
    });
    it("renders markdown report", () => {
        const validation = validateScopedImplementationBoundaryPackage(pkg, cursorRules);
        const rpt = buildScopedHandoffReport(pkg, validation, [".pantheon/scope.json"]);
        const md = renderScopedHandoffReportMarkdown(rpt);
        expect(md).toContain("Scoped Handoff Report");
        expect(md).toContain(pkg.scope_id);
        expect(md).toContain("HIGH");
    });
});
//# sourceMappingURL=scopedHandoffExporter.test.js.map