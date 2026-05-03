import { resolve } from "node:path";
import { closeReviewRequest, loadReviewQueue, loadReviewRequest } from "../review/reviewQueueStore.js";
import { appendGovernanceEvent } from "../governanceLog/governanceEventWriter.js";
export function cmdReview(args) {
    const subcommand = args[0];
    const repoRoot = getFlag(args, "repo") ?? ".";
    switch (subcommand) {
        case "list":
            cmdReviewList(repoRoot);
            return;
        case "show":
            cmdReviewShow(repoRoot, requireTargetType(args), requireTargetId(args));
            return;
        case "close":
            cmdReviewClose(repoRoot, requireTargetType(args), requireTargetId(args));
            return;
        default:
            console.error("Usage:");
            console.error("  pantheon review list");
            console.error("  pantheon review show --target-type <repair|change> --target-id <id>");
            console.error("  pantheon review close --target-type <repair|change> --target-id <id>");
            process.exitCode = 1;
    }
}
export function cmdReviewList(repoRootInput) {
    const repoRoot = resolve(repoRootInput);
    const queue = loadReviewQueue(repoRoot);
    console.log("Pantheon Review Queue\n");
    if (queue.open.length === 0) {
        console.log("  No open review requests.");
        return;
    }
    for (const request of queue.open) {
        console.log(`${request.target?.target_type} ${request.target?.target_id}`);
        console.log(`  verdict: ${request.verdict}`);
        console.log(`  attention: ${request.attention_level}`);
        console.log(`  files: ${request.files.length}`);
        console.log(`  reason: ${request.reason}`);
        console.log("");
    }
}
export function cmdReviewShow(repoRootInput, targetType, targetId) {
    const repoRoot = resolve(repoRootInput);
    const request = loadReviewRequest(repoRoot, targetType, targetId);
    if (!request) {
        throw new Error(`No review request found for ${targetType} ${targetId}.`);
    }
    console.log("Pantheon Review Request\n");
    console.log(`  Target: ${request.target?.target_type} ${request.target?.target_id}`);
    console.log(`  Status: ${request.status}`);
    console.log(`  Verdict: ${request.verdict}`);
    console.log(`  Attention: ${request.attention_level}`);
    console.log(`  Reason: ${request.reason}`);
    if (request.files.length > 0) {
        console.log("  Files:");
        for (const file of request.files) {
            console.log(`    - ${file.path} [${file.bucket}] ${file.reason}`);
        }
    }
}
export function cmdReviewClose(repoRootInput, targetType, targetId) {
    const repoRoot = resolve(repoRootInput);
    const request = closeReviewRequest(repoRoot, targetType, targetId);
    if (!request) {
        throw new Error(`No review request found for ${targetType} ${targetId}.`);
    }
    appendGovernanceEvent(repoRoot, {
        schema_version: "pantheon_governance_event@0.1.0",
        event_id: `gov_${targetId}_review_close_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        source: "local_cli",
        event_type: "review_resolved",
        repair_id: targetType === "repair" ? targetId : undefined, // Legacy support in event if needed
        change_id: targetType === "change" ? targetId : undefined,
        contract_revision: request.contract_revision,
        verdict: request.verdict,
        attention_level: "none",
    });
    console.log(`Closed review request for ${targetType} ${targetId}.`);
}
function getFlag(args, name) {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1]) {
        return args[idx + 1];
    }
    return undefined;
}
function requireTargetType(args) {
    const targetType = getFlag(args, "target-type");
    if (!targetType) {
        // Legacy fallback
        if (getFlag(args, "repair-id"))
            return "repair";
        throw new Error("review command requires --target-type <repair|change>.");
    }
    if (targetType !== "repair" && targetType !== "change") {
        throw new Error("target-type must be 'repair' or 'change'.");
    }
    return targetType;
}
function requireTargetId(args) {
    const targetId = getFlag(args, "target-id") ?? getFlag(args, "repair-id");
    if (!targetId) {
        throw new Error("review command requires --target-id <id>.");
    }
    return targetId;
}
//# sourceMappingURL=cmdReview.js.map