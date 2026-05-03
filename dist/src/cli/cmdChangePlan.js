import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildChangeContract } from "../change/changeContractBuilder.js";
import { renderChangeScope, renderChangeChecklist } from "../change/changeScopeRenderer.js";
import { getChangeRunDir, getChangeIntakePath, getChangeContractPath, getChangeScopePath, getChangeChecklistPath } from "../change/changeArtifactLayout.js";
import { writeChangePlanEvent } from "../change/changeGovernanceEventWriter.js";
export function runChangePlan(repoRoot, options) {
    const root = resolve(repoRoot);
    const intakePath = getChangeIntakePath(root, options.changeId);
    if (!existsSync(intakePath)) {
        console.error(`Change intake not found for change_id: ${options.changeId}`);
        process.exit(1);
    }
    const intake = JSON.parse(readFileSync(intakePath, "utf-8"));
    // Check if we already have a contract and increment revision
    let revision = 1;
    while (existsSync(getChangeContractPath(root, options.changeId, revision))) {
        revision++;
    }
    const contract = buildChangeContract({
        intake,
        revision,
        policyHash: "unknown", // Normally loaded from P29.5 policy loader
    });
    const runDir = getChangeRunDir(root, options.changeId);
    mkdirSync(runDir, { recursive: true });
    const contractPath = getChangeContractPath(root, options.changeId, revision);
    const latestContractPath = getChangeContractPath(root, options.changeId, "latest");
    const scopePath = getChangeScopePath(root, options.changeId);
    const checklistPath = getChangeChecklistPath(root, options.changeId);
    writeFileSync(contractPath, JSON.stringify(contract, null, 2) + "\n");
    writeFileSync(latestContractPath, JSON.stringify(contract, null, 2) + "\n");
    writeFileSync(scopePath, renderChangeScope(contract));
    writeFileSync(checklistPath, renderChangeChecklist(contract));
    writeChangePlanEvent(root, contract);
    if (options.json) {
        console.log(JSON.stringify({
            change_id: contract.change_id,
            revision: contract.revision,
            contract_file: latestContractPath,
            scope_file: scopePath,
            checklist_file: checklistPath,
            next_action: `pantheon change check --change-id ${contract.change_id}`
        }));
    }
    else {
        console.log(`Pantheon Change Plan Generated\n`);
        console.log(`  Change ID: ${contract.change_id}`);
        console.log(`  Revision: ${contract.revision}`);
        console.log(`  Contract: ${latestContractPath}`);
        console.log(`  Scope: ${scopePath}`);
        console.log(`  Allowed rules: ${contract.scope.allowed.length}`);
        console.log(`  Review required rules: ${contract.scope.review_required.length}`);
        console.log(`  Forbidden rules: ${contract.scope.forbidden.length}`);
        console.log(`\nNext step:\n  pantheon change check --change-id ${contract.change_id}`);
    }
}
//# sourceMappingURL=cmdChangePlan.js.map