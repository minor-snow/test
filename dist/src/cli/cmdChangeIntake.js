import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildChangeIntake } from "../change/changeIntakeBuilder.js";
import { validateChangeIntake } from "../change/changeIntakeValidator.js";
import { renderChangeTask } from "../change/changeTaskRenderer.js";
import { getChangeRunDir, getChangeIntakePath, getChangeTaskPath } from "../change/changeArtifactLayout.js";
import { writeChangeIntakeEvent } from "../change/changeGovernanceEventWriter.js";
export function runChangeIntake(repoRoot, options) {
    const root = resolve(repoRoot);
    const intake = buildChangeIntake({
        repoRoot: root,
        changeType: options.type,
        title: options.title,
        reason: options.reason,
        targetPatterns: options.target,
        declaredNonGoals: options.nonGoal,
        operatorNotes: options.note,
        createdBy: "user",
    });
    const validation = validateChangeIntake(intake);
    if (!validation.valid) {
        if (options.json) {
            console.log(JSON.stringify({ error: "Invalid intake parameters", details: validation.errors }));
        }
        else {
            console.error("Invalid intake parameters:");
            validation.errors.forEach(e => console.error(`- ${e}`));
        }
        process.exit(1);
    }
    const runDir = getChangeRunDir(root, intake.change_id);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(getChangeIntakePath(root, intake.change_id), JSON.stringify(intake, null, 2) + "\n");
    writeFileSync(getChangeTaskPath(root, intake.change_id), renderChangeTask(intake));
    writeChangeIntakeEvent(root, intake);
    if (options.json) {
        console.log(JSON.stringify({
            change_id: intake.change_id,
            task_file: getChangeTaskPath(root, intake.change_id),
            next_action: `pantheon change plan --change-id ${intake.change_id}`
        }));
    }
    else {
        console.log(`Pantheon Change Intake Created\n`);
        console.log(`  Change ID: ${intake.change_id}`);
        console.log(`  Task file: ${getChangeTaskPath(root, intake.change_id)}`);
        console.log(`\nNext step:\n  pantheon change plan --change-id ${intake.change_id}`);
    }
}
//# sourceMappingURL=cmdChangeIntake.js.map