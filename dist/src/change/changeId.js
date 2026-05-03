import { shortStableId } from "../deterministic.js";
export function generateChangeId(input) {
    // Normalize arrays by sorting to ensure determinism
    const normalizedTargets = [...input.target_patterns].sort();
    return shortStableId("chg", {
        schema_version: input.schema_version,
        change_type: input.change_type,
        title: input.title.trim().toLowerCase(), // Normalize title
        target_patterns: normalizedTargets,
        base_sha: input.base_sha,
    });
}
//# sourceMappingURL=changeId.js.map