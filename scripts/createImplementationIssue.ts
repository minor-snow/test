/**
 * P13-B: Create Implementation Issue (reverse feedback)
 *
 * Generates a structured implementation issue from the implementation layer
 * back into the Pantheon artifact pipeline.
 *
 * Path: implementation feedback → issue → quarantine → validation →
 *       patch proposal → applyPatch → semantic regression → signoff → regenerate
 *
 * Usage:
 *   npx tsx scripts/createImplementationIssue.ts \
 *     --artifact <artifact_id> \
 *     --block <block_id> \
 *     --type missing_field \
 *     --description "OfflineReportEnvelope needs ruleVersion field" \
 *     --context "During TASK-003 implementation, evaluate() needs to embed rule version"
 *
 * ref: P13-B
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import type { ImplementationIssue, ImplementationIssueType } from "../src/handoff/types.js";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const ISSUES_DIR = join(STORE_ROOT, "implementation", "issues");

const VALID_TYPES: ImplementationIssueType[] = [
  "missing_field", "wrong_type", "missing_state", "wrong_transition",
  "missing_interface", "contract_mismatch", "acceptance_gap", "other",
];

function parseArgs(): {
  artifact: string;
  block: string;
  type: ImplementationIssueType;
  description: string;
  context: string;
  suggestion?: string;
} {
  const args = process.argv.slice(2);
  const get = (flag: string): string => {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length) throw new Error(`Missing ${flag}`);
    return args[idx + 1];
  };

  const type = get("--type") as ImplementationIssueType;
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid type '${type}'. Valid: ${VALID_TYPES.join(", ")}`);
  }

  const suggIdx = args.indexOf("--suggestion");
  return {
    artifact: get("--artifact"),
    block: get("--block"),
    type,
    description: get("--description"),
    context: get("--context"),
    suggestion: suggIdx !== -1 ? args[suggIdx + 1] : undefined,
  };
}

async function main() {
  const params = parseArgs();

  // Load existing issues to generate next ID
  await fs.mkdir(ISSUES_DIR, { recursive: true });
  const existing = await fs.readdir(ISSUES_DIR);
  const nextNum = existing.filter(f => f.endsWith(".json")).length + 1;
  const issueId = `IMPL-${String(nextNum).padStart(3, "0")}`;

  const issue: ImplementationIssue = {
    issue_id: issueId,
    created_at: new Date().toISOString(),
    target_artifact_id: params.artifact,
    target_block_id: params.block,
    issue_type: params.type,
    description: params.description,
    implementation_context: params.context,
    suggested_contract_change: params.suggestion,
    status: "open",
  };

  const path = join(ISSUES_DIR, `${issueId}.json`);
  await fs.writeFile(path, JSON.stringify(issue, null, 2), "utf8");

  console.log(`✅ Created implementation issue: ${issueId}`);
  console.log(`   Type: ${issue.issue_type}`);
  console.log(`   Target: ${issue.target_artifact_id} → ${issue.target_block_id}`);
  console.log(`   Description: ${issue.description}`);
  console.log(`   Path: ${path}`);
  console.log();
  console.log("Next steps:");
  console.log("  1. Review issue in quarantine");
  console.log("  2. Create patch proposal (applyPatch)");
  console.log("  3. Run semantic regression");
  console.log("  4. If pass → canonical update → regenerate handoff → regenerate Kotlin");
}

main().catch(err => {
  console.error("Usage: npx tsx scripts/createImplementationIssue.ts \\");
  console.error("  --artifact <id> --block <id> --type <type> --description <text> --context <text>");
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
