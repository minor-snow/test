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
export declare function getScenario(id: PetTrialScenarioId): PetTrialScenario;
export declare function getAllScenarios(): readonly PetTrialScenario[];
