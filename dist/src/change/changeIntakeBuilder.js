import { generateChangeId } from "./changeId.js";
import { captureRepoStateSnapshot } from "../repair/session/repoStateSnapshot.js";
export function buildChangeIntake(input) {
    const repoState = captureRepoStateSnapshot({
        repoRoot: input.repoRoot || process.cwd(),
        source: "git",
    });
    const changeId = generateChangeId({
        schema_version: "change_intake@0.1.0",
        change_type: input.changeType,
        title: input.title,
        target_patterns: input.targetPatterns,
        base_sha: repoState.base_sha || "",
    });
    return {
        schema_version: "change_intake@0.1.0",
        change_id: changeId,
        change_type: input.changeType,
        title: input.title,
        reason: input.reason,
        target_patterns: input.targetPatterns,
        declared_non_goals: input.declaredNonGoals || [],
        operator_notes: input.operatorNotes,
        created_by: input.createdBy || "user",
        repo_state: repoState,
    };
}
//# sourceMappingURL=changeIntakeBuilder.js.map