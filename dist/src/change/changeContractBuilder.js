import { buildChangeScope } from "./changeScopeBuilder.js";
export function buildChangeContract(input) {
    const scope = buildChangeScope({ intake: input.intake });
    const requiredChecks = [
        {
            check_id: "diff_verification",
            description: "Verify that all changed files are within the allowed or review-required scopes."
        }
    ];
    const consistencyChecklist = [
        {
            id: "no_forbidden_access",
            description: "Ensure no files in the forbidden bucket are modified.",
            status: "pending"
        },
        {
            id: "adhere_to_non_goals",
            description: "Ensure the declared non-goals are strictly avoided.",
            status: "pending"
        }
    ];
    return {
        schema_version: "change_contract@0.1.0",
        change_id: input.intake.change_id,
        revision: input.revision || 1,
        status: "planned",
        change_type: input.intake.change_type,
        title: input.intake.title,
        reason: input.intake.reason,
        repo_state: input.intake.repo_state,
        policy_hash: input.policyHash || "unknown", // To be injected by policy loader
        scope,
        required_checks: requiredChecks,
        consistency_checklist: consistencyChecklist,
        limitations: [
            "P29.6 change contracts are deterministic governance contracts.",
            "They do not prove semantic correctness.",
            "They do not infer full architecture intent.",
            "They do not compute complete dependency graphs."
        ]
    };
}
//# sourceMappingURL=changeContractBuilder.js.map