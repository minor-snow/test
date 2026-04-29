/**
 * P23: Pet Trial Scenarios
 *
 * 3 scenarios using test/fixtures/repo_fixture:
 *   1. out-of-scope → retry (2 attempts)
 *   2. missing-test → retry (2 attempts)
 *   3. compliant baseline (1 attempt)
 *
 * Each scenario defines planned files, simulated diffs per attempt,
 * and expected attempt count.
 */

import type { PetTrialScenario, PetTrialScenarioId } from "./types.js";

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const PET_OUT_OF_SCOPE_RETRY: PetTrialScenario = {
  id: "pet_out_of_scope_retry",
  description: "Agent receives a vague prompt and modifies files outside the authorized scope. After receiving feedback, retries with corrected scope.",
  intent: "Fix login validation and improve error messages",
  planned_changed_files: ["src/auth/login.ts"],
  expected_attempts: 2,
  simulated_diffs: [
    {
      attempt: 1,
      description: "Agent modified authorized file plus an unauthorized file (payment/billing.ts)",
      changed_files: [
        { path: "src/auth/login.ts", status: "modified" },
        { path: "src/payment/billing.ts", status: "modified" },
      ],
    },
    {
      attempt: 2,
      description: "After feedback, agent reverted out-of-scope file and stayed within scope",
      changed_files: [
        { path: "src/auth/login.ts", status: "modified" },
      ],
    },
  ],
};

const PET_MISSING_TEST_RETRY: PetTrialScenario = {
  id: "pet_missing_test_retry",
  description: "Agent modifies an unmapped source file. After receiving review feedback, retries by limiting changes to the authorized file.",
  intent: "Refactor sync worker for reliability",
  planned_changed_files: ["src/sync/worker.ts"],
  expected_attempts: 2,
  simulated_diffs: [
    {
      attempt: 1,
      description: "Agent modified unmapped source — triggers review for missing test mapping",
      changed_files: [
        { path: "src/sync/worker.ts", status: "modified" },
        { path: "src/sync/queue.ts", status: "modified" },
      ],
    },
    {
      attempt: 2,
      description: "After feedback, agent limited changes to planned file only",
      changed_files: [
        { path: "src/sync/worker.ts", status: "modified" },
      ],
    },
  ],
};

const PET_COMPLIANT_BASELINE: PetTrialScenario = {
  id: "pet_compliant_baseline",
  description: "Agent performs a clean change within authorized scope with existing test coverage.",
  intent: "Fix currency formatting edge case",
  planned_changed_files: ["src/utils/format.ts", "tests/utils/format.test.ts"],
  expected_attempts: 1,
  simulated_diffs: [
    {
      attempt: 1,
      description: "Agent modified source and its test — fully compliant",
      changed_files: [
        { path: "src/utils/format.ts", status: "modified" },
        { path: "tests/utils/format.test.ts", status: "modified" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const ALL_SCENARIOS: readonly PetTrialScenario[] = [
  PET_OUT_OF_SCOPE_RETRY,
  PET_MISSING_TEST_RETRY,
  PET_COMPLIANT_BASELINE,
];

export function getScenario(id: PetTrialScenarioId): PetTrialScenario {
  const scenario = ALL_SCENARIOS.find(s => s.id === id);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}`);
  }
  return scenario;
}

export function getAllScenarios(): readonly PetTrialScenario[] {
  return ALL_SCENARIOS;
}
