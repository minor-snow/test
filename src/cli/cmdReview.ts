import { resolve } from "node:path";
import { closeReviewRequest, loadReviewQueue, loadReviewRequest } from "../review/reviewQueueStore.js";
import { appendGovernanceEvent } from "../governanceLog/governanceEventWriter.js";

export function cmdReview(args: string[]): void {
  const subcommand = args[0];
  const repoRoot = getFlag(args, "repo") ?? ".";

  switch (subcommand) {
    case "list":
      cmdReviewList(repoRoot);
      return;
    case "show":
      cmdReviewShow(repoRoot, requireRepairId(args));
      return;
    case "close":
      cmdReviewClose(repoRoot, requireRepairId(args));
      return;
    default:
      console.error("Usage:");
      console.error("  pantheon review list");
      console.error("  pantheon review show --repair-id repair_abc123");
      console.error("  pantheon review close --repair-id repair_abc123");
      process.exitCode = 1;
  }
}

export function cmdReviewList(repoRootInput: string): void {
  const repoRoot = resolve(repoRootInput);
  const queue = loadReviewQueue(repoRoot);

  console.log("Pantheon Review Queue\n");
  if (queue.open.length === 0) {
    console.log("  No open review requests.");
    return;
  }
  for (const request of queue.open) {
    console.log(`${request.repair_id}`);
    console.log(`  verdict: ${request.verdict}`);
    console.log(`  attention: ${request.attention_level}`);
    console.log(`  files: ${request.files.length}`);
    console.log(`  reason: ${request.reason}`);
    console.log("");
  }
}

export function cmdReviewShow(repoRootInput: string, repairId: string): void {
  const repoRoot = resolve(repoRootInput);
  const request = loadReviewRequest(repoRoot, repairId);
  if (!request) {
    throw new Error(`No review request found for ${repairId}.`);
  }

  console.log("Pantheon Review Request\n");
  console.log(`  Repair: ${request.repair_id}`);
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

export function cmdReviewClose(repoRootInput: string, repairId: string): void {
  const repoRoot = resolve(repoRootInput);
  const request = closeReviewRequest(repoRoot, repairId);
  if (!request) {
    throw new Error(`No review request found for ${repairId}.`);
  }
  appendGovernanceEvent(repoRoot, {
    schema_version: "pantheon_governance_event@0.1.0",
    event_id: `gov_${repairId}_review_close_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    source: "local_cli",
    event_type: "review_resolved",
    repair_id: repairId,
    contract_revision: request.contract_revision,
    verdict: request.verdict,
    attention_level: "none",
  });
  console.log(`Closed review request for ${repairId}.`);
}

function getFlag(args: readonly string[], name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) {
    return args[idx + 1];
  }
  return undefined;
}

function requireRepairId(args: readonly string[]): string {
  const repairId = getFlag(args, "repair-id");
  if (!repairId) {
    throw new Error("review command requires --repair-id repair_abc123.");
  }
  return repairId;
}
