/**
 * P23: Pet Agent Protocol Usability Trial CLI
 *
 * Usage:
 *
 *   Run all scenarios:
 *     npx tsx scripts/runPhase23PetAgentTrial.ts --all
 *
 *   Run one scenario:
 *     npx tsx scripts/runPhase23PetAgentTrial.ts --scenario pet_out_of_scope_retry
 *
 *   Options:
 *     --out <dir>       Output directory (default: data/dogfood/p23)
 *     --fixture <dir>   Fixture repo root (default: test/fixtures/repo_fixture)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { scanRepo } from "../src/repoObservation/repoScanner.js";
import { buildChangeContractLite } from "../src/changeContract/lite/changeContractLiteBuilder.js";
import { buildAgentScopeLite } from "../src/diffWorkflow/agentScopeLiteBuilder.js";
import { verifyDiffAgainstScope } from "../src/diffWorkflow/diffVerifier.js";
import { buildAgentFeedbackFromDiffVerification } from "../src/agentFeedback/diffFeedbackBuilder.js";
import { validateAgentFeedback } from "../src/agentFeedback/agentFeedbackValidator.js";
import { compareAttempts, deriveProtocolGapsFromComparison } from "../src/agentTrial/attemptComparison.js";
import { buildAgentTaskPacket } from "../src/agentTrial/agentTaskPacketBuilder.js";
import { renderAgentTaskPacketMarkdown } from "../src/agentTrial/agentTaskPacketRenderer.js";
import { renderAgentTrialReportMarkdown } from "../src/agentTrial/agentTrialReportRenderer.js";
import { getScenario, getAllScenarios } from "../src/agentTrial/petTrialScenarios.js";
import type { GitDiffSummary } from "../src/diffWorkflow/types.js";
import type {
  PetTrialScenario, PetTrialScenarioId, AgentTrialReport,
  TrialAttempt, TrialViolationKey, AttemptComparison, ProtocolGap,
  FeedbackEffect,
} from "../src/agentTrial/types.js";

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

function parseArgs(): {
  scenarioId?: PetTrialScenarioId;
  all: boolean;
  outDir: string;
  fixtureRoot: string;
} {
  const args = process.argv.slice(2);
  let scenarioId: PetTrialScenarioId | undefined;
  let all = false;
  let outDir = "data/dogfood/p23";
  let fixtureRoot = "test/fixtures/repo_fixture";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--scenario" && args[i + 1]) {
      scenarioId = args[++i] as PetTrialScenarioId;
    } else if (args[i] === "--all") {
      all = true;
    } else if (args[i] === "--out" && args[i + 1]) {
      outDir = args[++i];
    } else if (args[i] === "--fixture" && args[i + 1]) {
      fixtureRoot = args[++i];
    }
  }

  if (!all && !scenarioId) {
    console.error("Usage: --all or --scenario <id>");
    console.error("Scenarios:", getAllScenarios().map(s => s.id).join(", "));
    process.exit(1);
  }

  return { scenarioId, all, outDir, fixtureRoot };
}

// ---------------------------------------------------------------------------
// Run one scenario
// ---------------------------------------------------------------------------

function runScenario(
  scenario: PetTrialScenario,
  fixtureRoot: string,
  outDir: string,
): AgentTrialReport {
  console.log(`\n=== Scenario: ${scenario.id} ===`);
  console.log(`  Intent: ${scenario.intent}`);
  console.log(`  Expected attempts: ${scenario.expected_attempts}`);

  // Scan fixture
  const observations = scanRepo({ repoRoot: fixtureRoot });
  console.log(`  Scanned: ${observations.meta.file_count} files`);

  const attempts: TrialAttempt[] = [];
  const comparisons: AttemptComparison[] = [];
  const allGaps: ProtocolGap[] = [];

  for (let attemptNum = 1; attemptNum <= scenario.expected_attempts; attemptNum++) {
    const simDiff = scenario.simulated_diffs.find(d => d.attempt === attemptNum);
    if (!simDiff) {
      console.error(`  No simulated diff for attempt ${attemptNum}`);
      break;
    }

    console.log(`  Attempt ${attemptNum}: ${simDiff.description}`);

    // Build contract & scope
    const contract = buildChangeContractLite({
      observations,
      changedFiles: scenario.planned_changed_files as string[],
      intent: scenario.intent,
    });
    const scope = buildAgentScopeLite({ contract, observations });

    // Build task packet
    const packet = buildAgentTaskPacket({
      scenario,
      scope,
      attempt: attemptNum,
      previousFeedbackRef: attemptNum >= 2 ? ".pantheon/agent_feedback.json" : undefined,
    });

    // Write packet
    const attemptDir = join(outDir, scenario.id, `attempt_${attemptNum}`);
    mkdirSync(attemptDir, { recursive: true });
    writeFileSync(join(attemptDir, "agent_task_packet.json"), JSON.stringify(packet, null, 2));
    writeFileSync(join(attemptDir, "agent_task_packet.md"), renderAgentTaskPacketMarkdown(packet));

    // Simulate diff & verify
    const diff: GitDiffSummary = {
      base_ref: "HEAD",
      changed_files: simDiff.changed_files.map(f => ({
        path: f.path,
        status: f.status as "added" | "modified" | "deleted",
      })),
      warnings: [],
    };
    const verification = verifyDiffAgainstScope({ diff, scope });
    const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
    const feedbackValidation = validateAgentFeedback(feedback);

    console.log(`    Verdict: ${verification.verdict}`);
    console.log(`    Violations: ${feedback.violations.length}`);
    console.log(`    Feedback valid: ${feedbackValidation.status}`);

    if (feedbackValidation.status !== "valid") {
      console.error(`    ❌ Feedback validation failed:`, JSON.stringify(feedbackValidation, null, 2));
      process.exit(1);
    }

    // Write feedback
    writeFileSync(join(attemptDir, "agent_feedback.json"), JSON.stringify(feedback, null, 2));

    const attempt: TrialAttempt = {
      attempt_number: attemptNum,
      started_at: new Date().toISOString(),
      actual_diff: {
        changed_files: simDiff.changed_files.map(f => f.path),
        diff_source: "simulated",
      },
      verification_verdict: verification.verdict,
      violation_count: feedback.violations.length,
      violations: feedback.violations.map(v => ({
        kind: v.kind,
        path: v.location.file_path,
        constraint_id: v.constraint.constraint_id,
      })),
      feedback_generated: true,
      feedback_verdict: feedback.verdict,
    };
    attempts.push(attempt);
  }

  // Compare consecutive attempts
  for (let i = 1; i < attempts.length; i++) {
    const cmp = compareAttempts(attempts[i - 1], attempts[i]);
    comparisons.push(cmp);
    const gaps = deriveProtocolGapsFromComparison(cmp);
    allGaps.push(...gaps);

    console.log(`  Comparison ${i} → ${i + 1}: ${cmp.feedback_effect}`);
    console.log(`    Resolved: ${cmp.resolved_violations.length}, New: ${cmp.new_violations.length}, Persisted: ${cmp.persisted_violations.length}`);
  }

  // Derive final judgment
  const lastAttempt = attempts[attempts.length - 1];
  const lastVerdict = lastAttempt.verification_verdict;
  const agentFollowedScope = lastAttempt.violations.every(
    v => v.kind !== "outside_scope_file" && v.kind !== "forbidden_file_modified",
  );

  let agentUsedFeedback: true | false | "unknown" = "unknown";
  let feedbackEffect: FeedbackEffect = "unknown";

  if (comparisons.length > 0) {
    const lastCmp = comparisons[comparisons.length - 1];
    feedbackEffect = lastCmp.feedback_effect;

    if (feedbackEffect === "improved") {
      agentUsedFeedback = true;
    } else if (feedbackEffect === "regressed" || feedbackEffect === "unchanged") {
      agentUsedFeedback = false;
    }
  }

  // Count fixture stats
  const srcCount = observations.observations.path_buckets
    .find(b => b.bucket === "src")?.paths.length ?? 0;
  const testCount = observations.observations.path_buckets
    .find(b => b.bucket === "test")?.paths.length ?? 0;

  const report: AgentTrialReport = {
    schema_version: "agent_trial_report.v1",
    trial_id: randomUUID(),
    generated_at: new Date().toISOString(),

    fixture_context: {
      repo_kind: "controlled_fixture",
      file_count: observations.meta.file_count,
      source_file_count: srcCount,
      test_file_count: testCount,
      known_limitations: [
        "Small controlled repo (~30 files)",
        "Directory boundaries are intentionally explicit",
        "Does not represent large monorepo complexity",
        "Simulated diffs, not real agent output",
      ],
    },

    base_repo_state: {
      head_commit_hash: observations.repo.head_commit_hash,
      has_uncommitted_changes: observations.repo.has_uncommitted_changes,
      observation_hash: observations.meta.observation_hash,
    },

    scenario: {
      id: scenario.id,
      description: scenario.description,
      intent: scenario.intent,
    },

    attempts,
    comparisons,

    final: {
      verdict: lastVerdict,
      agent_followed_scope: agentFollowedScope,
      agent_used_feedback: agentUsedFeedback,
      feedback_effect: feedbackEffect,
      protocol_gaps_observed: allGaps,
      recommended_protocol_changes: allGaps.map(g => g.suggested_change).filter(Boolean) as string[],
    },
  };

  // Write report
  const scenarioDir = join(outDir, scenario.id);
  mkdirSync(scenarioDir, { recursive: true });
  writeFileSync(join(scenarioDir, "trial_report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(scenarioDir, "trial_report.md"), renderAgentTrialReportMarkdown(report));

  console.log(`  Final: ${lastVerdict} | feedback_effect: ${feedbackEffect} | agent_used_feedback: ${agentUsedFeedback}`);
  console.log(`  Report: ${join(scenarioDir, "trial_report.json")}`);

  return report;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { scenarioId, all, outDir, fixtureRoot } = parseArgs();
const resolvedOut = resolve(outDir);
const resolvedFixture = resolve(fixtureRoot);

console.log("P23: Pet Agent Protocol Usability Trial");
console.log(`  Fixture: ${resolvedFixture}`);
console.log(`  Output: ${resolvedOut}`);

const scenarios = all
  ? getAllScenarios()
  : [getScenario(scenarioId!)];

const reports: AgentTrialReport[] = [];
for (const scenario of scenarios) {
  const report = runScenario(scenario, resolvedFixture, resolvedOut);
  reports.push(report);
}

console.log(`\n=== Summary ===`);
for (const r of reports) {
  console.log(`  ${r.scenario.id}: ${r.final.verdict} (feedback_effect: ${r.final.feedback_effect})`);
}
console.log(`  Total scenarios: ${reports.length}`);
console.log(`  Done.`);
