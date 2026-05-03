import { REPAIR_RELATION_GRAPH_V1_LIMITATION } from "./types.js";
import { matchesPattern } from "./repairUtils.js";
export function buildRepairRelationGraph(input) {
    const startTime = Date.now();
    const edges = [];
    const truncationEntries = [];
    const observedFiles = input.observations.observations.files.map(file => file.path);
    const sameDirMap = buildSameDirectoryIndex(observedFiles);
    let patternsEvaluated = 0;
    // -- Suspect edges --
    for (const suspect of input.suspectSurface.files) {
        edges.push({
            from: suspect.path,
            to: suspect.path,
            relation: input.report.schema_version === "user_bug_report@0.1.0" ? "explicit_user_reference" : "suspect",
            confidence: suspect.confidence,
            reason: suspect.reason,
            evidence: suspect.evidence,
        });
    }
    // -- Test mapping edges --
    for (const evidence of input.report.evidence) {
        if (evidence.kind !== "failing_test" || !evidence.path)
            continue;
        const mappings = input.observations.observations.test_mappings
            .filter(mapping => mapping.test_path === evidence.path);
        for (const mapping of mappings) {
            edges.push({
                from: evidence.path,
                to: mapping.source_path,
                relation: "test_mapping",
                confidence: mapping.confidence === "high" ? "high" : "medium",
                reason: `Deterministic test mapping from ${evidence.path} to ${mapping.source_path}.`,
                evidence: mapping.evidence.map(item => `${item.type}:${item.value}`),
            });
        }
    }
    // -- Same package edges (capped at 8 per suspect) --
    for (const suspect of input.suspectSurface.files) {
        const directory = toDirectoryPrefix(suspect.path);
        const siblings = sameDirMap.get(directory) ?? [];
        const totalSiblings = siblings.filter(s => s !== suspect.path).length;
        const displayed = siblings.slice(0, 8);
        let displayedCount = 0;
        for (const candidate of displayed) {
            if (candidate === suspect.path)
                continue;
            edges.push({
                from: suspect.path,
                to: candidate,
                relation: "same_package",
                confidence: "medium",
                reason: `Same package or directory as suspect file ${suspect.path}.`,
                evidence: [`same_directory:${directory}`],
            });
            displayedCount++;
        }
        if (totalSiblings > displayedCount) {
            truncationEntries.push({
                relation: "same_package",
                pattern: directory,
                total_matches: totalSiblings,
                displayed_edges: displayedCount,
                truncated: true,
                omitted_count: totalSiblings - displayedCount,
            });
        }
    }
    // -- Risk preset edges (capped per suggestion and per suspect) --
    if (input.pythonSidecar) {
        const suggestions = [
            ...input.pythonSidecar.risk_preset_validation.suggested_review.map(entry => ({ ...entry, relation: "risk_preset" })),
            ...input.pythonSidecar.risk_preset_validation.suggested_forbidden.map(entry => ({ ...entry, relation: "risk_preset" })),
        ];
        for (const suspect of input.suspectSurface.files) {
            let suspectRiskEdgeCount = 0;
            for (const suggestion of suggestions) {
                let suggestionEdgeCount = 0;
                let suggestionTotalMatches = 0;
                patternsEvaluated++;
                for (const path of observedFiles) {
                    if (!matchesPattern(path, suggestion.pattern) || path === suspect.path)
                        continue;
                    suggestionTotalMatches++;
                    if (suggestionEdgeCount < 50 && suspectRiskEdgeCount < 200) {
                        edges.push({
                            from: suspect.path,
                            to: path,
                            relation: suggestion.relation,
                            confidence: suggestion.severity === "critical" ? "medium" : "low",
                            reason: suggestion.reason,
                            evidence: suggestion.evidence,
                        });
                        suggestionEdgeCount++;
                        suspectRiskEdgeCount++;
                    }
                }
                if (suggestionTotalMatches > suggestionEdgeCount) {
                    truncationEntries.push({
                        relation: "risk_preset",
                        pattern: suggestion.pattern,
                        total_matches: suggestionTotalMatches,
                        displayed_edges: suggestionEdgeCount,
                        truncated: true,
                        omitted_count: suggestionTotalMatches - suggestionEdgeCount,
                    });
                }
            }
        }
    }
    const rawEdgeCount = edges.length;
    const dedupedEdges = dedupeEdges(edges);
    const durationMs = Date.now() - startTime;
    const stats = {
        observed_files: observedFiles.length,
        patterns_evaluated: patternsEvaluated,
        edges_generated: rawEdgeCount,
        edges_after_dedup: dedupedEdges.length,
        truncation_entries: truncationEntries,
        limitation: REPAIR_RELATION_GRAPH_V1_LIMITATION,
        duration_ms: durationMs,
    };
    return { edges: dedupedEdges, stats };
}
function buildSameDirectoryIndex(paths) {
    const map = new Map();
    for (const path of paths) {
        const dir = toDirectoryPrefix(path);
        map.set(dir, [...(map.get(dir) ?? []), path].sort((a, b) => a.localeCompare(b)));
    }
    return map;
}
function toDirectoryPrefix(path) {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? "" : path.slice(0, idx);
}
function dedupeEdges(edges) {
    const seen = new Map();
    for (const edge of edges) {
        const key = `${edge.from}|${edge.to}|${edge.relation}`;
        if (!seen.has(key)) {
            seen.set(key, edge);
        }
    }
    return [...seen.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.relation.localeCompare(b.relation));
}
//# sourceMappingURL=repairRelationGraphBuilder.js.map