import { resolve } from "node:path";
import { inferChangeFromDiff } from "../change/changeInferUtility.js";
export function runChangeInfer(repoRoot, options) {
    const root = resolve(repoRoot);
    if (!options.fromDiff) {
        console.error("Only --from-diff is currently supported.");
        process.exit(1);
    }
    const inferred = inferChangeFromDiff(root);
    console.log(`Detected possible change:\n`);
    console.log(`Type: ${inferred.change_type}`);
    console.log(`Targets:`);
    for (const t of inferred.targets) {
        console.log(`  - ${t}`);
    }
    console.log(`Risk: ${inferred.risk}`);
    if (inferred.targets.length > 0) {
        console.log(`\n---`);
        console.log(`⚠️ IMPORTANT:`);
        console.log(`- This is a candidate only.`);
        console.log(`- No contract was created.`);
        console.log(`- Infer is not approval.`);
        console.log(`- Infer is not a contract.`);
        console.log(`---\n`);
        console.log(`Next step to create a contract:`);
        console.log(`pantheon change intake --type ${inferred.change_type} --title "Update" --target "${inferred.targets.join('" "')}" --reason "Inferred from active diff"`);
    }
    else {
        console.log(`\nNo diff detected. Cannot infer change.`);
    }
}
//# sourceMappingURL=cmdChangeInfer.js.map