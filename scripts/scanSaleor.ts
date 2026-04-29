/**
 * P23 Real Project Trial: Scan H:\Boom\salary (Saleor) with Pantheon.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { scanRepo } from "../src/repoObservation/repoScanner.js";
import { buildChangeContractLite } from "../src/changeContract/lite/changeContractLiteBuilder.js";
import { renderChangeContractLiteMarkdown } from "../src/changeContract/lite/changeContractLiteRenderer.js";
import { buildAgentScopeLite, renderAgentScopeLiteMarkdown } from "../src/diffWorkflow/agentScopeLiteBuilder.js";
import { buildAgentTaskPacket } from "../src/agentTrial/agentTaskPacketBuilder.js";
import { renderAgentTaskPacketMarkdown } from "../src/agentTrial/agentTaskPacketRenderer.js";

let repoRoot = "H:\\Boom\\salary";
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--repo" && process.argv[i + 1]) repoRoot = process.argv[i + 1];
  else if (process.argv[i].startsWith("--repo=")) repoRoot = process.argv[i].slice(7);
}

const outDir = join("data", "dogfood", "salary-trial");
mkdirSync(outDir, { recursive: true });

console.log("=== Pantheon Real Project Scan: Saleor ===");
console.log("  Repo:", repoRoot);

// Step 1: Scan
console.time("  Scan time");
const obs = scanRepo({ repoRoot });
console.timeEnd("  Scan time");

console.log("  Files:", obs.meta.file_count);
console.log("  Hash:", obs.meta.observation_hash);
console.log("  Head:", obs.repo.head_commit_hash);
console.log("  State:", obs.repo.repo_state);

// Buckets
const buckets: Record<string, number> = {};
for (const f of obs.observations.files) {
  buckets[f.bucket] = (buckets[f.bucket] ?? 0) + 1;
}
console.log("\n  Buckets:", JSON.stringify(buckets));
console.log("  Import edges:", obs.observations.import_edges.length);
console.log("  Test mappings:", obs.observations.test_mappings.length);
console.log("  Sensitive paths:", obs.observations.sensitive_paths.length);
console.log("  Config hints:", obs.observations.config_hints.length);
console.log("  Excluded dirs:", obs.excluded.length);
console.log("  Quality:", JSON.stringify(obs.quality));

// Write summary
const summary = {
  repo: obs.repo,
  meta: obs.meta,
  buckets,
  unknowns: obs.unknowns,
  quality: obs.quality,
  import_edge_count: obs.observations.import_edges.length,
  test_mapping_count: obs.observations.test_mappings.length,
  sensitive_path_count: obs.observations.sensitive_paths.length,
  config_hints: obs.observations.config_hints,
  excluded_count: obs.excluded.length,
};
writeFileSync(join(outDir, "scan_summary.json"), JSON.stringify(summary, null, 2));

// Step 2: Change contract for checkout module
const intent = "Add a checkoutDelete mutation that allows customers to delete their own abandoned checkout sessions, cleaning up stale data.";
const changedFiles = [
  "saleor/checkout/actions.py",
  "saleor/checkout/utils.py",
  "saleor/graphql/checkout/mutations/__init__.py",
  "saleor/graphql/checkout/schema.py",
];

// Check which files actually exist in observations
const observedPaths = new Set(obs.observations.files.map(f => f.path));
const missing = changedFiles.filter(f => !observedPaths.has(f));
const found = changedFiles.filter(f => observedPaths.has(f));

console.log("\n--- Change Contract ---");
console.log("  Intent:", intent);
console.log("  Planned files:", changedFiles.length);
console.log("  Found in scan:", found.length);
if (missing.length > 0) console.log("  Missing:", missing);

const contract = buildChangeContractLite({
  observations: obs,
  changedFiles: found.length > 0 ? found : changedFiles,
  intent,
});

console.log("  Contract ID:", contract.contract_id);
console.log("  Verdict:", contract.decision.verdict);
for (const r of contract.decision.reasons) console.log("    -", r);

writeFileSync(join(outDir, "change_contract_lite.json"), JSON.stringify(contract, null, 2));
writeFileSync(join(outDir, "change_contract_lite.md"), renderChangeContractLiteMarkdown(contract));

// Step 3: Agent scope
const scope = buildAgentScopeLite({ contract, observations: obs });
console.log("\n--- Agent Scope ---");
console.log("  Allowed:", scope.allowed_files.length);
console.log("  Review required:", scope.review_required_files.length);
console.log("  Forbidden patterns:", scope.forbidden_patterns.length);
if (scope.violation_hints.length > 0) {
  console.log("  Violation hints:");
  for (const h of scope.violation_hints.slice(0, 10)) {
    console.log("    -", h.kind, ":", h.message);
  }
  if (scope.violation_hints.length > 10) console.log("    ... and", scope.violation_hints.length - 10, "more");
}

writeFileSync(join(outDir, "agent_scope.json"), JSON.stringify(scope, null, 2));
writeFileSync(join(outDir, "agent_scope.md"), renderAgentScopeLiteMarkdown(scope));

// Step 4: Agent task packet
const packet = buildAgentTaskPacket({
  scenario: {
    id: "saleor_checkout_delete" as any,
    description: "Add checkoutDelete mutation to Saleor checkout module.",
    intent,
    planned_changed_files: found.length > 0 ? found : changedFiles,
    expected_attempts: 2 as const,
    simulated_diffs: [],
  },
  scope,
  attempt: 1,
});

writeFileSync(join(outDir, "agent_task_packet.json"), JSON.stringify(packet, null, 2));
writeFileSync(join(outDir, "agent_task_packet.md"), renderAgentTaskPacketMarkdown(packet));

console.log("\n=== All artifacts written to:", outDir, "===");
