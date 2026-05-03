import { buildSuspectSurface } from "./suspectSurfaceBuilder.js";
import { buildRepairRelationGraph } from "./repairRelationGraphBuilder.js";
import { buildImpactSurface } from "./impactSurfaceBuilder.js";
import { buildRepairScope } from "./repairScopeBuilder.js";
import { buildConsistencyChecklist } from "./consistencyChecklistBuilder.js";
import { uniqueSorted } from "./repairUtils.js";
import { getReportKind } from "./bugFindingBuilder.js";
export function buildRepairContract(input) {
    if (input.finding.status !== "accepted") {
        throw new Error("RepairContract can only be generated from an accepted BugFinding.");
    }
    const suspectSurface = buildSuspectSurface({
        report: input.report,
        finding: input.finding,
        observations: input.observations,
    });
    if (suspectSurface.files.length === 0) {
        throw new Error("RepairContract cannot be generated without a non-empty suspect surface.");
    }
    const relationGraphResult = buildRepairRelationGraph({
        report: input.report,
        suspectSurface,
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
    });
    const relationGraph = relationGraphResult.edges;
    const impactSurface = buildImpactSurface({
        report: input.report,
        finding: input.finding,
        suspectSurface,
        relationGraph,
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
    });
    const testSignals = buildRepairTestSignals({
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
        impactSurface,
    });
    const consistencyChecks = buildConsistencyChecklist({
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
        impactSurface,
        testSignals,
        userMustPreserve: input.userMustPreserve,
    });
    const derivedMustPreserve = deriveMustPreserve({
        userMustPreserve: input.userMustPreserve,
        impactSurface,
        pythonSidecar: input.pythonSidecar,
    });
    const repairScope = buildRepairScope({
        suspectSurface,
        impactSurface,
        observations: input.observations,
        pythonSidecar: input.pythonSidecar,
        protectedPatterns: input.protectedPatterns,
        architectureContract: input.architectureContract,
    });
    return {
        schema_version: "repair_contract@0.1.0",
        repair_id: input.repairId,
        revision: 1,
        source: {
            kind: getReportKind(input.report),
            id: input.report.report_id,
        },
        intent: input.report.summary,
        bug_finding_id: input.finding.finding_id,
        suspect_surface: suspectSurface,
        repair_relation_graph: relationGraph,
        graph_build_stats: relationGraphResult.stats,
        impact_surface: impactSurface,
        repair_scope: repairScope,
        must_preserve: derivedMustPreserve,
        consistency_checks: consistencyChecks,
        test_signals: testSignals,
        repo_state: input.repoState,
        audit_status: "pending_plan_audit",
        source_refs: {
            repo_observations_hash: input.observations.meta.observation_hash,
            repo_label: input.observations.repo.repo_root_label,
            head_commit_hash: input.observations.repo.head_commit_hash,
        },
    };
}
function buildRepairTestSignals(input) {
    const related = uniqueSorted(input.impactSurface.related_tests.map(test => test.path));
    const recommended = uniqueSorted([
        ...input.observations.observations.test_mappings.map(mapping => mapping.test_path),
        ...(input.pythonSidecar?.test_mappings.flatMap(mapping => mapping.existing_test_paths) ?? []),
    ]).filter(path => related.includes(path) === false).slice(0, 12);
    const missingMapping = input.impactSurface.unknowns
        .filter(item => item.kind === "missing_test_mapping")
        .map(item => item.note);
    return {
        related,
        recommended,
        missing_mapping: missingMapping,
    };
}
function deriveMustPreserve(input) {
    const mustPreserve = new Set(input.userMustPreserve);
    if (input.pythonSidecar?.risk_preset_validation.preset === "python_sdk_library") {
        mustPreserve.add("Do not change exported public API symbols without review.");
    }
    if (input.impactSurface.risk_areas.some(area => area.label.includes("payment") || area.label.includes("billing"))) {
        mustPreserve.add("Do not change payment or billing behavior outside the intended fix.");
    }
    if (input.impactSurface.risk_areas.some(area => area.label.includes("auth"))) {
        mustPreserve.add("Do not broaden authentication or permission behavior.");
    }
    return [...mustPreserve].sort((a, b) => a.localeCompare(b));
}
//# sourceMappingURL=repairContractBuilder.js.map